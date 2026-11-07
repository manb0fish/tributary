import { create } from 'zustand';
import { HttpTransport, RpcError, TransmissionClient } from './client';
import { MockTransport } from './mock';

export type ConnectionPreference = 'auto' | 'live' | 'demo';
export type ConnectionMode = 'connecting' | 'live' | 'demo' | 'error';

/** Resolved relative to the page, so it works under /transmission/web/ too. */
const RPC_URL = (() => {
  const fromQuery = new URLSearchParams(location.search).get('rpc');
  return fromQuery ?? '/transmission/rpc';
})();

const params = new URLSearchParams(location.search);
const MOCK_COUNT = Math.max(1, Math.min(20_000, Number(params.get('mock')) || 240));
const FORCE_DEMO = params.has('demo') || params.has('mock');

const http = new HttpTransport(RPC_URL);
let mock: MockTransport | null = null;

export const client = new TransmissionClient(http);

interface ConnectionState {
  mode: ConnectionMode;
  /** Bumped every time the transport changes so query keys can reset. */
  epoch: number;
  error: string | null;
  rpcUrl: string;
  connect: (pref: ConnectionPreference) => Promise<void>;
}

export const useConnection = create<ConnectionState>((set, get) => ({
  mode: 'connecting',
  epoch: 0,
  error: null,
  rpcUrl: RPC_URL,
  connect: async (pref) => {
    const useDemo = () => {
      mock ??= new MockTransport(MOCK_COUNT);
      client.setTransport(mock);
      set({ mode: 'demo', epoch: get().epoch + 1, error: null });
    };

    if (pref === 'demo' || (pref === 'auto' && FORCE_DEMO)) return useDemo();

    set({ mode: 'connecting', error: null });
    client.setTransport(http);
    try {
      await client.getSession();
      set({ mode: 'live', epoch: get().epoch + 1, error: null });
    } catch (e) {
      const err = e instanceof RpcError ? e : new RpcError('network', String(e));
      // Auth problems are real problems — don't hide them behind demo data.
      if (pref === 'auto' && err.kind !== 'auth') return useDemo();
      set({ mode: 'error', epoch: get().epoch + 1, error: err.message });
    }
  },
}));
