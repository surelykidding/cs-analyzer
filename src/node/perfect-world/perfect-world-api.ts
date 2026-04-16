import { createHash } from 'node:crypto';
import { WebSocket } from 'ws';
import { buildPerfectWorldMatchId, normalizePerfectWorldComparableMatchId } from './extract-perfect-world-match-id';

const PERFECT_WORLD_APP_VERSION = '3.5.4.172';
const PERFECT_WORLD_LOGIN_APP_ID = 2;
const PERFECT_WORLD_PLATFORM = 'android';
const PERFECT_WORLD_REFERER = 'https://client.wmpvp.com';
const PERFECT_WORLD_API_URL = 'https://api.wmpvp.com';
const PERFECT_WORLD_PASSPORT_API_URL = 'https://passport.pwesports.cn';
const PERFECT_WORLD_EXPORTS_API_URL = 'https://esports.wanmei.com';
const PERFECT_WORLD_CSGO_MODE_API_URL = 'https://gwapi.pwesports.cn';
const PERFECT_WORLD_APP_ACTIVITY_API_URL = 'https://appactivity.wmpvp.com';
const PERFECT_WORLD_LIVE_MATCH_PLATFORM = '2';
const PERFECT_WORLD_LIVE_MATCH_SECURITY_KEY = 'b2K%$5k*o^j!@Qp';
const PERFECT_WORLD_LIVE_MATCH_TIMEOUT_MS = 12_000;

export type PerfectWorldAuth = {
  token: string;
  mySteamId: string;
  userId: number;
};

type JsonRecord = Record<string, unknown>;

type PerfectWorldSignedRequestContext = {
  jt: string;
  sign: (options: { path: string; body: string; random: string; timestampSeconds: number }) => Promise<string> | string;
};

type PerfectWorldLoginResponse = {
  code: number;
  description: string;
  result?: {
    loginResult?: {
      accountInfo?: {
        mobilePhone?: string;
        steamId?: number | string;
        token?: string;
        userId?: number;
      };
    };
  };
};

type PerfectWorldDetailStatsResponse = {
  statusCode: number;
  errorMessage: string;
  data?: {
    avatar?: string;
    name?: string;
    steamId?: string | number;
  };
};

type PerfectWorldMatchListResponse = {
  statusCode: number;
  errorMessage: string;
  data?: {
    matchList?: JsonRecord[];
  };
};

type PerfectWorldLiveWebsocketInfoResponse = {
  code: number;
  message: string;
  result?: {
    websocketUrl?: string;
  };
};

export class PerfectWorldSessionValidationError extends Error {}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getErrorMessage(value: unknown, fallbackMessage: string) {
  if (isRecord(value)) {
    const errorMessage = value.errorMessage;
    if (typeof errorMessage === 'string' && errorMessage !== '') {
      return errorMessage;
    }

    const description = value.description;
    if (typeof description === 'string' && description !== '') {
      return description;
    }

    const message = value.message;
    if (typeof message === 'string' && message !== '') {
      return message;
    }

    const msg = value.msg;
    if (typeof msg === 'string' && msg !== '') {
      return msg;
    }
  }

  return fallbackMessage;
}

async function fetchJson<TResponse>(url: string, init: RequestInit, defaultErrorMessage: string): Promise<TResponse> {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload: unknown = undefined;

  try {
    payload = text === '' ? undefined : JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(defaultErrorMessage);
    }

    throw new Error(`${defaultErrorMessage} Invalid JSON response.`);
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, defaultErrorMessage));
  }

  return payload as TResponse;
}

function buildJsonHeaders(token?: string) {
  return {
    'Content-Type': 'application/json',
    appversion: PERFECT_WORLD_APP_VERSION,
    platform: PERFECT_WORLD_PLATFORM,
    Referer: PERFECT_WORLD_REFERER,
    ...(token ? { token } : {}),
  };
}

export function buildPerfectWorldDemoUrl(matchId: string, cupId: string | null) {
  const normalizedMatchId = normalizePerfectWorldComparableMatchId(matchId);

  return `https://pwaweblogin.wmpvp.com/csgo/demo/${normalizedMatchId}_${cupId ?? '0'}.dem`;
}

export async function loginPerfectWorld({
  mobilePhone,
  securityCode,
}: {
  mobilePhone: string;
  securityCode: string;
}) {
  const response = await fetchJson<PerfectWorldLoginResponse>(
    `${PERFECT_WORLD_PASSPORT_API_URL}/account/login`,
    {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({
        appId: PERFECT_WORLD_LOGIN_APP_ID,
        mobilePhone,
        securityCode,
      }),
    },
    'Perfect World login failed.',
  );

  const accountInfo = response.result?.loginResult?.accountInfo;
  if (response.code !== 0 || accountInfo === undefined) {
    throw new Error(getErrorMessage(response, 'Perfect World login failed.'));
  }

  const steamId = accountInfo.steamId ? String(accountInfo.steamId) : '';
  const token = accountInfo.token ?? '';
  const userId = accountInfo.userId ?? 0;
  if (steamId === '' || token === '' || userId === 0) {
    throw new Error('Perfect World login did not return a valid token, steam ID, and user ID.');
  }

  return {
    userId,
    steamId,
    token,
    mobilePhone: accountInfo.mobilePhone ?? null,
  };
}

