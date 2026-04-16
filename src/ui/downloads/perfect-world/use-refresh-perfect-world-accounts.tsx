import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import { accountsUpdated } from './perfect-world-actions';
import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { useDispatch } from 'csdm/ui/store/use-dispatch';

export function useRefreshPerfectWorldAccounts() {
  const client = useWebSocketClient();
  const dispatch = useDispatch();

  return async () => {
    const accounts = await client.send({
      name: RendererClientMessageName.FetchPerfectWorldAccounts,
    });
    dispatch(accountsUpdated({ accounts }));

    return accounts;
  };
}
