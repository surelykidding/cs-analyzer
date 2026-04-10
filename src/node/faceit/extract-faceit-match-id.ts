export function extractFaceitMatchId(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return '';
  }

  if (!trimmedValue.includes('://')) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);
    const segments = url.pathname.split('/').filter(Boolean);
    const roomSegmentIndex = segments.findIndex((segment) => {
      return segment === 'room';
    });

    if (roomSegmentIndex !== -1 && segments.length > roomSegmentIndex + 1) {
      return segments[roomSegmentIndex + 1];
    }

    return segments.at(-1) ?? '';
  } catch {
    return trimmedValue;
  }
}
