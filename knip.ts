import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/server/server.ts',
    'src/cli/cli.ts',
    'src/electron-main/main.ts',
    'src/preload/preload.ts',
    'src/server/dev-preload.ts',
  ],
  project: ['src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'],
  rules: {
    devDependencies: 'off',
    duplicates: 'off',
    exports: 'off',
    types: 'off',
  },
  ignore: ['**/*/lingui.config.ts'],
  ignoreFiles: [
    'src/ui/analyses/analysis-logs.tsx',
    'src/ui/analyses/no-analysis.tsx',
    'src/ui/analyses/use-selected-analysis-demo-id.ts',
    'src/ui/left-bar/pending-analyses-badge.tsx',
    'src/node/database/matches/generate-match-pistol-round-positions.ts',
    'src/node/database/team-tactics/aggregate-map-points.ts',
    'src/node/database/team-tactics/aggregate-weighted-map-points.ts',
    'src/node/database/team-tactics/apply-team-tactics-radar-level-filter.ts',
    'src/node/database/team-tactics/build-ct-heatmap-points.ts',
    'src/node/database/team-tactics/get-grid-size.ts',
    'src/node/database/team-tactics/pistol-round-numbers.ts',
    'src/ui/analyses/action-bar/action-bar.tsx',
    'src/ui/analyses/action-bar/remove-all-analyses-button.tsx',
    'src/ui/analyses/action-bar/remove-analyses-succeed-button.tsx',
    'src/ui/analyses/table/analyses-table.tsx',
    'src/ui/analyses/table/status-cell.tsx',
    'src/ui/analyses/table/use-analyses-columns.ts',
    'src/ui/analyses/table/context-menu/analyses-context-menu.tsx',
    'src/ui/analyses/table/context-menu/remove-demo-from-analyses-item.tsx',
    'src/ui/analyses/table/context-menu/see-demo-item.tsx',
    'src/ui/analyses/table/context-menu/see-match-item.tsx',
  ],
  ignoreDependencies: ['@lingui/core'],
};

export default config;
