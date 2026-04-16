import { describe, expect, it } from 'vite-plus/test';
import {
  decodePerfectWorldClientBridgeToken,
  extractPerfectWorldClientAccountContextFromLogText,
} from './import-perfect-world-client-account';

describe('importPerfectWorldClientAccount', () => {
  it('should decode the Perfect World desktop client bridge token payload', () => {
    const session = decodePerfectWorldClientBridgeToken(
      '^1d185452545f045c21242a2f7c6866666e6a505703585a0940431c431ce7b7b6beeea7a7f5a9affdfd949f9c988081828b8ff19cf1fff9f9e3e4e1e3e6d3dcd0d8d5c0c4cf$',
    );

    expect(session).toEqual({
      token: '75dabf8ccabd29214704e16f26d8bf314c74c03b',
      steamId: '76561198828728079',
    });
  });

  it('should recover the current account context from decoded client logs', () => {
    const token = '75dabf8ccabd29214704e16f26d8bf314c74c03b';
    const steamId = '76561198828728079';
    const avatarUrl = 'https://cdn.wmpvp.com/avatars/8d917cbdcc725ab709e4de08d88c8df8c0706763.jpg';
    const logText = [
      `[2026-04-13T20:09:04.320] [TRACE] game - query local steam info res: {"code":0,"msg":"成功","data":{"users":[{"nickname":"god knows","avatar":"${avatarUrl}","steam_id":"${steamId}","zq_id":"1600005"}]}} `,
      `[2026-04-13T20:09:09.222] [TRACE] main - --------queryUserDetailsByToken:  ${token} {"code":0,"msg":"","data":{"user":{"steam_id":"${steamId}","zq_id":"1600005","nickname":"god knows","avatar":"${avatarUrl}","jt":"jwt-token"}}} `,
      `[2026-04-13T20:09:09.926] [TRACE] webapi - USER_GET_BINDING_INFO_REQ: {"access_token":"${token}"}, RES: {"code":0,"msg":"","data":{"binding_info":{"userId":1600005,"mobilePhone":"180****3830"}}} `,
    ].join('\n');

    expect(
      extractPerfectWorldClientAccountContextFromLogText(logText, {
        token,
        steamId,
      }),
    ).toEqual({
      userId: 1600005,
      jt: 'jwt-token',
      nickname: 'god knows',
      avatarUrl,
      maskedPhoneNumber: '180****3830',
    });
  });
});