export async function fetchPerfectWorldSelfProfile(auth: PerfectWorldAuth) {
  const defaultErrorMessage = 'Failed to fetch Perfect World profile.';
  let response: Response;

  try {
    response = await fetch(`${PERFECT_WORLD_API_URL}/api/csgo/home/pvp/detailStats`, {
      method: 'POST',
      headers: buildJsonHeaders(auth.token),
      body: JSON.stringify({
        mySteamId: auth.mySteamId,
        toSteamId: auth.mySteamId,
      }),
    });
  } catch (error) {
    throw error;
  }

  const text = await response.text();
  let payload: unknown = undefined;

  try {
    payload = text === '' ? undefined : JSON.parse(text);
  } catch {
    if (response.status === 401 || response.status === 403) {
      throw new PerfectWorldSessionValidationError(defaultErrorMessage);
    }

    if (!response.ok) {
      throw new Error(defaultErrorMessage);
    }

    throw new Error(`${defaultErrorMessage} Invalid JSON response.`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new PerfectWorldSessionValidationError(getErrorMessage(payload, defaultErrorMessage));
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, defaultErrorMessage));
  }

  const profile = payload as PerfectWorldDetailStatsResponse;
  if (profile.statusCode !== 0 || profile.data === undefined) {
    throw new PerfectWorldSessionValidationError(getErrorMessage(profile, defaultErrorMessage));
  }

  const steamId = profile.data.steamId ? String(profile.data.steamId) : auth.mySteamId;
  if (steamId !== auth.mySteamId) {
    throw new PerfectWorldSessionValidationError(
      'The saved Perfect World token no longer matches this Steam account. Re-import or sign in again.',
    );
  }

  return {
    steamId,
    nickname: profile.data.name ?? `PW${auth.userId}`,
    avatarUrl: profile.data.avatar ?? '',
  };
}

export async function fetchPerfectWorldMatchHistoryPage({
  auth,
  toSteamId,
  page,
  pageSize,
}: {
  auth: PerfectWorldAuth;
  toSteamId: string;
  page: number;
  pageSize: number;
}) {
  const response = await fetchJson<PerfectWorldMatchListResponse>(
    `${PERFECT_WORLD_API_URL}/api/csgo/home/match/list`,
    {
      method: 'POST',
      headers: buildJsonHeaders(auth.token),
      body: JSON.stringify({
        csgoSeasonId: 'recent',
        dataSource: 3,
        mySteamId: auth.mySteamId,
        page,
        pageSize,
        pvpType: -1,
        toSteamId,
      }),
    },
    'Failed to fetch Perfect World match history.',
  );

  if (response.statusCode !== 0) {
    throw new Error(getErrorMessage(response, 'Failed to fetch Perfect World match history.'));
  }

  return response.data?.matchList ?? [];
}

export async function fetchPerfectWorldPublicMatchDetail({
  userId,
  matchId,
}: {
  userId: number;
  matchId: string;
}) {
  const url = new URL(`${PERFECT_WORLD_EXPORTS_API_URL}/match-api/detail`);
  url.searchParams.set('uid', String(userId));
  url.searchParams.set('match_id', normalizePerfectWorldComparableMatchId(matchId));

  return fetchJson<unknown>(
    url.toString(),
    {
      method: 'GET',
      headers: {
        Referer: PERFECT_WORLD_REFERER,
      },
    },
    'Failed to fetch Perfect World match details.',
  );
}

function buildPerfectWorldLiveMatchSign(steamId: string) {
  return createHash('md5')
    .update(`steamId=${steamId}&securityKey=${PERFECT_WORLD_LIVE_MATCH_SECURITY_KEY}`)
    .digest('hex');
}

