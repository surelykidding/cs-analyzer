import { Game } from 'csdm/common/types/counter-strike';
import type { PerfectWorldMatch, PerfectWorldPlayer } from 'csdm/common/types/perfect-world-match';
import { buildPerfectWorldDemoUrl } from './perfect-world-api';
import { buildPerfectWorldMatchId, normalizePerfectWorldComparableMatchId } from './extract-perfect-world-match-id';

type JsonRecord = Record<string, unknown>;

type MatchSeed = Omit<PerfectWorldMatch, 'downloadStatus'>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue === '' ? null : trimmedValue;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

function getTeamNumber(value: unknown): number | null {
  const numericValue = getNumber(value);
  if (numericValue !== null) {
    return numericValue;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();
  if (normalizedValue === 'CT' || normalizedValue === 'COUNTER_TERRORIST' || normalizedValue === 'COUNTERTERRORIST') {
    return 1;
  }

  if (normalizedValue === 'T' || normalizedValue === 'TR' || normalizedValue === 'TERRORIST' || normalizedValue === 'TERRORISTS') {
    return 2;
  }

  return null;
}

function getField<T>(record: JsonRecord, keys: string[], mapper: (value: unknown) => T | null): T | null {
  for (const key of keys) {
    const mappedValue = mapper(record[key]);
    if (mappedValue !== null) {
      return mappedValue;
    }
  }

  return null;
}

function normalizePerfectWorldMapName(values: Array<string | null | undefined>) {
  const normalizedValues = values
    .map((value) => value?.toLowerCase() ?? '')
    .filter((value) => value !== '');

  const mapping: Array<{ matchers: string[]; mapName: string }> = [
    { matchers: ['de_ancient', 'ancient', '远古遗迹'], mapName: 'de_ancient' },
    { matchers: ['de_anubis', 'anubis', '阿努比斯'], mapName: 'de_anubis' },
    { matchers: ['de_cache', 'cache', '仓库突击'], mapName: 'de_cache' },
    { matchers: ['de_cbble', 'cobblestone', 'cbble', '古堡激战'], mapName: 'de_cbble' },
    { matchers: ['de_dust2', 'dust2', 'dust 2', 'dust ii', '炙热沙城2', '炙热沙城ii', '沙2'], mapName: 'de_dust2' },
    { matchers: ['de_inferno', 'inferno', '炼狱小镇'], mapName: 'de_inferno' },
    { matchers: ['de_mirage', 'mirage', '荒漠迷城'], mapName: 'de_mirage' },
    { matchers: ['de_nuke', 'nuke', '核子危机'], mapName: 'de_nuke' },
    { matchers: ['de_overpass', 'overpass', '死亡游乐园'], mapName: 'de_overpass' },
    { matchers: ['de_train', 'train', '列车停放站'], mapName: 'de_train' },
    { matchers: ['de_vertigo', 'vertigo', '殒命大厦'], mapName: 'de_vertigo' },
  ];

  for (const value of normalizedValues) {
    for (const entry of mapping) {
      if (entry.matchers.some((matcher) => value.includes(matcher))) {
        return entry.mapName;
      }
    }
  }

  return values.find((value) => value !== null && value !== undefined && value.trim() !== '') ?? '';
}

function parsePerfectWorldDateString(dateString: string | null) {
  if (dateString === null) {
    return null;
  }

  const liveMatchDate = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2}):(\d{2})$/);
  if (liveMatchDate !== null) {
    const [, month, day, year, hour, minute, second] = liveMatchDate;
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const normalizedDateString = dateString.replace(' ', 'T');
  const withTimezone = normalizedDateString.includes('+') ? normalizedDateString : `${normalizedDateString}+08:00`;
  const date = new Date(withTimezone);

  return Number.isNaN(date.getTime()) ? null : date;
}

function extractStringCandidates(value: unknown): string[] {
  const values: string[] = [];
  const visited = new Set<unknown>();

  const visit = (currentValue: unknown) => {
    if (visited.has(currentValue)) {
      return;
    }

    if (typeof currentValue === 'string') {
      const trimmedValue = currentValue.trim();
      if (trimmedValue !== '') {
        values.push(trimmedValue);
      }
      return;
    }

    if (!isRecord(currentValue) && !Array.isArray(currentValue)) {
      return;
    }

    visited.add(currentValue);
    if (Array.isArray(currentValue)) {
      for (const item of currentValue) {
        visit(item);
      }
      return;
    }

    for (const nestedValue of Object.values(currentValue)) {
      visit(nestedValue);
    }
  };

  visit(value);

  return values;
}

