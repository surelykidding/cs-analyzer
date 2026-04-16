import { readdir, readFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { request } from 'undici';
import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import { fetchPerfectWorldMatchHistoryPage, fetchPerfectWorldSelfProfile } from './perfect-world-api';
import { createPerfectWorldMatchSeed } from './perfect-world-match-mappers';

const PERFECT_WORLD_CLIENT_LOGIN_URL = 'http://127.0.0.1:55555/';
const PERFECT_WORLD_CLIENT_LOGIN_ORIGIN = 'https://match.wmpvp.com';
const PERFECT_WORLD_CLIENT_LOGIN_REFERER = 'https://match.wmpvp.com/';
const MAX_LOG_FILES_TO_SCAN = 6;

type JsonRecord = Record<string, unknown>;

type PerfectWorldClientBridgeSession = {
  token: string;
  steamId: string;
  nickname: string;
  avatarUrl: string;
  userId?: number;
  jt?: string;
  maskedPhoneNumber?: string;
};

type PerfectWorldClientLogContext = {
  userId?: number;
  jt?: string;
  nickname?: string;
  avatarUrl?: string;
  maskedPhoneNumber?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNonEmptyString(value: unknown) {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function toInteger(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  return undefined;
}

function extractJsonAfterIndex(line: string, startIndex: number) {
  const jsonStartIndex = line.indexOf('{', startIndex);
  if (jsonStartIndex === -1) {
    return undefined;
  }

  try {
    return JSON.parse(line.slice(jsonStartIndex).trim()) as JsonRecord;
  } catch {
    return undefined;
  }
}

function extractJsonAfterMarker(line: string, marker: string) {
  const markerIndex = line.lastIndexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }

  return extractJsonAfterIndex(line, markerIndex + marker.length);
}

function getPerfectWorldClientRoamingPath(...segments: string[]) {
  const appDataPath = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');

  return path.join(appDataPath, ...segments);
}

function maskPhoneNumber(phoneNumber: string | null | undefined) {
  if (phoneNumber === null || phoneNumber === undefined) {
    return undefined;
  }

  const sanitizedPhoneNumber = phoneNumber.replace(/\s+/g, '');
  if (sanitizedPhoneNumber === '') {
    return undefined;
  }

  if (sanitizedPhoneNumber.includes('*') || sanitizedPhoneNumber.length < 7) {
    return sanitizedPhoneNumber;
  }

  return `${sanitizedPhoneNumber.slice(0, 3)}****${sanitizedPhoneNumber.slice(-4)}`;
}

function mergePerfectWorldClientContexts(...contexts: PerfectWorldClientLogContext[]): PerfectWorldClientLogContext {
  const mergedContext: PerfectWorldClientLogContext = {};

  for (const context of contexts) {
    mergedContext.userId ??= context.userId;
    mergedContext.jt ??= context.jt;
    mergedContext.nickname ??= context.nickname;
    mergedContext.avatarUrl ??= context.avatarUrl;
    mergedContext.maskedPhoneNumber ??= context.maskedPhoneNumber;
  }

  return mergedContext;
}

export function decodePerfectWorldClientEncodedString(value: string) {
  const startIndex = value.indexOf('^');
  const endIndex = value.lastIndexOf('$');
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return value;
  }

  const encodedHex = value.slice(startIndex + 1, endIndex);
  if (encodedHex.length % 2 !== 0) {
    return value;
  }

  const buffer = Buffer.alloc(encodedHex.length / 2);
  for (let index = 0; index < buffer.length; index++) {
    buffer[index] = Number(`0x${encodedHex.slice(index * 2, index * 2 + 2)}`) ^ ((42 + index * 3) % 255);
  }

  return `${value.slice(0, startIndex)}${buffer.toString()}`;
}

export function decodePerfectWorldClientBridgeToken(encodedToken: string) {
  const decodedToken = decodePerfectWorldClientEncodedString(encodedToken);
  const lastSeparatorIndex = decodedToken.lastIndexOf('_');
  const steamId = decodedToken.slice(lastSeparatorIndex + 1);
  const remainingValue = decodedToken.slice(0, lastSeparatorIndex);
  const timestampSeparatorIndex = remainingValue.lastIndexOf('_');
  const token = remainingValue.slice(0, timestampSeparatorIndex);

  if (token === '' || !/^\d+$/.test(steamId)) {
    throw new Error('The Perfect World client returned an invalid session token.');
  }

  return {
    token,
    steamId,
  };
}

export function extractPerfectWorldClientAccountContextFromLogText(
  logText: string,
  session: Pick<PerfectWorldClientBridgeSession, 'token' | 'steamId'>,
): PerfectWorldClientLogContext {
  const context: PerfectWorldClientLogContext = {};
  const lines = logText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = decodePerfectWorldClientEncodedString(rawLine);

    if (line.includes('queryUserDetailsByToken') && line.includes(session.token)) {
      const payload = extractJsonAfterIndex(line, line.indexOf(session.token) + session.token.length);
      const user = isRecord(payload?.data) && isRecord(payload.data.user) ? payload.data.user : undefined;
      if (user !== undefined && toNonEmptyString(user.steam_id) === session.steamId) {
        context.userId ??= toInteger(user.zq_id);
        const jt = toNonEmptyString(user.jt);
        if (jt !== undefined) {
          context.jt ??= jt;
        }
        context.nickname ??= toNonEmptyString(user.nickname);
        context.avatarUrl ??= toNonEmptyString(user.avatar);
      }
    }

    if (line.includes('USER_GET_BINDING_INFO_REQ') && line.includes(session.token)) {
      const payload = extractJsonAfterMarker(line, 'RES:');
      const bindingInfo =
        isRecord(payload?.data) && isRecord(payload.data.binding_info) ? payload.data.binding_info : undefined;
      if (bindingInfo !== undefined) {
        context.userId ??= toInteger(bindingInfo.userId);
        const maskedPhoneNumber = toNonEmptyString(bindingInfo.mobilePhone);
        if (maskedPhoneNumber !== undefined) {
          context.maskedPhoneNumber ??= maskedPhoneNumber;
        }
      }
    }

    if (line.includes('query local steam info res:')) {
      const payload = extractJsonAfterMarker(line, 'query local steam info res:');
      const users = isRecord(payload?.data) && Array.isArray(payload.data.users) ? payload.data.users : [];
      const currentUser = users.find((user) => {
        return isRecord(user) && toNonEmptyString(user.steam_id) === session.steamId;
      });
      if (isRecord(currentUser)) {
        context.userId ??= toInteger(currentUser.zq_id);
        context.nickname ??= toNonEmptyString(currentUser.nickname);
        context.avatarUrl ??= toNonEmptyString(currentUser.avatar);
      }
    }

    if (context.userId !== undefined && context.jt !== undefined && context.maskedPhoneNumber !== undefined) {
      break;
    }
  }

  return context;
}

