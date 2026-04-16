import { createAction } from '@reduxjs/toolkit';
import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import type { ErrorCode } from 'csdm/common/error-code';
import type { PerfectWorldMatch } from 'csdm/common/types/perfect-world-match';

export const fetchLastMatchesStart = createAction('downloads/perfect-world/fetchLastMatchesStart');
export const fetchLastMatchesSuccess = createAction<{ matches: PerfectWorldMatch[] }>(
  'downloads/perfect-world/fetchLastMatchesSuccess',
);
export const fetchLastMatchesError = createAction<{ errorCode: ErrorCode }>(
  'downloads/perfect-world/fetchLastMatchesError',
);
export const accountAdded = createAction<{ account: PerfectWorldAccount }>('downloads/perfect-world/accountAdded');
export const accountsUpdated = createAction<{ accounts: PerfectWorldAccount[] }>('downloads/perfect-world/accountsUpdated');
export const matchSelected = createAction<{ matchId: string }>('downloads/perfect-world/matchSelected');
