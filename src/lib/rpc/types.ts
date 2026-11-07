/**
 * Typed model of the Transmission JSON-RPC protocol (legacy "arguments" style,
 * supported by every Transmission release from 2.x through 4.x).
 * Spec: https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md
 */

/* ------------------------------------------------------------------ enums */

export const TorrentStatus = {
  Stopped: 0,
  CheckWait: 1,
  Check: 2,
  DownloadWait: 3,
  Download: 4,
  SeedWait: 5,
  Seed: 6,
} as const;
export type TorrentStatus = (typeof TorrentStatus)[keyof typeof TorrentStatus];

export const TorrentError = {
  None: 0,
  TrackerWarning: 1,
  TrackerError: 2,
  LocalError: 3,
} as const;
export type TorrentError = (typeof TorrentError)[keyof typeof TorrentError];

export const Priority = { Low: -1, Normal: 0, High: 1 } as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export type Encryption = 'required' | 'preferred' | 'tolerated';

/* ---------------------------------------------------------- sub-objects */

export interface Tracker {
  announce: string;
  id: number;
  scrape: string;
  tier: number;
  sitename?: string;
}

export interface TorrentFile {
  name: string;
  length: number;
  bytesCompleted: number;
}

export interface FileStat {
  bytesCompleted: number;
  wanted: boolean;
  priority: Priority;
}

export interface Peer {
  address: string;
  clientName: string;
  clientIsChoked: boolean;
  clientIsInterested: boolean;
  flagStr: string;
  isDownloadingFrom: boolean;
  isEncrypted: boolean;
  isIncoming: boolean;
  isUploadingTo: boolean;
  isUTP: boolean;
  peerIsChoked: boolean;
  peerIsInterested: boolean;
  port: number;
  progress: number;
  rateToClient: number;
  rateToPeer: number;
}

/** 0 inactive, 1 waiting, 2 queued, 3 active */
export type TrackerState = 0 | 1 | 2 | 3;

export interface TrackerStat {
  announce: string;
  announceState: TrackerState;
  downloadCount: number;
  hasAnnounced: boolean;
  hasScraped: boolean;
  host: string;
  id: number;
  isBackup: boolean;
  lastAnnouncePeerCount: number;
  lastAnnounceResult: string;
  lastAnnounceStartTime: number;
  lastAnnounceSucceeded: boolean;
  lastAnnounceTime: number;
  lastAnnounceTimedOut: boolean;
  lastScrapeResult: string;
  lastScrapeSucceeded: boolean;
  lastScrapeTime: number;
  leecherCount: number;
  nextAnnounceTime: number;
  nextScrapeTime: number;
  scrape: string;
  seederCount: number;
  sitename?: string;
  tier: number;
}

/* --------------------------------------------------------------- torrent */

export interface Torrent {
  id: number;
  hashString: string;
  name: string;
  status: TorrentStatus;
  error: TorrentError;
  errorString: string;
  percentDone: number;
  metadataPercentComplete: number;
  recheckProgress: number;
  totalSize: number;
  sizeWhenDone: number;
  leftUntilDone: number;
  haveValid: number;
  rateDownload: number;
  rateUpload: number;
  /** seconds; -1 = not available, -2 = unknown */
  eta: number;
  uploadRatio: number;
  uploadedEver: number;
  downloadedEver: number;
  corruptEver: number;
  peersConnected: number;
  peersSendingToUs: number;
  peersGettingFromUs: number;
  webseedsSendingToUs: number;
  addedDate: number;
  doneDate: number;
  activityDate: number;
  startDate: number;
  dateCreated: number;
  queuePosition: number;
  labels: string[];
  downloadDir: string;
  isFinished: boolean;
  isStalled: boolean;
  isPrivate: boolean;
  trackers: Tracker[];
  trackerStats: TrackerStat[];
  comment: string;
  creator: string;
  magnetLink: string;
  pieceCount: number;
  pieceSize: number;
  /** base64-encoded bitfield */
  pieces: string;
  files: TorrentFile[];
  fileStats: FileStat[];
  peers: Peer[];
  secondsDownloading: number;
  secondsSeeding: number;
  bandwidthPriority: Priority;
  downloadLimit: number;
  downloadLimited: boolean;
  uploadLimit: number;
  uploadLimited: boolean;
  honorsSessionLimits: boolean;
}