async function fetchPerfectWorldClientBridgeSession(): Promise<PerfectWorldClientBridgeSession> {
  let statusCode = 0;
  let responseBodyText = '';

  try {
    const response = await request(PERFECT_WORLD_CLIENT_LOGIN_URL, {
      method: 'GET',
      headers: {
        Origin: PERFECT_WORLD_CLIENT_LOGIN_ORIGIN,
        Referer: PERFECT_WORLD_CLIENT_LOGIN_REFERER,
      },
    });
    statusCode = response.statusCode;
    responseBodyText = response.body ? await response.body.text() : '';
  } catch {
    throw new Error('Perfect World client local login bridge is unavailable. Open the Perfect World client and log in first.');
  }

  if (statusCode === 201) {
    throw new Error('Perfect World client is running but no platform account is currently logged in.');
  }

  if (statusCode < 200 || statusCode >= 300) {
    const bridgeErrorMessage =
      responseBodyText.trim() === '' ? '' : ` ${responseBodyText.trim().slice(0, 200)}`;
    throw new Error(`Perfect World client session import failed with status ${statusCode}.${bridgeErrorMessage}`);
  }

  let payload: unknown;
  try {
    payload = responseBodyText === '' ? undefined : JSON.parse(responseBodyText);
  } catch {
    throw new Error('Perfect World client local bridge returned an invalid JSON response.');
  }

  if (!isRecord(payload)) {
    throw new Error('Perfect World client local bridge returned an invalid response.');
  }

  const encodedToken = toNonEmptyString(payload.token);
  if (encodedToken === undefined) {
    throw new Error('Perfect World client local bridge did not return a usable token.');
  }

  const { token, steamId } = decodePerfectWorldClientBridgeToken(encodedToken);

  return {
    token,
    steamId,
    nickname: toNonEmptyString(payload.nickname) ?? '',
    avatarUrl: toNonEmptyString(payload.avatar) ?? '',
    userId:
      toInteger(payload.userId) ??
      toInteger(payload.uid) ??
      toInteger(payload.zqId) ??
      toInteger(payload.zqid),
    jt: toNonEmptyString(payload.jt),
    maskedPhoneNumber: maskPhoneNumber(
      toNonEmptyString(payload.mobilePhone) ??
        toNonEmptyString(payload.maskedPhoneNumber) ??
        toNonEmptyString(payload.phone),
    ),
  };
}

