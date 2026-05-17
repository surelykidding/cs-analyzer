import type { SendPerfectWorldSmsCodePayload } from 'csdm/common/types/perfect-world-account';

export function sendPerfectWorldSmsCodeHandler(payload: SendPerfectWorldSmsCodePayload): Promise<void> {
  void payload;

  return Promise.reject(
    new Error(
      'Sending Perfect World SMS codes is not supported in-app yet. Enter a code received from the Perfect World client or website.',
    ),
  );
}