export type TorrentField = keyof Torrent;

/** Every field the main table + sidebar needs. Fetched once on load. */
export const LIST_FIELDS = [
  'id',
  'hashString',
  'name',
  'status',
  'error',
  'errorString',
  'percentDone',
  'metadataPercentComplete',
  'recheckProgress',
  'totalSize',
  'sizeWhenDone',
  'leftUntilDone',
  'rateDownload',
  'rateUpload',
  'eta',
  'uploadRatio',
  'uploadedEver',
  'downloadedEver',
  'peersConnected',
  'peersSendingToUs',
  'peersGettingFromUs',
  'addedDate',
  'doneDate',
  'activityDate',
  'queuePosition',
  'labels',
  'downloadDir',
  'isFinished',
  'isStalled',
  'trackers',
] as const satisfies readonly TorrentField[];

export type ListField = (typeof LIST_FIELDS)[number];
export type TorrentRow = Pick<Torrent, ListField>;

/**
 * Fields that change while a torrent is running. Polled incrementally with
 * `ids: "recently-active"` to keep each tick's payload tiny.
 */
export const DYNAMIC_FIELDS = [
  'id',
  'status',
  'error',
  'errorString',
  'percentDone',
  'metadataPercentComplete',
  'recheckProgress',
  'sizeWhenDone',
  'leftUntilDone',
  'rateDownload',
  'rateUpload',
  'eta',
  'uploadRatio',
  'uploadedEver',
  'downloadedEver',
  'peersConnected',
  'peersSendingToUs',
  'peersGettingFromUs',
  'doneDate',
  'activityDate',
  'queuePosition',
  'labels',
  'downloadDir',
  'isFinished',
  'isStalled',
] as const satisfies readonly ListField[];

export type DynamicField = (typeof DYNAMIC_FIELDS)[number];

/** Extra fields fetched only for the torrent shown in the inspector. */
export const DETAIL_FIELDS = [
  'id',
  'name',
  'hashString',
  'comment',
  'creator',
  'dateCreated',
  'isPrivate',
  'magnetLink',
  'pieceCount',
  'pieceSize',
  'pieces',
  'files',
  'fileStats',
  'peers',
  'trackerStats',
  'corruptEver',
  'haveValid',
  'startDate',
  'secondsDownloading',
  'secondsSeeding',
  'webseedsSendingToUs',
  'bandwidthPriority',
  'downloadLimit',
  'downloadLimited',
  'uploadLimit',
  'uploadLimited',
  'honorsSessionLimits',
] as const satisfies readonly TorrentField[];

export type DetailField = (typeof DETAIL_FIELDS)[number];
export type TorrentDetail = Pick<Torrent, DetailField>;

/* --------------------------------------------------------------- session */

export interface SessionArguments {
  'alt-speed-down': number;
  'alt-speed-enabled': boolean;
  'alt-speed-up': number;
  'config-dir': string;
  'dht-enabled': boolean;
  'download-dir': string;
  'download-queue-enabled': boolean;
  'download-queue-size': number;
  encryption: Encryption;
  'idle-seeding-limit': number;
  'idle-seeding-limit-enabled': boolean;
  'incomplete-dir': string;
  'incomplete-dir-enabled': boolean;
  'lpd-enabled': boolean;
  'peer-limit-global': number;
  'peer-limit-per-torrent': number;
  'peer-port': number;
  'pex-enabled': boolean;
  'port-forwarding-enabled': boolean;
  'rename-partial-files': boolean;
  'rpc-version': number;
  'rpc-version-semver'?: string;
  seedRatioLimit: number;
  seedRatioLimited: boolean;
  'seed-queue-enabled': boolean;
  'seed-queue-size': number;
  'speed-limit-down': number;
  'speed-limit-down-enabled': boolean;
  'speed-limit-up': number;
  'speed-limit-up-enabled': boolean;
  'start-added-torrents': boolean;
  'utp-enabled': boolean;
  version: string;
}

/** Keys that `session-set` accepts (everything except read-only info). */
export type MutableSessionKey = Exclude<keyof SessionArguments, 'config-dir' | 'rpc-version' | 'rpc-version-semver' | 'version'>;
export type SessionSetArgs = Partial<Pick<SessionArguments, MutableSessionKey>>;

