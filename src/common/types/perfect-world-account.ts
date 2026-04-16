import type { ThirdPartyAccount } from './third-party-account';

export type PerfectWorldAccount = ThirdPartyAccount & {
  userId: number;
  steamId: string;
  token: string;
  jt?: string | null;
  maskedPhoneNumber: string | null;
  isValid: boolean;
  lastValidatedAt: string | null;
  lastError: string | null;
};

export type AddPerfectWorldAccountPayload = {
  mobilePhone: string;
  securityCode: string;
};

export type SendPerfectWorldSmsCodePayload = {
  mobilePhone: string;
};
