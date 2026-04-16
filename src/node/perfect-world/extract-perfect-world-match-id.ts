export function normalizePerfectWorldComparableMatchId(matchId: string) {
  const trimmedMatchId = matchId.trim();
  const atIndex = trimmedMatchId.lastIndexOf('@');
  if (atIndex >= 0) {
    return trimmedMatchId.slice(atIndex + 1);
  }

  const digitMatch = trimmedMatchId.match(/\d{10,}/);
  if (digitMatch !== null) {
    return digitMatch[0];
  }

  return trimmedMatchId;
}

export function extractPerfectWorldMatchId(input: string) {
  return normalizePerfectWorldComparableMatchId(input);
}

export function buildPerfectWorldMatchId(matchId: string) {
  const comparableMatchId = normalizePerfectWorldComparableMatchId(matchId);
  if (comparableMatchId === '') {
    return '';
  }

  return `PVP@${comparableMatchId}`;
}
