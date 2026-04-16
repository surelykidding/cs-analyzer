import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { useDispatch } from 'csdm/ui/store/use-dispatch';
import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import { fetchLastMatchesError, fetchLastMatchesStart, fetchLastMatchesSuccess } from './perfect-world-actions';
import { isErrorCode } from 'csdm/common/is-error-code';
import { ErrorCode } from 'csdm/common/error-code';
import { useCurrentPerfectWorldAccount } from './use-current-perfect-world-account';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import { useRefreshPerfectWorldAccounts } from './use-refresh-perfect-world-accounts';

export function useFetchLastPerfectWorldMatches() {
  const client = useWebSocketClient();
  const dispatch = useDispatch();
  const account = useCurrentPerfectWorldAccount();
  const refreshAccounts = useRefreshPerfectWorldAccounts();

  return async () => {
    if (account === undefined || !account.isValid) {
      return;
    }

    try {
      dispatch(fetchLastMatchesStart());
      const matches = await client.send({
        name: RendererClientMessageName.FetchLastPerfectWorldMatches,
        payload: account.id,
      });
      dispatch(fetchLastMatchesSuccess({ matches }));
    } catch (error) {
      if (error === PerfectWorldErrorCode.AccountExpired) {
        try {
          await refreshAccounts();
        } catch {
          // Ignore follow-up refresh errors and keep the original failure.
        }
      }

      const errorCode = isErrorCode(error) ? error : ErrorCode.UnknownError;
      dispatch(fetchLastMatchesError({ errorCode }));
    }
  };
}
