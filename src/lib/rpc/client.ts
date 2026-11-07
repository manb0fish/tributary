import type {
  Priority,
  RpcArgs,
  RpcMethod,
  RpcResponse,
  RpcResult,
  RpcTransport,
  SessionArguments,
  SessionSetArgs,
  SessionStats,
  FreeSpace,
  Torrent,
  TorrentAddArgs,
  TorrentAddResult,
  TorrentField,
  TorrentIds,
} from './types';

export type RpcErrorKind = 'network' | 'auth' | 'http' | 'rpc' | 'protocol';

export class RpcError extends Error {
  readonly kind: RpcErrorKind;
  readonly status?: number;

  constructor(kind: RpcErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'RpcError';
    this.kind = kind;
    this.status = status;
  }
}

const SESSION_HEADER = 'X-Transmission-Session-Id';

/**
 * Talks to a real Transmission daemon over HTTP.
 *
 * Transmission guards its RPC endpoint against CSRF: any request without a
 * valid session id is rejected with `409 Conflict` and the correct id in the
 * `X-Transmission-Session-Id` response header. We cache that id in memory and
 * transparently retry. The daemon rotates ids, so this can happen at any time.
 */
export class HttpTransport implements RpcTransport {
  private sessionId: string | null = null;
  private tag = 0;
  private readonly url: string;
  private readonly timeoutMs: number;

  constructor(url: string, timeoutMs = 15_000) {
    this.url = url;
    this.timeoutMs = timeoutMs;
  }

  async send<M extends RpcMethod>(method: M, args: RpcArgs<M>): Promise<RpcResult<M>> {
    const tag = ++this.tag;
    const body = JSON.stringify({ method, arguments: args, tag });

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await this.post(body);

      if (res.status === 409) {
        const id = res.headers.get(SESSION_HEADER);
        if (!id) throw new RpcError('protocol', '409 without session id header', 409);
        this.sessionId = id;
        continue;
      }
      if (res.status === 401) throw new RpcError('auth', 'Authentication required', 401);
      if (res.status === 403) throw new RpcError('auth', 'Forbidden — check rpc-whitelist / host-whitelist', 403);
      if (!res.ok) throw new RpcError('http', `HTTP ${res.status} ${res.statusText}`, res.status);

      let json: RpcResponse<M>;
      try {
        json = (await res.json()) as RpcResponse<M>;
      } catch {
        throw new RpcError('protocol', 'Response was not valid JSON');
      }
      if (json.result !== 'success') throw new RpcError('rpc', json.result);
      return json.arguments;
    }
    throw new RpcError('protocol', 'Could not negotiate a session id');
  }

  private async post(body: string): Promise<Response> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionId) headers[SESSION_HEADER] = this.sessionId;

    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      return await fetch(this.url, {
        method: 'POST',
        headers,
        body,
        credentials: 'same-origin',
        signal: ctrl.signal,
      });
    } catch (e) {
      const msg = e instanceof Error && e.name === 'AbortError' ? 'Request timed out' : 'Network error';
      throw new RpcError('network', msg);
    } finally {
      window.clearTimeout(timer);
    }
  }
}

export type TorrentPick<F extends TorrentField> = Pick<Torrent, F | 'id'>;

/** High-level, strongly-typed API. The transport can be swapped at runtime. */
export class TransmissionClient {
  private transport: RpcTransport;

  constructor(transport: RpcTransport) {
    this.transport = transport;
  }

  setTransport(transport: RpcTransport): void {
    this.transport = transport;
  }

  call<M extends RpcMethod>(method: M, args: RpcArgs<M>): Promise<RpcResult<M>> {
    return this.transport.send(method, args);
  }

  async getTorrents<F extends TorrentField>(
    fields: readonly F[],
    ids?: TorrentIds,
  ): Promise<{ torrents: Array<TorrentPick<F>>; removed: number[] }> {
    const args = ids === undefined ? { fields } : { fields, ids };
    const res = await this.call('torrent-get', args);
    return {
      // The daemon returns exactly the requested fields.
      torrents: res.torrents as Array<TorrentPick<F>>,
      removed: res.removed ?? [],
    };
  }

  getSession(): Promise<SessionArguments> {
    return this.call('session-get', {});
  }
  setSession(args: SessionSetArgs): Promise<unknown> {
    return this.call('session-set', args);
  }
  getStats(): Promise<SessionStats> {
    return this.call('session-stats', {});
  }
  freeSpace(path: string): Promise<FreeSpace> {
    return this.call('free-space', { path });
  }

  start(ids: number[]) {
    return this.call('torrent-start', { ids });
  }
  startNow(ids: number[]) {
    return this.call('torrent-start-now', { ids });
  }
  stop(ids: number[]) {
    return this.call('torrent-stop', { ids });
  }
  verify(ids: number[]) {
    return this.call('torrent-verify', { ids });
  }
  reannounce(ids: number[]) {
    return this.call('torrent-reannounce', { ids });
  }
  remove(ids: number[], deleteData: boolean) {
    return this.call('torrent-remove', { ids, 'delete-local-data': deleteData });
  }
  setLocation(ids: number[], location: string, move: boolean) {
    return this.call('torrent-set-location', { ids, location, move });
  }
  setLabels(ids: number[], labels: string[]) {
    return this.call('torrent-set', { ids, labels });
  }
  queueMove(ids: number[], where: 'top' | 'up' | 'down' | 'bottom') {
    return this.call(`queue-move-${where}`, { ids });
  }
  setFilesWanted(id: number, files: number[], wanted: boolean) {
    return this.call(
      'torrent-set',
      wanted ? { ids: [id], 'files-wanted': files } : { ids: [id], 'files-unwanted': files },
    );
  }
  setFilesPriority(id: number, files: number[], priority: Priority) {
    const args =
      priority === 1
        ? { ids: [id], 'priority-high': files }
        : priority === -1
          ? { ids: [id], 'priority-low': files }
          : { ids: [id], 'priority-normal': files };
    return this.call('torrent-set', args);
  }
  add(args: TorrentAddArgs): Promise<TorrentAddResult> {
    return this.call('torrent-add', args);
  }
}