async function readPerfectWorldClientLogContext(session: Pick<PerfectWorldClientBridgeSession, 'token' | 'steamId'>) {
  const logDirectoryPath = getPerfectWorldClientRoamingPath('Wmpvp', 'Log');
  const directoryEntries = await readdir(logDirectoryPath, {
    withFileTypes: true,
  });
  const logFileNames = directoryEntries
    .filter((entry) => {
      return entry.isFile() && /^pvpClient\.\d{4}-\d{2}-\d{2}\.log$/i.test(entry.name);
    })
    .map((entry) => entry.name)
    .sort((fileNameA, fileNameB) => fileNameB.localeCompare(fileNameA))
    .slice(0, MAX_LOG_FILES_TO_SCAN);

  const context: PerfectWorldClientLogContext = {};
  for (const logFileName of logFileNames) {
    const logText = await readFile(path.join(logDirectoryPath, logFileName), 'utf8');
    const partialContext = extractPerfectWorldClientAccountContextFromLogText(logText, session);

    context.userId ??= partialContext.userId;
    context.jt ??= partialContext.jt;
    context.nickname ??= partialContext.nickname;
    context.avatarUrl ??= partialContext.avatarUrl;
    context.maskedPhoneNumber ??= partialContext.maskedPhoneNumber;

    if (context.userId !== undefined && context.jt !== undefined && context.maskedPhoneNumber !== undefined) {
      break;
    }
  }

  return context;
}

async function readPerfectWorldClientApiContext(
  session: Pick<PerfectWorldClientBridgeSession, 'token' | 'steamId'>,
): Promise<PerfectWorldClientLogContext> {
  const context: PerfectWorldClientLogContext = {};

  try {
    const profile = await fetchPerfectWorldSelfProfile({
      token: session.token,
      mySteamId: session.steamId,
      userId: 0,
    });
    context.nickname = profile.nickname;
    context.avatarUrl = profile.avatarUrl;
  } catch (error) {
    logger.warn('Failed to hydrate Perfect World profile while importing the desktop client session.');
    logger.warn(error);
  }

  try {
    const rawMatches = await fetchPerfectWorldMatchHistoryPage({
      auth: {
        token: session.token,
        mySteamId: session.steamId,
        userId: 0,
      },
      toSteamId: session.steamId,
      page: 1,
      pageSize: 20,
    });

    for (const rawMatch of rawMatches) {
      const seed = createPerfectWorldMatchSeed(rawMatch, String((rawMatch.matchId ?? rawMatch.match_id ?? '') as string));
      const currentPlayer = seed.players.find((player) => {
        return player.steamId === session.steamId;
      });
      if (currentPlayer === undefined) {
        continue;
      }

      if (currentPlayer.userId !== null) {
        context.userId ??= currentPlayer.userId;
      }
      context.nickname ??= currentPlayer.name;
      context.avatarUrl ??= currentPlayer.avatarUrl;

      if (context.userId !== undefined && context.nickname !== undefined && context.avatarUrl !== undefined) {
        break;
      }
    }
  } catch (error) {
    logger.warn('Failed to recover Perfect World user details from match history while importing the desktop client session.');
    logger.warn(error);
  }

  return context;
}

export async function importPerfectWorldClientAccount(): Promise<Omit<PerfectWorldAccount, 'isCurrent'>> {
  const bridgeSession = await fetchPerfectWorldClientBridgeSession();
  const bridgeContext: PerfectWorldClientLogContext = {
    userId: bridgeSession.userId,
    jt: bridgeSession.jt,
    nickname: bridgeSession.nickname === '' ? undefined : bridgeSession.nickname,
    avatarUrl: bridgeSession.avatarUrl === '' ? undefined : bridgeSession.avatarUrl,
    maskedPhoneNumber: bridgeSession.maskedPhoneNumber,
  };
  let logContext: PerfectWorldClientLogContext = {};
  try {
    logContext = await readPerfectWorldClientLogContext(bridgeSession);
  } catch (error) {
    logger.warn('Failed to read Perfect World desktop client logs while importing the current session.');
    logger.warn(error);
  }

  let apiContext: PerfectWorldClientLogContext = {};
  const mergedLocalContext = mergePerfectWorldClientContexts(bridgeContext, logContext);
  if (
    mergedLocalContext.userId === undefined ||
    mergedLocalContext.nickname === undefined ||
    mergedLocalContext.avatarUrl === undefined
  ) {
    apiContext = await readPerfectWorldClientApiContext(bridgeSession);
  }

  const context = mergePerfectWorldClientContexts(bridgeContext, logContext, apiContext);
  const userId = context.userId;

  if (userId === undefined) {
    throw new Error(
      'A Perfect World client session was found, but the user ID could not be recovered from the local client or recent match history.',
    );
  }

  return {
    id: String(userId),
    userId,
    steamId: bridgeSession.steamId,
    token: bridgeSession.token,
    jt: context.jt ?? null,
    nickname: context.nickname ?? `PW${bridgeSession.steamId.slice(-6)}`,
    avatarUrl: context.avatarUrl ?? '',
    maskedPhoneNumber: context.maskedPhoneNumber ?? null,
    isValid: true,
    lastValidatedAt: new Date().toISOString(),
    lastError: null,
  };
}
