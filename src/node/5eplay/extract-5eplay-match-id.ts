export function extract5EPlayMatchId(matchIdOrUrl: string) {
  const trimmedValue = matchIdOrUrl.trim();
  if (trimmedValue === '') {
    return '';
  }

  if (!trimmedValue.includes('/')) {
    return trimmedValue;
  }

  const matches = trimmedValue.match(/\/match\/(?<matchId>[^/?#]+)/i);

  return matches?.groups?.matchId ?? '';
}