export async function fetchPerfectWorldLiveMatchPayload({
  steamId,
  expectedMatchId,
}: {
  steamId: string;
  expectedMatchId?: string;
}): Promise<JsonRecord | undefined> {
  const url = new URL(`${PERFECT_WORLD_APP_ACTIVITY_API_URL}/steamcn/match/watchStage/getWebsocketInfo`);
  url.searchParams.set('steamId', steamId);
  url.searchParams.set('platform', PERFECT_WORLD_LIVE_MATCH_PLATFORM);
  url.searchParams.set('sign', buildPerfectWorldLiveMatchSign(steamId));

  const response = await fetchJson<PerfectWorldLiveWebsocketInfoResponse>(
    url.toString(),
    {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Referer: PERFECT_WORLD_REFERER,
      },
    },
    'Failed to resolve the Perfect World live match websocket.',
  );

  const websocketUrl = response.result?.websocketUrl;
  if (response.code !== 1 || websocketUrl === undefined || websocketUrl === '') {
    throw new Error(getErrorMessage(response, 'Failed to resolve the Perfect World live match websocket.'));
  }

  const normalizedExpectedMatchId =
    expectedMatchId === undefined ? undefined : normalizePerfectWorldComparableMatchId(expectedMatchId);

  return await new Promise<JsonRecord | undefined>((resolve, reject) => {
    let settled = false;
    let repollTimeout: NodeJS.Timeout | undefined;
    const websocket = new WebSocket(websocketUrl);

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (repollTimeout !== undefined) {
        clearTimeout(repollTimeout);
      }
      websocket.removeAllListeners();
      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
        websocket.close();
      }
    };

    const finish = (value?: JsonRecord, error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      if (error !== undefined) {
        reject(error);
      } else {
        resolve(value);
      }
    };

    const requestSnapshot = () => {
      if (websocket.readyState !== WebSocket.OPEN) {
        return;
      }

      websocket.send(
        JSON.stringify({
          messageType: 10001,
          messageData: {
            steam_id: steamId,
          },
        }),
      );
    };

    const timeoutId = setTimeout(() => {
      finish(undefined, new Error('Timed out waiting for Perfect World live match data.'));
    }, PERFECT_WORLD_LIVE_MATCH_TIMEOUT_MS);

    websocket.on('open', () => {
      websocket.send('ping');
    });

    websocket.on('message', (data) => {
      const text = typeof data === 'string' ? data : data.toString();
      if (text === 'pong') {
        requestSnapshot();
        return;
      }

      let payload: unknown = undefined;
      try {
        payload = JSON.parse(text);
      } catch {
        return;
      }

      if (!isRecord(payload)) {
        return;
      }

      const messageType = typeof payload.messageType === 'number' ? payload.messageType : Number(payload.messageType);
      const messageData = isRecord(payload.messageData) ? payload.messageData : undefined;
      if (messageData === undefined) {
        return;
      }

      if (messageType === 10003) {
        repollTimeout = setTimeout(requestSnapshot, 250);
        return;
      }

      if (messageType !== 10002) {
        return;
      }

      const liveMatchIdValue = messageData.matchId;
      const liveMatchId =
        typeof liveMatchIdValue === 'string' || typeof liveMatchIdValue === 'number' ? String(liveMatchIdValue) : '';
      if (
        normalizedExpectedMatchId !== undefined &&
        normalizePerfectWorldComparableMatchId(liveMatchId) !== normalizedExpectedMatchId
      ) {
        finish(undefined);
        return;
      }

      finish(messageData);
    });

    websocket.on('error', () => {
      finish(undefined, new Error('Failed to connect to the Perfect World live match websocket.'));
    });

    websocket.on('close', () => {
      if (!settled) {
        finish(undefined);
      }
    });
  });
}

export async function fetchSignedPerfectWorldMatchApi<TResponse>({
  path,
  auth,
  body,
  signatureContext,
}: {
  path: string;
  auth: PerfectWorldAuth;
  body: JsonRecord;
  signatureContext?: PerfectWorldSignedRequestContext;
}) {
  if (signatureContext === undefined) {
    throw new Error(
      'Signed Perfect World match endpoints require the desktop client signature context, which is not configured.',
    );
  }

  const timestampSeconds = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).slice(2);
  const bodyString = JSON.stringify(body);
  const signature = await signatureContext.sign({
    path,
    body: bodyString,
    random,
    timestampSeconds,
  });
  const url = new URL(`${PERFECT_WORLD_CSGO_MODE_API_URL}${path}`);
  url.searchParams.set('a', '20000');
  url.searchParams.set('r', random);
  url.searchParams.set('t', String(timestampSeconds));
  url.searchParams.set('s', signature);

  return fetchJson<TResponse>(
    url.toString(),
    {
      method: 'POST',
      headers: {
        ...buildJsonHeaders(auth.token),
        PwaSteamId: auth.mySteamId,
      },
      body: JSON.stringify({
        ...body,
        loginSteamId: auth.mySteamId,
        jt: signatureContext.jt,
      }),
    },
    'Failed to fetch a signed Perfect World match endpoint.',
  );
}

export function buildPerfectWorldMatchApiId(matchId: string) {
  return buildPerfectWorldMatchId(matchId);
}
