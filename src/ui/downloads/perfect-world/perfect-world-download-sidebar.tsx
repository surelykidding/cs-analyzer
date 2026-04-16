import React from 'react';
import { useDispatch } from '../../store/use-dispatch';
import { MatchEntry } from '../sidebar/match-entry';
import { MatchResult } from '../match-result';
import { usePerfectWorldState } from './use-perfect-world-state';
import { useCurrentPerfectWorldAccount } from './use-current-perfect-world-account';
import { matchSelected } from './perfect-world-actions';

function getMatchResult(currentSteamId: string | undefined, match: ReturnType<typeof usePerfectWorldState>['matches'][number]) {
  if (currentSteamId === undefined) {
    return MatchResult.Unplayed;
  }

  const currentPlayer = match.players.find((player) => player.steamId === currentSteamId);
  if (currentPlayer?.hasWon === true) {
    return MatchResult.Victory;
  }

  if (currentPlayer?.hasWon === false) {
    return MatchResult.Defeat;
  }

  return MatchResult.Unplayed;
}

export function PerfectWorldDownloadSidebar() {
  const { matches, selectedMatchId } = usePerfectWorldState();
  const currentAccount = useCurrentPerfectWorldAccount();
  const dispatch = useDispatch();

  return (
    <div className="min-w-fit overflow-auto border-r border-r-gray-300">
      {matches.map((match) => {
        return (
          <MatchEntry
            key={match.id}
            date={match.date}
            game={match.game}
            duration={match.durationInSeconds}
            isSelected={match.id === selectedMatchId}
            mapName={match.mapName}
            scoreOnTheLeft={match.teams[0]?.score ?? 0}
            scoreOnTheRight={match.teams[1]?.score ?? 0}
            selectMatch={() => {
              dispatch(matchSelected({ matchId: match.id }));
            }}
            result={getMatchResult(currentAccount?.steamId, match)}
            downloadStatus={match.downloadStatus}
          />
        );
      })}
    </div>
  );
}