export interface StatsBlock {
  uploadedBytes: number;
  downloadedBytes: number;
  filesAdded: number;
  sessionCount: number;
  secondsActive: number;
}

export interface SessionStats {
  activeTorrentCount: number;
  downloadSpeed: number;
  pausedTorrentCount: number;
  torrentCount: number;
  uploadSpeed: number;
  'cumulative-stats': StatsBlock;
  'current-stats': StatsBlock;
}

export interface FreeSpace {
  path: string;
  'size-bytes': number;
  total_size?: number;
}

/* ---------------------------------------------------- request / response */

export type TorrentIds = number | string | ReadonlyArray<number | string> | 'recently-active';

export interface IdsArgs {
  ids?: TorrentIds;
}

export interface TorrentGetArgs {
  ids?: TorrentIds;
  fields: readonly TorrentField[];
  format?: 'objects';
}

export interface TorrentGetResult {
  torrents: Array<Partial<Torrent>>;
  removed?: number[];
}

export interface TorrentAddArgs {
  filename?: string;
  metainfo?: string;
  'download-dir'?: string;
  paused?: boolean;
  labels?: string[];
}

export interface AddedTorrent {
  id: number;
  name: string;
  hashString: string;
}

export interface TorrentAddResult {
  'torrent-added'?: AddedTorrent;
  'torrent-duplicate'?: AddedTorrent;
}

export interface TorrentSetArgs {
  ids: TorrentIds;
  labels?: string[];
  'files-wanted'?: number[];
  'files-unwanted'?: number[];
  'priority-high'?: number[];
  'priority-normal'?: number[];
  'priority-low'?: number[];
  bandwidthPriority?: Priority;
  downloadLimit?: number;
  downloadLimited?: boolean;
  uploadLimit?: number;
  uploadLimited?: boolean;
}

export interface TorrentRemoveArgs {
  ids: TorrentIds;
  'delete-local-data'?: boolean;
}

export interface TorrentSetLocationArgs {
  ids: TorrentIds;
  location: string;
  move: boolean;
}

export type EmptyResult = Record<string, never>;

/** Method name → argument/result types. Drives the generic `call()` signature. */
export interface RpcMethods {
  'torrent-get': { args: TorrentGetArgs; result: TorrentGetResult };
  'torrent-add': { args: TorrentAddArgs; result: TorrentAddResult };
  'torrent-set': { args: TorrentSetArgs; result: EmptyResult };
  'torrent-remove': { args: TorrentRemoveArgs; result: EmptyResult };
  'torrent-set-location': { args: TorrentSetLocationArgs; result: EmptyResult };
  'torrent-start': { args: IdsArgs; result: EmptyResult };
  'torrent-start-now': { args: IdsArgs; result: EmptyResult };
  'torrent-stop': { args: IdsArgs; result: EmptyResult };
  'torrent-verify': { args: IdsArgs; result: EmptyResult };
  'torrent-reannounce': { args: IdsArgs; result: EmptyResult };
  'queue-move-top': { args: IdsArgs; result: EmptyResult };
  'queue-move-up': { args: IdsArgs; result: EmptyResult };
  'queue-move-down': { args: IdsArgs; result: EmptyResult };
  'queue-move-bottom': { args: IdsArgs; result: EmptyResult };
  'session-get': { args: Record<string, never>; result: SessionArguments };
  'session-set': { args: SessionSetArgs; result: EmptyResult };
  'session-stats': { args: Record<string, never>; result: SessionStats };
  'free-space': { args: { path: string }; result: FreeSpace };
}

export type RpcMethod = keyof RpcMethods;
export type RpcArgs<M extends RpcMethod> = RpcMethods[M]['args'];
export type RpcResult<M extends RpcMethod> = RpcMethods[M]['result'];

export interface RpcRequest<M extends RpcMethod = RpcMethod> {
  method: M;
  arguments: RpcArgs<M>;
  tag?: number;
}

export interface RpcResponse<M extends RpcMethod = RpcMethod> {
  result: string;
  arguments: RpcResult<M>;
  tag?: number;
}

/** Anything that can deliver an RPC call: real HTTP or the in-browser mock. */
export interface RpcTransport {
  send<M extends RpcMethod>(method: M, args: RpcArgs<M>): Promise<RpcResult<M>>;
}