function mapPlayerCandidate(record: JsonRecord): PerfectWorldPlayer | null {
  const steamId = getField(record, ['steamId', 'steam_id', 'playerId'], getString);
  const userId = getField(record, ['userId', 'user_id', 'uid'], getNumber);
  const name = getField(record, ['name', 'nickName', 'nickname', 'steamName', 'steamNick', 'pvpNickName'], getString);
  const avatarUrl = getField(record, ['avatar', 'avatarUrl', 'steamAvatar', 'pvpAvatar'], getString);
  const team = getField(record, ['team', 'teamId', 'camp', 'campId', 'group', 'side'], getTeamNumber);
  const killCount = getField(record, ['kill', 'kills', 'killCount'], getNumber) ?? 0;
  const assistCount = getField(record, ['assist', 'assists', 'assistCount'], getNumber) ?? 0;
  const deathCount = getField(record, ['death', 'deaths', 'deathCount'], getNumber) ?? 0;
  const rating = getField(record, ['rating'], getNumber);
  const pwRating = getField(record, ['pwRating'], getNumber);
  const hasWonValue = getField(record, ['hasWon', 'win', 'isWin'], getNumber);
  const hasEnoughPlayerFields =
    name !== null || avatarUrl !== null || userId !== null || team !== null || killCount > 0 || assistCount > 0 || deathCount > 0;

  if (steamId === null || !hasEnoughPlayerFields) {
    return null;
  }

  return {
    steamId,
    userId,
    name: name ?? steamId,
    avatarUrl: avatarUrl ?? '',
    team,
    hasWon: hasWonValue === null ? null : hasWonValue > 0,
    killCount,
    assistCount,
    deathCount,
    rating,
    pwRating,
  };
}

function scorePlayerCandidate(player: PerfectWorldPlayer) {
  let score = 0;
  if (player.name !== player.steamId) {
    score += 4;
  }
  if (player.avatarUrl !== '') {
    score += 2;
  }
  if (player.userId !== null) {
    score += 2;
  }
  if (player.team !== null) {
    score += 2;
  }

  return score;
}

function extractPlayers(value: unknown): PerfectWorldPlayer[] {
  const candidates: PerfectWorldPlayer[] = [];
  const visited = new Set<unknown>();

  const visit = (currentValue: unknown) => {
    if (visited.has(currentValue)) {
      return;
    }

    if (!isRecord(currentValue) && !Array.isArray(currentValue)) {
      return;
    }

    visited.add(currentValue);
    if (Array.isArray(currentValue)) {
      for (const item of currentValue) {
        visit(item);
      }
      return;
    }

    const player = mapPlayerCandidate(currentValue);
    if (player !== null) {
      candidates.push(player);
    }

    for (const nestedValue of Object.values(currentValue)) {
      visit(nestedValue);
    }
  };

  visit(value);

  const playersBySteamId = new Map<string, PerfectWorldPlayer>();
  for (const candidate of candidates) {
    const existingPlayer = playersBySteamId.get(candidate.steamId);
    if (existingPlayer === undefined || scorePlayerCandidate(candidate) > scorePlayerCandidate(existingPlayer)) {
      playersBySteamId.set(candidate.steamId, candidate);
    }
  }

  return [...playersBySteamId.values()];
}

function buildTeams(players: PerfectWorldPlayer[], score1: number, score2: number) {
  const teams = [1, 2].map((teamNumber) => {
    return {
      name: `Team ${teamNumber}`,
      score: teamNumber === 1 ? score1 : score2,
      playerSteamIds: players
        .filter((player) => player.team === teamNumber)
        .map((player) => player.steamId),
    };
  });

  if (players.some((player) => player.team === 1 || player.team === 2)) {
    return teams;
  }

  return [
    {
      name: 'Team 1',
      score: score1,
      playerSteamIds: [],
    },
    {
      name: 'Team 2',
      score: score2,
      playerSteamIds: [],
    },
  ];
}

function pickDate(record: JsonRecord) {
  const timestampSeconds = getField(record, ['timeStamp', 'timestamp'], getNumber);
  if (timestampSeconds !== null) {
    return new Date(timestampSeconds * 1000).toISOString();
  }

  const startDate = parsePerfectWorldDateString(getField(record, ['startTime', 'start_time'], getString));
  if (startDate !== null) {
    return startDate.toISOString();
  }

  const endDate = parsePerfectWorldDateString(getField(record, ['endTime', 'end_time'], getString));
  if (endDate !== null) {
    return endDate.toISOString();
  }

  return new Date().toISOString();
}

