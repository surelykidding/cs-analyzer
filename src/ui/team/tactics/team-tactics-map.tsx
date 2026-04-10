import React, { useRef, type ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import type { Game } from 'csdm/common/types/counter-strike';
import type { Map } from 'csdm/common/types/map';
import type { WeightedMapPoint } from 'csdm/common/types/team-tactics';
import { Message } from 'csdm/ui/components/message';
import { UnsupportedMap } from 'csdm/ui/components/unsupported-map';
import { useMapCanvas } from 'csdm/ui/hooks/use-map-canvas';
import { getScaledCoordinateX } from 'csdm/ui/maps/get-scaled-coordinate-x';
import { getScaledCoordinateY } from 'csdm/ui/maps/get-scaled-coordinate-y';
import { RadarLevel } from 'csdm/ui/maps/radar-level';
import { useMaps } from 'csdm/ui/maps/use-maps';
import { HeatmapRenderer, type HeatmapPoint } from 'csdm/ui/shared/heatmap-renderer';

type TeamTacticsMapVariant = 'heatmap' | 'bubble' | 'marker';
type TeamTacticsHeatmapStyle = 'default' | 'event';

type TeamTacticsMapCanvasProps = {
  game: Game;
  map: Map;
  points: WeightedMapPoint[];
  radarLevel: RadarLevel;
  heatmapStyle: TeamTacticsHeatmapStyle;
  variant: TeamTacticsMapVariant;
};

function drawBubblePoints(
  context: CanvasRenderingContext2D,
  points: WeightedMapPoint[],
  map: Map,
  zoomedX: (x: number) => number,
  zoomedY: (y: number) => number,
  zoomedSize: (size: number) => number,
  style: { fill: string; stroke: string },
) {
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (const point of points) {
    const x = zoomedX(getScaledCoordinateX(map, map.radarSize, point.x));
    const y = zoomedY(getScaledCoordinateY(map, map.radarSize, point.y));
    const radius = zoomedSize(Math.max(10, Math.min(28, 10 + Math.log2(point.count + 1) * 4)));

    context.beginPath();
    context.fillStyle = style.fill;
    context.strokeStyle = style.stroke;
    context.lineWidth = zoomedSize(2);
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fill();
    context.stroke();

    context.font = `${zoomedSize(10)}px Inter var`;
    context.fillStyle = '#ffffff';
    context.fillText(String(point.count), x, y);
  }
}

function drawMarkerPoints(
  context: CanvasRenderingContext2D,
  points: WeightedMapPoint[],
  map: Map,
  zoomedX: (x: number) => number,
  zoomedY: (y: number) => number,
  zoomedSize: (size: number) => number,
) {
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  for (const point of points) {
    const x = zoomedX(getScaledCoordinateX(map, map.radarSize, point.x));
    const y = zoomedY(getScaledCoordinateY(map, map.radarSize, point.y));
    const radius = zoomedSize(Math.max(12, Math.min(32, 12 + Math.log2(point.count + 1) * 4)));

    context.beginPath();
    context.fillStyle = 'rgba(185, 28, 28, 0.65)';
    context.strokeStyle = '#ffffff';
    context.lineWidth = zoomedSize(2);
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fill();
    context.stroke();

    if (point.count > 1) {
      context.font = `${zoomedSize(10)}px Inter var`;
      context.fillStyle = '#ffffff';
      context.fillText(`x${point.count}`, x + zoomedSize(20), y);
    }
  }
}

function TeamTacticsMapCanvas({ game, map, points, radarLevel, heatmapStyle, variant }: TeamTacticsMapCanvasProps) {
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapRendererRef = useRef<HeatmapRenderer | null>(null);
  const { setCanvas, interactiveCanvas } = useMapCanvas({
    map,
    game,
    mode: radarLevel === RadarLevel.Upper ? 'upper' : 'lower',
    draw: (interactiveCanvas, context) => {
      if (variant === 'heatmap') {
        const heatmapCanvas = heatmapCanvasRef.current;
        if (!heatmapCanvas) {
          return;
        }

        if (!heatmapRendererRef.current) {
          heatmapCanvas.width = interactiveCanvas.canvasSize.width;
          heatmapCanvas.height = interactiveCanvas.canvasSize.height;
          heatmapRendererRef.current = new HeatmapRenderer(heatmapCanvas);
        }

        const scaledPoints: HeatmapPoint[] = points.map((point) => {
          const x = interactiveCanvas.zoomedX(getScaledCoordinateX(map, map.radarSize, point.x));
          const y = interactiveCanvas.zoomedY(getScaledCoordinateY(map, map.radarSize, point.y));
          return [x, y, point.count];
        });

        const renderer = heatmapRendererRef.current;
        renderer.setAlpha(1);
        renderer.setMinOpacity(heatmapStyle === 'event' ? 0.12 : 0.05);
        renderer.setRadius(interactiveCanvas.zoomedSize(heatmapStyle === 'event' ? 24 : 18), heatmapStyle === 'event' ? 20 : 16);
        renderer.setPoints(scaledPoints);
        renderer.draw();
        context.drawImage(heatmapCanvas, 0, 0);
        return;
      }

      if (variant === 'bubble') {
        drawBubblePoints(
          context,
          points,
          map,
          interactiveCanvas.zoomedX,
          interactiveCanvas.zoomedY,
          interactiveCanvas.zoomedSize,
          {
            fill: 'rgba(37, 99, 235, 0.45)',
            stroke: '#93c5fd',
          },
        );
        return;
      }

      drawMarkerPoints(
        context,
        points,
        map,
        interactiveCanvas.zoomedX,
        interactiveCanvas.zoomedY,
        interactiveCanvas.zoomedSize,
      );
    },
  });
  const { setWrapper, canvasSize } = interactiveCanvas;

  return (
    <div ref={setWrapper} className="relative flex h-[480px] w-full overflow-hidden rounded-8 border border-gray-300">
      <canvas ref={setCanvas} width={canvasSize.width} height={canvasSize.height} />
      <canvas ref={heatmapCanvasRef} className="hidden" />
    </div>
  );
}

type Props = {
  title: ReactNode;
  game: Game;
  mapName: string;
  radarLevel: RadarLevel;
  points: WeightedMapPoint[];
  variant: TeamTacticsMapVariant;
  heatmapStyle?: TeamTacticsHeatmapStyle;
  emptyMessage: ReactNode;
};

export function TeamTacticsMap({
  title,
  game,
  mapName,
  radarLevel,
  points,
  variant,
  heatmapStyle = 'default',
  emptyMessage,
}: Props) {
  const maps = useMaps();
  const map = maps.find((map) => map.name === mapName && map.game === game);
  const pointCountLabel =
    variant === 'heatmap' ? <Trans>{points.length} samples</Trans> : variant === 'marker' ? <Trans>{points.length} points</Trans> : <Trans>{points.length} cells</Trans>;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-y-12 rounded-8 border border-gray-300 bg-gray-50 p-12">
      <div className="flex items-center justify-between gap-x-12">
        <h3 className="text-body-strong">{title}</h3>
        <span className="text-caption text-gray-800">{pointCountLabel}</span>
      </div>
      {mapName === '' ? (
        <Message message={<Trans>Select a map.</Trans>} />
      ) : map === undefined || map.radarFilePath === undefined ? (
        <UnsupportedMap />
      ) : points.length === 0 ? (
        <Message message={emptyMessage} />
      ) : (
        <TeamTacticsMapCanvas
          game={game}
          map={map}
          points={points}
          radarLevel={radarLevel}
          heatmapStyle={heatmapStyle}
          variant={variant}
        />
      )}
    </section>
  );
}
