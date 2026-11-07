import { client } from './rpc/connection';
import { DYNAMIC_FIELDS, LIST_FIELDS, type TorrentRow } from './rpc/types';

const FULL_RESYNC_MS = 60_000;

/**
 * Client-side mirror of the daemon's torrent list.
 *
 * - First poll fetches every LIST_FIELD for every torrent.
 * - Subsequent polls ask only for DYNAMIC_FIELDS of `recently-active` torrents
 *   and merge them in, so a 5,000-torrent library costs a few KB per tick.
 * - Unknown ids that show up in an incremental response (added elsewhere) are
 *   back-filled with a targeted full-field fetch.
 * - A full resync runs every minute as a safety net.
 *
 * Unchanged rows keep their object identity, so memoised rows don't re-render.
 */
class TorrentCache {
  private rows = new Map<number, TorrentRow>();
  private lastFull = 0;
  private snap: TorrentRow[] | null = null;
  private epoch = -1;

  reset(): void {
    this.rows.clear();
    this.lastFull = 0;
    this.snap = null;
  }

  /** Make the next poll a full resync. */
  invalidate(): void {
    this.lastFull = 0;
  }

  snapshot(): TorrentRow[] {
    this.snap ??= Array.from(this.rows.values());
    return this.snap;
  }

  get(id: number): TorrentRow | undefined {
    return this.rows.get(id);
  }

  /** `epoch` changes whenever the transport is swapped (live ↔ demo). */
  async poll(epoch: number): Promise<TorrentRow[]> {
    if (epoch !== this.epoch) {
      this.reset();
      this.epoch = epoch;
    }
    if (this.lastFull === 0 || Date.now() - this.lastFull > FULL_RESYNC_MS) {
      const { torrents } = await client.getTorrents(LIST_FIELDS);
      this.rows = new Map(torrents.map((t) => [t.id, t]));
      this.lastFull = Date.now();
      this.snap = null;
      return this.snapshot();
    }

    const { torrents, removed } = await client.getTorrents(DYNAMIC_FIELDS, 'recently-active');
    const unknown: number[] = [];
    let changed = false;
    for (const t of torrents) {
      const prev = this.rows.get(t.id);
      if (!prev) {
        unknown.push(t.id);
        continue;
      }
      if (!shallowEqualDynamic(prev, t)) {
        this.rows.set(t.id, { ...prev, ...t });
        changed = true;
      }
    }
    for (const id of removed) changed = this.rows.delete(id) || changed;
    if (unknown.length) {
      await this.refresh(unknown);
      changed = true;
    }
    if (changed) this.snap = null;
    return this.snapshot();
  }

  /** Fetch every list field for specific torrents (after a mutation, or new ids). */
  async refresh(ids: number[]): Promise<void> {
    if (!ids.length) return;
    const { torrents } = await client.getTorrents(LIST_FIELDS, ids);
    const seen = new Set<number>();
    for (const t of torrents) {
      this.rows.set(t.id, t);
      seen.add(t.id);
    }
    for (const id of ids) if (!seen.has(id)) this.rows.delete(id);
    this.snap = null;
  }

  /** Optimistic update. Returns the previous rows for rollback. */
  patch(ids: Iterable<number>, fn: (t: TorrentRow) => Partial<TorrentRow>): TorrentRow[] {
    const prev: TorrentRow[] = [];
    for (const id of ids) {
      const t = this.rows.get(id);
      if (!t) continue;
      prev.push(t);
      this.rows.set(id, { ...t, ...fn(t) });
    }
    if (prev.length) this.snap = null;
    return prev;
  }

  remove(ids: Iterable<number>): TorrentRow[] {
    const prev: TorrentRow[] = [];
    for (const id of ids) {
      const t = this.rows.get(id);
      if (t) prev.push(t);
      this.rows.delete(id);
    }
    if (prev.length) this.snap = null;
    return prev;
  }

  restore(rows: TorrentRow[]): void {
    for (const r of rows) this.rows.set(r.id, r);
    if (rows.length) this.snap = null;
  }
}

function shallowEqualDynamic(a: TorrentRow, b: Partial<TorrentRow>): boolean {
  for (const k of DYNAMIC_FIELDS) {
    const av = a[k];
    const bv = b[k];
    if (av === bv) continue;
    if (Array.isArray(av) && Array.isArray(bv) && av.length === bv.length && av.every((x, i) => x === bv[i])) continue;
    return false;
  }
  return true;
}

export const torrentCache = new TorrentCache();
