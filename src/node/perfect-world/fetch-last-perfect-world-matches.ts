import type { PerfectWorldMatch } from 'csdm/common/types/perfect-world-match';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import { getSettings } from 'csdm/node/settings/get-settings';
import { fetchPerfectWorldAccount } from 'csdm/node/database/perfect-world-account/fetch-perfect-world-account';
import { fetchPerfectWorldMatchHistoryPage, type PerfectWorldAuth } from './perfect-world-api';
import { createPerfectWorldMatchSeed } from './perfect-world-match-mappers';
import { getDownloadStatus } from 'csdm/node/download/get-download-status';
import { validatePerfectWorldAccount } from './validate-perfect-world-account';

type Options = {
  page?: number;
  pageSize?: number;
  toSteamId?: string;
};

export async function fetchPerfectWorldMatchHistoryMatches({
  auth,
  toSteamId,
  page = 1,
  pageSize = 20,
  downloadFolderPath,
}: {
  auth: PerfectWorldAuth;
  toSteamId: string;
  page?: number;
  pageSize?: number;
  downloadFolderPath?: string;
}): Promise<PerfectWorldMatch[]> {
  const rawMatches = await fetchPerfectWorldMatchHistoryPage({
    auth,
    toSteamId,
    page,
    pageSize,
  });

  return Promise.all(
    rawMatches.map(async (rawMatch) => {
      const seed = createPerfectWorldMatchSeed(rawMatch, String(rawMatch.matchId ?? ''));

      return {
        ...seed,
        downloadStatus: await getDownloadStatus(downloadFolderPath, seed.id, seed.demoUrl),
      };
    }),
  );
}

export async function fetchLastPerfectWorldMatches(accountId: string, options?: Options) {
  const account = await fetchPerfectWorldAccount(accountId);
  if (account === undefined) {
    throw PerfectWorldErrorCode.AccountMissing;
  }
  const validatedAccount = await validatePerfectWorldAccount(account);

  const settings = await getSettings();

  return fetchPerfectWorldMatchHistoryMatches({
    auth: {
      token: validatedAccount.token,
      mySteamId: validatedAccount.steamId,
      userId: validatedAccount.userId,
    },
    toSteamId: options?.toSteamId ?? validatedAccount.steamId,
    page: options?.page,
    pageSize: options?.pageSize,
    downloadFolderPath: settings.download.folderPath,
  });
}
