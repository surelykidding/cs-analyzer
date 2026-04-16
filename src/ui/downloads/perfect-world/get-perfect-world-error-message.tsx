import React, { type ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { PerfectWorldErrorCode, isPerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';

export function getPerfectWorldErrorMessage(error: unknown): ReactNode | undefined {
  if (!isPerfectWorldErrorCode(error)) {
    return undefined;
  }

  switch (error) {
    case PerfectWorldErrorCode.AccountMissing:
      return <Trans>Add a Perfect World account before using Perfect World downloads or scouting.</Trans>;
    case PerfectWorldErrorCode.AccountExpired:
      return (
        <Trans>
          The saved Perfect World session has expired. Re-import it from the client or sign in again to continue.
        </Trans>
      );
    case PerfectWorldErrorCode.ParticipantSteamIdRequired:
      return (
        <Trans>
          This match needs a participant Steam ID to resolve the live room. Enter a player Steam ID from the ongoing
          match and try again.
        </Trans>
      );
    case PerfectWorldErrorCode.ParticipantSteamIdNotInRoom:
      return <Trans>The provided participant Steam ID is not part of this match room.</Trans>;
    default:
      return undefined;
  }
}
