export const PerfectWorldErrorCode = {
  AccountMissing: 'PerfectWorldAccountMissing',
  AccountExpired: 'PerfectWorldAccountExpired',
  ParticipantSteamIdRequired: 'PerfectWorldParticipantSteamIdRequired',
  ParticipantSteamIdNotInRoom: 'PerfectWorldParticipantSteamIdNotInRoom',
} as const;

export type PerfectWorldErrorCode = (typeof PerfectWorldErrorCode)[keyof typeof PerfectWorldErrorCode];

export function isPerfectWorldErrorCode(value: unknown): value is PerfectWorldErrorCode {
  return typeof value === 'string' && Object.values(PerfectWorldErrorCode).includes(value as PerfectWorldErrorCode);
}
