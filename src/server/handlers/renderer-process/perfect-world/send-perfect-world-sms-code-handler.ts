import type { SendPerfectWorldSmsCodePayload } from 'csdm/common/types/perfect-world-account';

export async function sendPerfectWorldSmsCodeHandler(_payload: SendPerfectWorldSmsCodePayload) {
  throw new Error(
    'Sending Perfect World SMS codes is not supported in-app yet. Enter a code received from the Perfect World client or website.',
  );
}
