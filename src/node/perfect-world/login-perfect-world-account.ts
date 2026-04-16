import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import { fetchPerfectWorldSelfProfile, loginPerfectWorld } from './perfect-world-api';

function maskPhoneNumber(phoneNumber: string | null) {
  if (phoneNumber === null || phoneNumber.trim() === '') {
    return null;
  }

  const sanitizedPhoneNumber = phoneNumber.replace(/\s+/g, '');
  if (sanitizedPhoneNumber.length < 7) {
    return sanitizedPhoneNumber;
  }

  return `${sanitizedPhoneNumber.slice(0, 3)}****${sanitizedPhoneNumber.slice(-4)}`;
}

export async function loginPerfectWorldAccount({
  mobilePhone,
  securityCode,
}: {
  mobilePhone: string;
  securityCode: string;
}): Promise<Omit<PerfectWorldAccount, 'isCurrent'>> {
  const accountInfo = await loginPerfectWorld({
    mobilePhone,
    securityCode,
  });

  let nickname = `PW${accountInfo.userId}`;
  let avatarUrl = '';
  try {
    const profile = await fetchPerfectWorldSelfProfile({
      token: accountInfo.token,
      mySteamId: accountInfo.steamId,
      userId: accountInfo.userId,
    });
    nickname = profile.nickname;
    avatarUrl = profile.avatarUrl;
  } catch (error) {
    logger.warn('Failed to hydrate Perfect World profile after login, continuing with fallback values.');
    logger.warn(error);
  }

  return {
    id: String(accountInfo.userId),
    userId: accountInfo.userId,
    steamId: accountInfo.steamId,
    token: accountInfo.token,
    nickname,
    avatarUrl,
    maskedPhoneNumber: maskPhoneNumber(accountInfo.mobilePhone),
    isValid: true,
    lastValidatedAt: new Date().toISOString(),
    lastError: null,
  };
}