function pickDurationInSeconds(record: JsonRecord) {
  const rawDuration = getField(record, ['duration', 'durationMinutes'], getNumber);
  if (rawDuration !== null) {
    return rawDuration > 600 ? rawDuration : rawDuration * 60;
  }

  const startDate = parsePerfectWorldDateString(getField(record, ['startTime', 'start_time'], getString));
  const endDate = parsePerfectWorldDateString(getField(record, ['endTime', 'end_time'], getString));
  if (startDate !== null && endDate !== null) {
    return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
  }

  return 0;
}

function extractPotentialUrl(strings: string[], pattern: RegExp) {
  return strings.find((value) => pattern.test(value)) ?? null;
}

export function createPerfectWorldMatchSeed(value: unknown, fallbackMatchId: string): MatchSeed {
  const record = isRecord(value) ? value : {};
  const strings = extractStringCandidates(value);
  const rawMatchId =
    getField(record, ['matchId', 'match_id', 'id'], getString) ??
    strings.find((entry) => normalizePerfectWorldComparableMatchId(entry).length >= 10) ??
    fallbackMatchId;
  const players = extractPlayers(value);
  const score1 = getField(record, ['score1', 'team1Score', 'ctScore'], getNumber) ?? 0;
  const score2 = getField(record, ['score2', 'team2Score', 'terroristScore'], getNumber) ?? 0;
  const mapName = normalizePerfectWorldMapName([
    getField(record, ['map', 'mapName'], getString),
    getField(record, ['mapLogo'], getString),
    getField(record, ['mapUrl'], getString),
    ...strings,
  ]);
  const explicitDemoUrl = extractPotentialUrl(strings, /\/demo\/|\.dem(\.zip)?$/i);
  const cupId = getField(record, ['cupId', 'cup_id'], getString);

  return {
    id: rawMatchId.startsWith('PVP@') ? rawMatchId : buildPerfectWorldMatchId(rawMatchId),
    game: Game.CS2,
    date: pickDate(record),
    durationInSeconds: pickDurationInSeconds(record),
    demoUrl: explicitDemoUrl ?? buildPerfectWorldDemoUrl(rawMatchId, cupId),
    mapName,
    url: extractPotentialUrl(strings, /\/match\/|\/room\/|inframe\/get-match-detail/i),
    cupId,
    dataSource: getField(record, ['dataSource'], getNumber),
    mode: getField(record, ['mode', 'matchMode'], getString),
    players,
    teams: buildTeams(players, score1, score2),
  };
}

export function mergePerfectWorldMatchSeeds(...seeds: Array<Partial<MatchSeed>>): MatchSeed {
  const mergedPlayers = new Map<string, PerfectWorldPlayer>();
  let latestSeedWithTeams: MatchSeed | null = null;

  for (const seed of seeds) {
    for (const player of seed.players ?? []) {
      mergedPlayers.set(player.steamId, player);
    }

    if ((seed.teams ?? []).some((team) => team.playerSteamIds.length > 0)) {
      latestSeedWithTeams = seed as MatchSeed;
    }
  }

  const mergedSeed = seeds.reduce<Partial<MatchSeed>>((result, seed) => {
    return {
      ...result,
      ...Object.fromEntries(Object.entries(seed).filter(([, value]) => value !== null && value !== '' && value !== undefined)),
    };
  }, {});
  const players = [...mergedPlayers.values()];
  const score1 = mergedSeed.teams?.[0]?.score ?? latestSeedWithTeams?.teams[0]?.score ?? 0;
  const score2 = mergedSeed.teams?.[1]?.score ?? latestSeedWithTeams?.teams[1]?.score ?? 0;

  return {
    id: mergedSeed.id ?? buildPerfectWorldMatchId(''),
    game: Game.CS2,
    date: mergedSeed.date ?? new Date().toISOString(),
    durationInSeconds: mergedSeed.durationInSeconds ?? 0,
    demoUrl: mergedSeed.demoUrl ?? buildPerfectWorldDemoUrl(mergedSeed.id ?? '', mergedSeed.cupId ?? null),
    mapName: mergedSeed.mapName ?? '',
    url: mergedSeed.url ?? null,
    cupId: mergedSeed.cupId ?? null,
    dataSource: mergedSeed.dataSource ?? null,
    mode: mergedSeed.mode ?? null,
    players,
    teams: latestSeedWithTeams?.teams ?? buildTeams(players, score1, score2),
  };
}
