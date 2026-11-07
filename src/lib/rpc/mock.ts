/**
 * In-browser fake Transmission daemon. Implements the same `RpcTransport`
 * interface as the real HTTP transport, keeps a live simulation (progress,
 * speeds, checking, queueing, magnet metadata) and honours speed limits and
 * turtle mode, so every part of the UI can be exercised without a backend.
 */
import {
  Priority,
  TorrentError,
  TorrentStatus,
  type FileStat,
  type Peer,
  type RpcArgs,
  type RpcMethod,
  type RpcResult,
  type RpcTransport,
  type SessionArguments,
  type SessionStats,
  type Torrent,
  type TorrentAddArgs,
  type TorrentAddResult,
  type TorrentField,
  type TorrentGetArgs,
  type TorrentGetResult,
  type TorrentIds,
  type TorrentSetArgs,
  type TrackerStat,
} from './types';
import { RpcError } from './client';

/* ------------------------------------------------------------- utilities */

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
const between = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);
const intBetween = (r: Rng, lo: number, hi: number) => Math.floor(between(r, lo, hi + 1));
const hex = (r: Rng, n: number) => Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join('');
const nowSec = () => Math.floor(Date.now() / 1000);

const GB = 1024 ** 3;
const MB = 1024 ** 2;
const KB = 1024;

/* ------------------------------------------------------------- catalogue */

interface Draft {
  name: string;
  files: Array<{ name: string; length: number }>;
  labels: string[];
  trackers: string[];
  comment: string;
  creator: string;
  isPrivate: boolean;
}

const OPENTRACKR = 'udp://tracker.opentrackr.org:1337/announce';
const OPENBT = 'udp://open.demonii.com:1337/announce';
const TORRUST = 'udp://tracker.torrust-demo.com:6969/announce';

const DISTROS: ReadonlyArray<{ fmt: (r: Rng) => string; size: [number, number]; tracker: string }> = [
  {
    fmt: (r) => `ubuntu-${pick(r, ['22.04.5', '24.04.2', '24.10', '25.04', '25.10'])}-${pick(r, ['desktop', 'live-server'])}-${pick(r, ['amd64', 'arm64'])}.iso`,
    size: [2.4 * GB, 6.1 * GB],
    tracker: 'https://torrent.ubuntu.com/announce',
  },
  {
    fmt: (r) => `debian-${pick(r, ['12.9.0', '12.10.0', '12.11.0', '13.0.0', '13.1.0'])}-${pick(r, ['amd64', 'arm64', 'i386'])}-${pick(r, ['netinst', 'DVD-1'])}.iso`,
    size: [0.6 * GB, 3.9 * GB],
    tracker: 'http://bttracker.debian.org:6969/announce',
  },
  {
    fmt: (r) => `Fedora-${pick(r, ['Workstation', 'Server', 'KDE', 'Silverblue'])}-Live-x86_64-${pick(r, ['40', '41', '42', '43'])}`,
    size: [2.1 * GB, 3.2 * GB],
    tracker: 'http://torrent.fedoraproject.org:6969/announce',
  },
  {
    fmt: (r) => `archlinux-2025.${String(intBetween(r, 1, 12)).padStart(2, '0')}.01-x86_64.iso`,
    size: [1.1 * GB, 1.3 * GB],
    tracker: OPENTRACKR,
  },
  {
    fmt: (r) => `linuxmint-${pick(r, ['21.3', '22', '22.1', '22.2'])}-${pick(r, ['cinnamon', 'mate', 'xfce'])}-64bit.iso`,
    size: [2.6 * GB, 3.0 * GB],
    tracker: OPENTRACKR,
  },
  {
    fmt: (r) => `kali-linux-2025.${intBetween(r, 1, 4)}-installer-${pick(r, ['amd64', 'arm64'])}.iso`,
    size: [3.8 * GB, 4.4 * GB],
    tracker: OPENTRACKR,
  },
  {
    fmt: (r) => `FreeBSD-${pick(r, ['13.5', '14.2', '14.3', '15.0'])}-RELEASE-amd64-${pick(r, ['dvd1', 'disc1', 'memstick'])}.iso`,
    size: [1.0 * GB, 4.6 * GB],
    tracker: OPENTRACKR,
  },
  {
    fmt: (r) => `Rocky-${pick(r, ['8.10', '9.5', '9.6', '10.0'])}-x86_64-${pick(r, ['dvd', 'minimal', 'boot'])}.iso`,
    size: [0.9 * GB, 10.2 * GB],
    tracker: OPENTRACKR,
  },
  {
    fmt: (r) => `proxmox-ve_${pick(r, ['8.3-1', '8.4-1', '9.0-1'])}.iso`,
    size: [1.3 * GB, 1.6 * GB],
    tracker: OPENTRACKR,
  },
  {
    fmt: (r) => `tails-amd64-${pick(r, ['6.14', '6.15', '6.16', '7.0'])}.img`,
    size: [1.4 * GB, 1.6 * GB],
    tracker: OPENTRACKR,
  },
];

const OPEN_MOVIES = [
  'Big Buck Bunny (2008)',
  'Sintel (2010)',
  'Tears of Steel (2012)',
  'Elephants Dream (2006)',
  'Cosmos Laundromat (2015)',
  'Spring (2019)',
  'Agent 327 Operation Barbershop (2017)',
  'Caminandes Llamigos (2016)',
  'Coffee Run (2020)',
  'Sprite Fright (2021)',
  'Charge (2022)',
  'Wing It! (2023)',
];

const PD_FILMS = [
  'Night of the Living Dead (1968)',
  'Charade (1963)',
  'His Girl Friday (1940)',
  'The General (1926)',
  'Nosferatu (1922)',
  'Metropolis (1927)',
  'Plan 9 from Outer Space (1957)',
  'The Little Shop of Horrors (1960)',
  'Detour (1945)',
  'The Kid (1921)',
];

const DATASETS: ReadonlyArray<{ name: string; parts: string; ext: string }> = [
  { name: 'COCO-2017-train-images', parts: 'train2017', ext: 'zip' },
  { name: 'LibriSpeech-ASR-corpus', parts: 'train-clean-360', ext: 'tar.gz' },
  { name: 'OpenStreetMap-planet', parts: 'planet', ext: 'osm.pbf' },
  { name: 'MS-MARCO-passage-ranking', parts: 'collection', ext: 'tsv.gz' },
  { name: 'Common-Voice-Corpus-en', parts: 'clips', ext: 'tar' },
  { name: 'NYC-TLC-Trip-Records', parts: 'yellow_tripdata', ext: 'parquet' },
  { name: 'arXiv-bulk-source', parts: 'src', ext: 'tar' },
  { name: 'Stanford-Cars', parts: 'cars_train', ext: 'tgz' },
];

const ARCHIVES = [
  () => `enwiki-2025${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}01-pages-articles-multistream.xml.bz2`,
  () => `wikipedia_en_all_maxi_2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}.zim`,
  () => `Project Gutenberg DVD (${2006 + Math.floor(Math.random() * 6)})`,
  () => `Prelinger Archives - Ephemeral Films Vol. ${Math.floor(Math.random() * 40) + 1}`,
  () => `NASA Apollo ${pick(Math.random, [11, 12, 13, 14, 15, 16, 17])} Flight Journal Audio`,
];

const MUSIC = [
  'Musopen - Chopin Complete Works [FLAC]',
  'Musopen - Beethoven Symphonies 1-9 [FLAC]',
  'Musopen - Bach Goldberg Variations (Kimiko Ishizaka) [FLAC]',
  'Free Music Archive - fma_large',
  'Kevin MacLeod - Complete Collection [MP3 320]',
];

function draftTorrent(r: Rng): Draft {
  const roll = r();
  if (roll < 0.42) {
    const d = pick(r, DISTROS);
    const name = d.fmt(r);
    const file = name.endsWith('.iso') || name.endsWith('.img') ? name : `${name}.iso`;
    return {
      name,
      files: [{ name: file, length: Math.floor(between(r, d.size[0], d.size[1])) }],
      labels: r() < 0.85 ? ['linux', 'iso'] : ['iso'],
      trackers: d.tracker === OPENTRACKR ? [OPENTRACKR, OPENBT] : [d.tracker],
      comment: 'Official release image',
      creator: 'mktorrent 1.1',
      isPrivate: false,
    };
  }
  if (roll < 0.62) {
    const pd = r() < 0.4;
    const title = pd ? pick(r, PD_FILMS) : pick(r, OPEN_MOVIES);
    const res = pick(r, ['720p', '1080p', '2160p']);
    const name = `${title} [${res}${pd ? ' Restored' : ' ' + pick(r, ['60fps', 'HDR', 'x265'])}]`;
    const main = res === '2160p' ? between(r, 6 * GB, 14 * GB) : res === '1080p' ? between(r, 1.4 * GB, 4 * GB) : between(r, 0.5 * GB, 1.2 * GB);
    const base = title.replace(/[^\w]+/g, '.').replace(/\.+$/, '');
    const files = [
      { name: `${name}/${base}.${res}.mkv`, length: Math.floor(main) },
      { name: `${name}/Subs/English.srt`, length: intBetween(r, 40 * KB, 90 * KB) },
      { name: `${name}/Subs/Deutsch.srt`, length: intBetween(r, 40 * KB, 90 * KB) },
      { name: `${name}/Subs/Español.srt`, length: intBetween(r, 40 * KB, 90 * KB) },
      { name: `${name}/Extras/Making Of.mp4`, length: Math.floor(main * between(r, 0.05, 0.2)) },
      { name: `${name}/poster.jpg`, length: intBetween(r, 200 * KB, 2 * MB) },
      { name: `${name}/README.txt`, length: intBetween(r, 1 * KB, 4 * KB) },
    ];
    return {
      name,
      files,
      labels: pd ? ['movies', 'public-domain'] : ['movies', 'creative-commons'],
      trackers: pd ? ['http://bt1.archive.org:6969/announce', 'http://bt2.archive.org:6969/announce'] : [OPENTRACKR, OPENBT, TORRUST],
      comment: pd ? 'Internet Archive public domain collection' : 'Blender Studio open movie — CC BY 4.0',
      creator: pd ? 'ia_make_torrent' : 'qBittorrent v5.0.4',
      isPrivate: false,
    };
  }
  if (roll < 0.78) {
    const ds = pick(r, DATASETS);
    const parts = intBetween(r, 4, 60);
    const date = `2025-${String(intBetween(r, 1, 12)).padStart(2, '0')}`;
    const name = `${ds.name}-${date}`;
    const files: Draft['files'] = [];
    for (let i = 0; i < parts; i++) {
      const split = parts > 20 ? (i % 3 === 0 ? 'val' : 'train') : 'data';
      files.push({ name: `${name}/${split}/${ds.parts}-${String(i).padStart(5, '0')}.${ds.ext}`, length: Math.floor(between(r, 200 * MB, 2.2 * GB)) });
    }
    files.push({ name: `${name}/LICENSE`, length: intBetween(r, 1 * KB, 12 * KB) });
    files.push({ name: `${name}/metadata/checksums.sha256`, length: intBetween(r, 2 * KB, 30 * KB) });
    return {
      name,
      files,
      labels: ['datasets', 'research'],
      trackers: ['https://academictorrents.com/announce.php', OPENTRACKR],
      comment: 'Distributed via Academic Torrents',
      creator: 'Academic Torrents',
      isPrivate: r() < 0.3,
    };
  }
  if (roll < 0.9) {
    const name = pick(r, ARCHIVES)();
    const single = name.includes('.');
    const files = single
      ? [{ name, length: Math.floor(between(r, 18 * GB, 110 * GB)) }]
      : Array.from({ length: intBetween(r, 8, 40) }, (_, i) => ({
          name: `${name}/${String(i + 1).padStart(3, '0')} - ${pick(r, ['Part', 'Reel', 'Disc', 'Volume'])} ${i + 1}.${pick(r, ['mp4', 'ogg', 'iso', 'mp3'])}`,
          length: Math.floor(between(r, 30 * MB, 1.6 * GB)),
        }));
    return {
      name,
      files,
      labels: ['archive'],
      trackers: ['http://bt1.archive.org:6969/announce', 'http://bt2.archive.org:6969/announce'],
      comment: 'Archive mirror',
      creator: 'ia_make_torrent',
      isPrivate: false,
    };
  }
  const name = pick(r, MUSIC);
  const discs = intBetween(r, 1, 4);
  const files: Draft['files'] = [];
  for (let d = 1; d <= discs; d++) {
    const tracks = intBetween(r, 8, 18);
    for (let t = 1; t <= tracks; t++) {
      files.push({ name: `${name}/CD${d}/${String(t).padStart(2, '0')} - Track ${t}.flac`, length: Math.floor(between(r, 18 * MB, 60 * MB)) });
    }
    files.push({ name: `${name}/CD${d}/cover.jpg`, length: intBetween(r, 300 * KB, 3 * MB) });
  }
  return {
    name,
    files,
    labels: ['music'],
    trackers: [OPENTRACKR, TORRUST],
    comment: 'Public domain / CC licensed recordings',
    creator: 'Transmission/4.0.6',
    isPrivate: false,
  };
}

/* ------------------------------------------------------------ simulation */

interface Sim {
  baseDown: number;
  baseUp: number;
  swarmSeeds: number;
  swarmLeechers: number;
  changedAt: number;
  resume: TorrentStatus;
  checkEnd: number;
  /** total size the torrent will have once magnet metadata arrives */
  pendingFiles: Draft['files'] | null;
  peers: Peer[] | null;
  seed: number;
  stalledUntil: number;
}

interface Entry {
  t: Torrent;
  sim: Sim;
}

const CLIENTS = [
  'qBittorrent 5.1.0',
  'qBittorrent 4.6.7',
  'Transmission 4.0.6',
  'Transmission 3.00',
  'Deluge 2.1.1',
  'libtorrent (Rasterbar) 2.0.11',
  'µTorrent 3.6.0',
  'BiglyBT 3.8.0.2',
  'rTorrent 0.10.0',
  'Tixati 3.33',
  'aria2/1.37.0',
];

const ERRORS: ReadonlyArray<[TorrentError, string]> = [
  [TorrentError.TrackerWarning, 'Tracker gave a warning: unregistered torrent'],
  [TorrentError.TrackerError, 'Tracker gave HTTP response code 404 (Not Found)'],
  [TorrentError.TrackerError, 'Connection failed: timed out'],
  [TorrentError.LocalError, 'No data found! Ensure your drives are connected or use "Set Location".'],
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function sumWanted(files: Torrent['files'], stats: FileStat[]): number {
  let s = 0;
  for (let i = 0; i < files.length; i++) if (stats[i]?.wanted) s += files[i]!.length;
  return s;
}

export class MockTransport implements RpcTransport {
  private readonly entries = new Map<number, Entry>();
  private removedLog: Array<{ id: number; at: number }> = [];
  private nextId = 1;
  private lastTick = Date.now();
  private readonly startedAt = Date.now();
  private readonly session: SessionArguments;
  private cumulativeUp = 4.82e12;
  private cumulativeDown = 3.17e12;
  private sessionUp = 0;
  private sessionDown = 0;
  private readonly rng: Rng;

  constructor(count = 240, seed = 1337) {
    this.rng = mulberry32(seed);
    this.session = {
      'alt-speed-down': 500,
      'alt-speed-enabled': false,
      'alt-speed-up': 100,
      'config-dir': '/config',
      'dht-enabled': true,
      'download-dir': '/downloads/complete',
      'download-queue-enabled': true,
      'download-queue-size': 5,
      encryption: 'preferred',
      'idle-seeding-limit': 30,
      'idle-seeding-limit-enabled': false,
      'incomplete-dir': '/downloads/incomplete',
      'incomplete-dir-enabled': true,
      'lpd-enabled': false,
      'peer-limit-global': 500,
      'peer-limit-per-torrent': 60,
      'peer-port': 51413,
      'pex-enabled': true,
      'port-forwarding-enabled': true,
      'rename-partial-files': true,
      'rpc-version': 17,
      'rpc-version-semver': '5.3.0',
      seedRatioLimit: 2,
      seedRatioLimited: false,
      'seed-queue-enabled': false,
      'seed-queue-size': 10,
      'speed-limit-down': 50_000,
      'speed-limit-down-enabled': false,
      'speed-limit-up': 5_000,
      'speed-limit-up-enabled': false,
      'start-added-torrents': true,
      'utp-enabled': true,
      version: '4.0.6 (demo)',
    };
    for (let i = 0; i < count; i++) this.create(draftTorrent(this.rng), 'random');
  }

  /* ---------------------------------------------------------- creation */

  private create(d: Draft, mode: 'random' | 'added', opts: { paused?: boolean; dir?: string; magnet?: boolean; hash?: string } = {}): Entry {
    const r = this.rng;
    const id = this.nextId++;
    const now = nowSec();
    const totalSize = d.files.reduce((a, f) => a + f.length, 0);
    const pieceSize = [256 * KB, 512 * KB, 1 * MB, 2 * MB, 4 * MB, 8 * MB, 16 * MB].find((ps) => totalSize / ps <= 4000) ?? 16 * MB;
    const swarm = Math.pow(r(), 2.4);

    const t: Torrent = {
      id,
      hashString: opts.hash ?? hex(r, 40),
      name: d.name,
      status: TorrentStatus.Stopped,
      error: TorrentError.None,
      errorString: '',
      percentDone: 0,
      metadataPercentComplete: 1,
      recheckProgress: 0,
      totalSize,
      sizeWhenDone: totalSize,
      leftUntilDone: totalSize,
      haveValid: 0,
      rateDownload: 0,
      rateUpload: 0,
      eta: -1,
      uploadRatio: 0,
      uploadedEver: 0,
      downloadedEver: 0,
      corruptEver: 0,
      peersConnected: 0,
      peersSendingToUs: 0,
      peersGettingFromUs: 0,
      webseedsSendingToUs: 0,
      addedDate: now,
      doneDate: 0,
      activityDate: now,
      startDate: now,
      dateCreated: now - intBetween(r, 86_400, 86_400 * 400),
      queuePosition: this.entries.size,
      labels: [...d.labels],
      downloadDir: opts.dir ?? this.session['download-dir'],
      isFinished: false,
      isStalled: false,
      isPrivate: d.isPrivate,
      trackers: d.trackers.map((announce, i) => ({ announce, id: i, scrape: announce.replace('announce', 'scrape'), tier: i, sitename: hostOf(announce).split('.').slice(-2, -1)[0] ?? '' })),
      trackerStats: [],
      comment: d.comment,
      creator: d.creator,
      magnetLink: '',
      pieceCount: Math.max(1, Math.ceil(totalSize / pieceSize)),
      pieceSize,
      pieces: '',
      files: d.files.map((f) => ({ name: f.name, length: f.length, bytesCompleted: 0 })),
      fileStats: d.files.map(() => ({ bytesCompleted: 0, wanted: true, priority: Priority.Normal })),
      peers: [],
      secondsDownloading: 0,
      secondsSeeding: 0,
      bandwidthPriority: Priority.Normal,
      downloadLimit: 1000,
      downloadLimited: false,
      uploadLimit: 1000,
      uploadLimited: false,
      honorsSessionLimits: true,
    };
    t.magnetLink = `magnet:?xt=urn:btih:${t.hashString}&dn=${encodeURIComponent(t.name)}${t.trackers.map((x) => `&tr=${encodeURIComponent(x.announce)}`).join('')}`;

    const sim: Sim = {
      baseDown: between(r, 0.2, 1) * Math.pow(r(), 2.2) * 9 * MB + 25 * KB,
      baseUp: r() < 0.3 ? between(r, 10 * KB, 1.2 * MB) * Math.pow(r(), 1.8) : 0,
      swarmSeeds: Math.floor(swarm * 2400) + intBetween(r, 0, 6),
      swarmLeechers: Math.floor(swarm * 900) + intBetween(r, 0, 4),
      changedAt: Date.now(),
      resume: TorrentStatus.Stopped,
      checkEnd: 0,
      pendingFiles: null,
      peers: null,
      seed: Math.floor(r() * 2 ** 31),
      stalledUntil: 0,
    };

    const entry: Entry = { t, sim };
    this.entries.set(id, entry);

    if (mode === 'added') {
      if (opts.magnet) {
        sim.pendingFiles = d.files;
        t.metadataPercentComplete = 0;
        t.totalSize = t.sizeWhenDone = t.leftUntilDone = 0;
        t.files = [];
        t.fileStats = [];
        t.pieceCount = 0;
      }
      t.status = opts.paused ? TorrentStatus.Stopped : TorrentStatus.Download;
      return entry;
    }

    // Random historical state for the initial catalogue.
    const age = Math.pow(r(), 0.6) * 86_400 * 540;
    t.addedDate = now - Math.floor(age);
    t.activityDate = t.addedDate + Math.floor(age * r());
    t.startDate = now - intBetween(r, 600, 86_400 * 6);
    const s = r();
    if (s < 0.17) this.makePartial(entry, between(r, 0.01, 0.97), TorrentStatus.Download);
    else if (s < 0.6) this.makeDone(entry, TorrentStatus.Seed);
    else if (s < 0.73) this.makeDone(entry, TorrentStatus.Stopped);
    else if (s < 0.79) this.makePartial(entry, between(r, 0, 0.8), TorrentStatus.Stopped);
    else if (s < 0.85) this.makePartial(entry, between(r, 0, 0.3), TorrentStatus.DownloadWait);
    else if (s < 0.88) this.makeDone(entry, TorrentStatus.SeedWait);
    else if (s < 0.9) {
      this.makeDone(entry, TorrentStatus.Seed);
      this.beginVerify(entry);
      t.status = TorrentStatus.Check;
      t.recheckProgress = r() * 0.8;
    } else if (s < 0.95) {
      this.makeDone(entry, TorrentStatus.Seed);
      t.uploadedEver = Math.floor(t.sizeWhenDone * between(r, 2, 14));
      t.uploadRatio = t.uploadedEver / Math.max(1, t.downloadedEver);
      t.isFinished = r() < 0.5;
      if (t.isFinished) t.status = TorrentStatus.Stopped;
    } else {
      const [code, msg] = pick(r, ERRORS);
      if (r() < 0.5) this.makePartial(entry, between(r, 0.05, 0.9), TorrentStatus.Download);
      else this.makeDone(entry, code === TorrentError.LocalError ? TorrentStatus.Stopped : TorrentStatus.Seed);
      t.error = code;
      t.errorString = msg;
    }
    // Make some files unwanted / high priority in multi-file torrents.
    if (t.files.length > 3 && r() < 0.3) {
      t.fileStats.forEach((fs, i) => {
        if (i % 4 === 3) fs.wanted = false;
        if (i === 0) fs.priority = Priority.High;
      });
      const wanted = sumWanted(t.files, t.fileStats);
      const ratio = wanted / Math.max(1, t.sizeWhenDone);
      t.sizeWhenDone = wanted;
      t.leftUntilDone = Math.floor(t.leftUntilDone * ratio);
      t.haveValid = t.sizeWhenDone - t.leftUntilDone;
      t.percentDone = t.sizeWhenDone ? t.haveValid / t.sizeWhenDone : 1;
    }
    return entry;
  }

  private makePartial(e: Entry, pct: number, status: TorrentStatus) {
    const t = e.t;
    t.haveValid = Math.floor(t.sizeWhenDone * pct);
    t.leftUntilDone = t.sizeWhenDone - t.haveValid;
    t.percentDone = pct;
    t.downloadedEver = Math.floor(t.haveValid * between(this.rng, 1, 1.05));
    t.uploadedEver = Math.floor(t.downloadedEver * between(this.rng, 0, 0.6));
    t.uploadRatio = t.downloadedEver ? t.uploadedEver / t.downloadedEver : 0;
    t.status = status;
    t.secondsDownloading = intBetween(this.rng, 60, 86_400 * 3);
    if (status === TorrentStatus.Download && this.rng() < 0.15) e.sim.stalledUntil = Infinity;
  }

  private makeDone(e: Entry, status: TorrentStatus) {
    const t = e.t;
    t.haveValid = t.sizeWhenDone;
    t.leftUntilDone = 0;
    t.percentDone = 1;
    t.downloadedEver = Math.floor(t.sizeWhenDone * between(this.rng, 1, 1.03));
    t.uploadedEver = Math.floor(t.sizeWhenDone * Math.pow(this.rng(), 1.8) * 6);
    t.uploadRatio = t.uploadedEver / Math.max(1, t.downloadedEver);
    t.doneDate = t.addedDate + intBetween(this.rng, 120, 86_400);
    t.status = status;
    t.secondsDownloading = intBetween(this.rng, 60, 86_400);
    t.secondsSeeding = intBetween(this.rng, 600, 86_400 * 200);
  }

  private beginVerify(e: Entry) {
    const t = e.t;
    e.sim.resume = t.status === TorrentStatus.Stopped ? TorrentStatus.Stopped : t.leftUntilDone > 0 ? TorrentStatus.Download : TorrentStatus.Seed;
    t.status = TorrentStatus.CheckWait;
    t.recheckProgress = 0;
    t.rateDownload = t.rateUpload = 0;
    e.sim.changedAt = Date.now();
  }

  /* ------------------------------------------------------------- tick */

  private tick() {
    const nowMs = Date.now();
    const dt = Math.min(5, (nowMs - this.lastTick) / 1000);
    if (dt < 0.05) return;
    this.lastTick = nowMs;
    const now = Math.floor(nowMs / 1000);
    const r = this.rng;
    const jitter = () => 0.55 + r() * 0.9;

    let checking = false;
    for (const { t } of this.entries.values()) if (t.status === TorrentStatus.Check) checking = true;

    // First pass: desired rates.
    let wantDown = 0;
    let wantUp = 0;
    for (const e of this.entries.values()) {
      const { t, sim } = e;
      const prevStatus = t.status;
      const prevDown = t.rateDownload;
      const prevUp = t.rateUpload;

      if (t.status === TorrentStatus.CheckWait && !checking) {
        t.status = TorrentStatus.Check;
        checking = true;
      }
      if (t.status === TorrentStatus.Check) {
        t.recheckProgress = Math.min(1, t.recheckProgress + (dt * 180 * MB) / Math.max(1, t.totalSize));
        if (t.recheckProgress >= 1) {
          t.recheckProgress = 0;
          t.status = sim.resume;
          checking = false;
        }
      }

      const stalled = sim.stalledUntil > nowMs;
      let down = 0;
      let up = 0;
      if (t.status === TorrentStatus.Download && t.error !== TorrentError.LocalError) {
        if (t.metadataPercentComplete < 1) {
          t.metadataPercentComplete = Math.min(1, t.metadataPercentComplete + dt * between(r, 0.08, 0.3));
          if (t.metadataPercentComplete >= 1 && sim.pendingFiles) this.applyMetadata(e);
        } else if (!stalled) {
          down = t.rateDownload * 0.6 + sim.baseDown * jitter() * 0.4;
          if (r() < 0.004) sim.stalledUntil = nowMs + 8000 + r() * 20_000;
        }
        up = sim.baseUp * 0.3 * jitter() * (t.percentDone > 0.02 ? 1 : 0);
      } else if (t.status === TorrentStatus.Seed && t.error !== TorrentError.LocalError) {
        if (sim.baseUp > 0) up = t.rateUpload * 0.5 + sim.baseUp * jitter() * 0.5;
        else if (r() < 0.002) sim.baseUp = between(r, 20 * KB, 900 * KB);
        else if (r() < 0.01) sim.baseUp = 0;
      }
      t.rateDownload = down;
      t.rateUpload = up;
      wantDown += down;
      wantUp += up;

      if (prevStatus !== t.status || prevDown !== down || prevUp !== up || t.status === TorrentStatus.Check) sim.changedAt = nowMs;
    }

    // Global caps (turtle mode / speed limits, in kB/s).
    const s = this.session;
    const capDown = s['alt-speed-enabled'] ? s['alt-speed-down'] * 1000 : s['speed-limit-down-enabled'] ? s['speed-limit-down'] * 1000 : Infinity;
    const capUp = s['alt-speed-enabled'] ? s['alt-speed-up'] * 1000 : s['speed-limit-up-enabled'] ? s['speed-limit-up'] * 1000 : Infinity;
    const kDown = wantDown > capDown ? capDown / wantDown : 1;
    const kUp = wantUp > capUp ? capUp / wantUp : 1;

    // Second pass: apply transfer.
    for (const e of this.entries.values()) {
      const { t, sim } = e;
      t.rateDownload = Math.floor(t.rateDownload * kDown);
      t.rateUpload = Math.floor(t.rateUpload * kUp);

      if (t.rateDownload > 0) {
        const got = Math.min(t.leftUntilDone, t.rateDownload * dt);
        t.leftUntilDone -= got;
        t.haveValid += got;
        t.downloadedEver += got;
        this.sessionDown += got;
        t.percentDone = t.sizeWhenDone ? t.haveValid / t.sizeWhenDone : 1;
        t.eta = Math.round(t.leftUntilDone / t.rateDownload);
        t.secondsDownloading += dt;
        if (t.leftUntilDone <= 0) {
          t.leftUntilDone = 0;
          t.percentDone = 1;
          t.status = TorrentStatus.Seed;
          t.doneDate = now;
          t.rateDownload = 0;
          t.eta = -1;
          sim.baseUp = sim.baseUp || between(r, 50 * KB, 1.5 * MB);
        }
      } else if (t.status === TorrentStatus.Download) {
        t.eta = t.metadataPercentComplete < 1 ? -2 : -1;
      } else {
        t.eta = -1;
      }
      if (t.rateUpload > 0) {
        const sent = t.rateUpload * dt;
        t.uploadedEver += sent;
        this.sessionUp += sent;
      }
      if (t.status === TorrentStatus.Seed) t.secondsSeeding += dt;
      t.uploadRatio = t.downloadedEver > 0 ? t.uploadedEver / t.downloadedEver : t.uploadedEver > 0 ? -2 : -1;

      const active = t.status === TorrentStatus.Download || t.status === TorrentStatus.Seed;
      if (active && t.error !== TorrentError.LocalError) {
        const target = Math.min(this.session['peer-limit-per-torrent'], Math.floor((sim.swarmSeeds + sim.swarmLeechers) * 0.08) + 1);
        t.peersConnected = Math.max(0, Math.min(target, t.peersConnected + intBetween(r, -2, 2) + (t.peersConnected < target / 2 ? 2 : 0)));
        t.peersSendingToUs = t.rateDownload > 0 ? Math.max(1, Math.round(t.peersConnected * between(r, 0.3, 0.7))) : 0;
        t.peersGettingFromUs = t.rateUpload > 0 ? Math.max(1, Math.round(t.peersConnected * between(r, 0.05, 0.3))) : 0;
      } else {
        t.peersConnected = t.peersSendingToUs = t.peersGettingFromUs = 0;
      }
      t.isStalled = t.status === TorrentStatus.Download && t.rateDownload === 0 && t.metadataPercentComplete >= 1;
      if (t.rateDownload > 0 || t.rateUpload > 0) t.activityDate = now;
    }

    this.removedLog = this.removedLog.filter((x) => nowMs - x.at < 60_000);
  }

  private applyMetadata(e: Entry) {
    const { t, sim } = e;
    const files = sim.pendingFiles ?? [];
    sim.pendingFiles = null;
    t.files = files.map((f) => ({ name: f.name, length: f.length, bytesCompleted: 0 }));
    t.fileStats = files.map(() => ({ bytesCompleted: 0, wanted: true, priority: Priority.Normal }));
    t.totalSize = t.sizeWhenDone = t.leftUntilDone = files.reduce((a, f) => a + f.length, 0);
    t.pieceCount = Math.max(1, Math.ceil(t.totalSize / t.pieceSize));
  }

  /* ---------------------------------------------------------- output */

  private resolveIds(ids: TorrentIds | undefined): Entry[] {
    if (ids === undefined) return [...this.entries.values()];
    if (ids === 'recently-active') {
      const cutoff = Date.now() - 60_000;
      return [...this.entries.values()].filter((e) => e.sim.changedAt >= cutoff);
    }
    const list = Array.isArray(ids) ? ids : [ids];
    const out: Entry[] = [];
    for (const raw of list) {
      if (typeof raw === 'number') {
        const e = this.entries.get(raw);
        if (e) out.push(e);
      } else {
        for (const e of this.entries.values()) if (e.t.hashString === raw) out.push(e);
      }
    }
    return out;
  }

  private fileProgress(t: Torrent): { files: Torrent['files']; stats: FileStat[] } {
    // Distribute haveValid across wanted files in order (prioritising "high").
    let budget = t.haveValid;
    const done = new Array<number>(t.files.length).fill(0);
    const order = t.files.map((_, i) => i).sort((a, b) => (t.fileStats[b]?.priority ?? 0) - (t.fileStats[a]?.priority ?? 0));
    for (const i of order) {
      if (!t.fileStats[i]?.wanted) continue;
      const take = Math.min(budget, t.files[i]!.length);
      done[i] = take;
      budget -= take;
    }
    return {
      files: t.files.map((f, i) => ({ name: f.name, length: f.length, bytesCompleted: Math.floor(done[i] ?? 0) })),
      stats: t.fileStats.map((s, i) => ({ ...s, bytesCompleted: Math.floor(done[i] ?? 0) })),
    };
  }

  private pieces(e: Entry): string {
    const t = e.t;
    const n = t.pieceCount;
    const bytes = new Uint8Array(Math.ceil(n / 8));
    const r = mulberry32(e.sim.seed);
    const p = t.percentDone;
    for (let i = 0; i < n; i++) {
      // Mostly-sequential with some rarest-first scatter.
      const seq = i / n < p * 0.85;
      const has = p >= 1 || seq || r() < p * 0.6;
      if (has) bytes[i >> 3]! |= 0x80 >> (i & 7);
    }
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  private peers(e: Entry): Peer[] {
    const { t, sim } = e;
    const r = mulberry32(sim.seed ^ 0x9e3779b9);
    if (!sim.peers || sim.peers.length !== t.peersConnected) {
      sim.peers = Array.from({ length: t.peersConnected }, () => {
        const ip = r() < 0.18
          ? `2a0${intBetween(r, 1, 9)}:${hex(r, 4)}:${hex(r, 4)}::${hex(r, 3)}`
          : `${intBetween(r, 24, 223)}.${intBetween(r, 0, 255)}.${intBetween(r, 0, 255)}.${intBetween(r, 1, 254)}`;
        const utp = r() < 0.6;
        const enc = r() < 0.7;
        const incoming = r() < 0.4;
        return {
          address: ip,
          clientName: pick(r, CLIENTS),
          clientIsChoked: r() < 0.5,
          clientIsInterested: r() < 0.6,
          flagStr: '',
          isDownloadingFrom: false,
          isEncrypted: enc,
          isIncoming: incoming,
          isUploadingTo: false,
          isUTP: utp,
          peerIsChoked: r() < 0.4,
          peerIsInterested: r() < 0.6,
          port: intBetween(r, 1024, 65535),
          progress: r() < 0.6 ? 1 : r(),
          rateToClient: 0,
          rateToPeer: 0,
        } satisfies Peer;
      });
    }
    const peers = sim.peers;
    const dlIdx = peers.map((_, i) => i).filter((i) => (peers[i]!.progress > t.percentDone || peers[i]!.progress === 1)).slice(0, t.peersSendingToUs);
    const ulIdx = peers.map((_, i) => i).filter((i) => peers[i]!.progress < 1).slice(0, t.peersGettingFromUs);
    const rr = this.rng;
    const wD = dlIdx.map(() => rr() ** 2 + 0.05);
    const wU = ulIdx.map(() => rr() ** 2 + 0.05);
    const sD = wD.reduce((a, b) => a + b, 0) || 1;
    const sU = wU.reduce((a, b) => a + b, 0) || 1;
    for (const p of peers) {
      p.rateToClient = 0;
      p.rateToPeer = 0;
      p.isDownloadingFrom = false;
      p.isUploadingTo = false;
    }
    dlIdx.forEach((i, k) => {
      const p = peers[i]!;
      p.rateToClient = Math.floor((t.rateDownload * wD[k]!) / sD);
      p.isDownloadingFrom = true;
      p.clientIsChoked = false;
    });
    ulIdx.forEach((i, k) => {
      const p = peers[i]!;
      p.rateToPeer = Math.floor((t.rateUpload * wU[k]!) / sU);
      p.isUploadingTo = true;
      p.peerIsChoked = false;
      if (p.progress < 1) p.progress = Math.min(0.999, p.progress + 0.001);
    });
    for (const p of peers) {
      let f = '';
      if (p.isDownloadingFrom) f += 'D';
      else if (p.clientIsInterested) f += 'd';
      if (p.isUploadingTo) f += 'U';
      else if (p.peerIsInterested) f += 'u';
      if (!p.clientIsChoked && !p.clientIsInterested) f += 'K';
      if (!p.peerIsChoked && !p.peerIsInterested) f += '?';
      if (p.isEncrypted) f += 'E';
      if (p.isIncoming) f += 'I';
      if (p.isUTP) f += 'T';
      p.flagStr = f;
    }
    return peers.map((p) => ({ ...p }));
  }

  private trackerStats(e: Entry): TrackerStat[] {
    const { t, sim } = e;
    const now = nowSec();
    const r = mulberry32(sim.seed + 7);
    return t.trackers.map((tr, i) => {
      const failing = i === 0 && (t.error === TorrentError.TrackerError || t.error === TorrentError.TrackerWarning);
      const last = now - intBetween(r, 30, 1700);
      return {
        announce: tr.announce,
        announceState: t.status === TorrentStatus.Stopped ? 0 : 1,
        downloadCount: Math.floor(sim.swarmSeeds * between(r, 2, 9)),
        hasAnnounced: t.status !== TorrentStatus.Stopped,
        hasScraped: true,
        host: `${new URL(tr.announce.replace(/^udp:/, 'http:')).host}`,
        id: tr.id,
        isBackup: false,
        lastAnnouncePeerCount: Math.min(50, sim.swarmSeeds + sim.swarmLeechers),
        lastAnnounceResult: failing ? t.errorString : 'Success',
        lastAnnounceStartTime: last - 1,
        lastAnnounceSucceeded: !failing,
        lastAnnounceTime: last,
        lastAnnounceTimedOut: failing && t.errorString.includes('timed out'),
        lastScrapeResult: failing ? t.errorString : '',
        lastScrapeSucceeded: !failing,
        lastScrapeTime: last,
        leecherCount: failing ? -1 : Math.max(0, sim.swarmLeechers + intBetween(r, -3, 3)),
        nextAnnounceTime: t.status === TorrentStatus.Stopped ? 0 : now + intBetween(r, 60, 1800),
        nextScrapeTime: now + intBetween(r, 60, 1800),
        scrape: tr.scrape,
        seederCount: failing ? -1 : Math.max(0, sim.swarmSeeds + intBetween(r, -5, 5)),
        sitename: tr.sitename,
        tier: tr.tier,
      };
    });
  }

  private project(e: Entry, fields: readonly TorrentField[]): Partial<Torrent> {
    const t = e.t;
    const out: Partial<Record<TorrentField, unknown>> = {};
    let fp: ReturnType<MockTransport['fileProgress']> | null = null;
    for (const f of fields) {
      switch (f) {
        case 'files':
          fp ??= this.fileProgress(t);
          out.files = fp.files;
          break;
        case 'fileStats':
          fp ??= this.fileProgress(t);
          out.fileStats = fp.stats;
          break;
        case 'peers':
          out.peers = this.peers(e);
          break;
        case 'trackerStats':
          out.trackerStats = this.trackerStats(e);
          break;
        case 'pieces':
          out.pieces = this.pieces(e);
          break;
        case 'labels':
          out.labels = [...t.labels];
          break;
        case 'trackers':
          out.trackers = t.trackers.map((x) => ({ ...x }));
          break;
        default:
          out[f] = t[f];
      }
    }
    return out as Partial<Torrent>;
  }

  /* ----------------------------------------------------------- methods */

  private torrentGet(args: TorrentGetArgs): TorrentGetResult {
    const list = this.resolveIds(args.ids);
    const res: TorrentGetResult = { torrents: list.map((e) => this.project(e, args.fields)) };
    if (args.ids === 'recently-active') res.removed = this.removedLog.map((x) => x.id);
    return res;
  }

  private stats(): SessionStats {
    let down = 0;
    let up = 0;
    let active = 0;
    let paused = 0;
    for (const { t } of this.entries.values()) {
      down += t.rateDownload;
      up += t.rateUpload;
      if (t.rateDownload > 0 || t.rateUpload > 0) active++;
      if (t.status === TorrentStatus.Stopped) paused++;
    }
    const secs = Math.floor((Date.now() - this.startedAt) / 1000);
    return {
      activeTorrentCount: active,
      downloadSpeed: down,
      uploadSpeed: up,
      pausedTorrentCount: paused,
      torrentCount: this.entries.size,
      'cumulative-stats': {
        downloadedBytes: Math.floor(this.cumulativeDown + this.sessionDown),
        uploadedBytes: Math.floor(this.cumulativeUp + this.sessionUp),
        filesAdded: 18_204 + this.nextId,
        sessionCount: 87,
        secondsActive: 41_212_000 + secs,
      },
      'current-stats': {
        downloadedBytes: Math.floor(this.sessionDown),
        uploadedBytes: Math.floor(this.sessionUp),
        filesAdded: this.nextId,
        sessionCount: 1,
        secondsActive: secs,
      },
    };
  }

  private freeSpace(path: string) {
    let used = 0;
    for (const { t } of this.entries.values()) used += t.haveValid;
    used = used * 0.35 + 1.1e12;
    const total = Math.max(8e12, used * 1.4);
    return { path, 'size-bytes': Math.floor(total - used), total_size: Math.floor(total) };
  }

  private add(args: TorrentAddArgs): TorrentAddResult {
    let name = 'New torrent';
    let hash: string | undefined;
    let magnet = false;
    if (args.metainfo) {
      try {
        const raw = atob(args.metainfo);
        const m = /4:name(\d+):/.exec(raw);
        if (m) {
          const start = m.index + m[0].length;
          const bytes = Uint8Array.from(raw.slice(start, start + Number(m[1])), (c) => c.charCodeAt(0));
          name = new TextDecoder().decode(bytes);
        }
      } catch {
        throw new RpcError('rpc', 'invalid or corrupt torrent file');
      }
    } else if (args.filename) {
      const f = args.filename.trim();
      if (f.startsWith('magnet:')) {
        magnet = true;
        const q = new URLSearchParams(f.slice(f.indexOf('?') + 1));
        name = q.get('dn') ?? 'Magnet download';
        const xt = q.get('xt') ?? '';
        hash = xt.split(':').pop()?.toLowerCase();
      } else {
        name = decodeURIComponent(f.split('/').pop() ?? f).replace(/\.torrent$/i, '');
      }
    } else {
      throw new RpcError('rpc', 'no filename or metainfo specified');
    }
    for (const { t } of this.entries.values()) {
      if ((hash && t.hashString === hash) || t.name === name) {
        return { 'torrent-duplicate': { id: t.id, name: t.name, hashString: t.hashString } };
      }
    }
    const d = draftTorrent(this.rng);
    const files = d.files.length === 1 ? [{ name, length: d.files[0]!.length }] : d.files.map((f) => ({ ...f, name: name + f.name.slice(f.name.indexOf('/')) }));
    const e = this.create(
      { ...d, name, files, labels: args.labels ?? [] },
      'added',
      { paused: args.paused ?? !this.session['start-added-torrents'], dir: args['download-dir'], magnet, hash },
    );
    e.sim.baseDown = between(this.rng, 2 * MB, 30 * MB);
    return { 'torrent-added': { id: e.t.id, name: e.t.name, hashString: e.t.hashString } };
  }

  private torrentSet(args: TorrentSetArgs) {
    for (const e of this.resolveIds(args.ids)) {
      const t = e.t;
      if (args.labels) t.labels = [...args.labels];
      const setFiles = (idx: number[] | undefined, fn: (s: FileStat) => void) => idx?.forEach((i) => t.fileStats[i] && fn(t.fileStats[i]));
      setFiles(args['files-wanted'], (s) => (s.wanted = true));
      setFiles(args['files-unwanted'], (s) => (s.wanted = false));
      setFiles(args['priority-high'], (s) => (s.priority = Priority.High));
      setFiles(args['priority-normal'], (s) => (s.priority = Priority.Normal));
      setFiles(args['priority-low'], (s) => (s.priority = Priority.Low));
      if (args['files-wanted'] || args['files-unwanted']) {
        const { files } = this.fileProgress(t);
        t.sizeWhenDone = sumWanted(t.files, t.fileStats);
        const have = files.reduce((a, f, i) => a + (t.fileStats[i]?.wanted ? f.bytesCompleted : 0), 0);
        t.haveValid = Math.min(have, t.sizeWhenDone);
        t.leftUntilDone = t.sizeWhenDone - t.haveValid;
        t.percentDone = t.sizeWhenDone ? t.haveValid / t.sizeWhenDone : 1;
        if (t.leftUntilDone > 0 && t.status === TorrentStatus.Seed) t.status = TorrentStatus.Download;
        if (t.leftUntilDone === 0 && t.status === TorrentStatus.Download) t.status = TorrentStatus.Seed;
      }
      if (args.bandwidthPriority !== undefined) t.bandwidthPriority = args.bandwidthPriority;
      e.sim.changedAt = Date.now();
    }
    return {};
  }

  private setStatus(ids: TorrentIds | undefined, fn: (e: Entry) => void) {
    for (const e of this.resolveIds(ids)) {
      fn(e);
      e.sim.changedAt = Date.now();
    }
    return {};
  }

  private queueMove(ids: TorrentIds | undefined, where: 'top' | 'up' | 'down' | 'bottom') {
    const order = [...this.entries.values()].sort((a, b) => a.t.queuePosition - b.t.queuePosition);
    const moving = new Set(this.resolveIds(ids).map((e) => e.t.id));
    let next: Entry[];
    if (where === 'top' || where === 'bottom') {
      const sel = order.filter((e) => moving.has(e.t.id));
      const rest = order.filter((e) => !moving.has(e.t.id));
      next = where === 'top' ? [...sel, ...rest] : [...rest, ...sel];
    } else {
      next = [...order];
      const idxs = next.map((e, i) => (moving.has(e.t.id) ? i : -1)).filter((i) => i >= 0);
      if (where === 'down') idxs.reverse();
      for (const i of idxs) {
        const j = where === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= next.length || moving.has(next[j]!.t.id)) continue;
        [next[i], next[j]] = [next[j]!, next[i]!];
      }
    }
    next.forEach((e, i) => {
      if (e.t.queuePosition !== i) {
        e.t.queuePosition = i;
        e.sim.changedAt = Date.now();
      }
    });
    return {};
  }

  private start(e: Entry) {
    const t = e.t;
    if (t.status === TorrentStatus.Check || t.status === TorrentStatus.CheckWait) return;
    t.status = t.leftUntilDone > 0 || t.metadataPercentComplete < 1 ? TorrentStatus.Download : TorrentStatus.Seed;
    t.isFinished = false;
    t.startDate = nowSec();
    if (t.error === TorrentError.TrackerError) {
      t.error = TorrentError.None;
      t.errorString = '';
    }
    e.sim.stalledUntil = 0;
  }

  /* ---------------------------------------------------------- dispatch */

  async send<M extends RpcMethod>(method: M, args: RpcArgs<M>): Promise<RpcResult<M>> {
    await new Promise((r) => setTimeout(r, 25 + Math.random() * 70));
    this.tick();
    return this.dispatch(method, args) as RpcResult<M>;
  }

  private dispatch(method: RpcMethod, rawArgs: unknown): unknown {
    switch (method) {
      case 'torrent-get':
        return this.torrentGet(rawArgs as TorrentGetArgs);
      case 'session-get':
        return { ...this.session };
      case 'session-set':
        Object.assign(this.session, rawArgs as Partial<SessionArguments>);
        return {};
      case 'session-stats':
        return this.stats();
      case 'free-space':
        return this.freeSpace((rawArgs as { path: string }).path);
      case 'torrent-add':
        return this.add(rawArgs as TorrentAddArgs);
      case 'torrent-set':
        return this.torrentSet(rawArgs as TorrentSetArgs);
      case 'torrent-start':
      case 'torrent-start-now':
        return this.setStatus((rawArgs as RpcArgs<'torrent-start'>).ids, (e) => this.start(e));
      case 'torrent-stop':
        return this.setStatus((rawArgs as RpcArgs<'torrent-stop'>).ids, (e) => {
          e.t.status = TorrentStatus.Stopped;
          e.t.rateDownload = e.t.rateUpload = 0;
          e.t.peersConnected = e.t.peersSendingToUs = e.t.peersGettingFromUs = 0;
        });
      case 'torrent-verify':
        return this.setStatus((rawArgs as RpcArgs<'torrent-verify'>).ids, (e) => this.beginVerify(e));
      case 'torrent-reannounce':
        return this.setStatus((rawArgs as RpcArgs<'torrent-reannounce'>).ids, () => undefined);
      case 'torrent-set-location': {
        const a = rawArgs as RpcArgs<'torrent-set-location'>;
        return this.setStatus(a.ids, (e) => {
          e.t.downloadDir = a.location;
          if (e.t.error === TorrentError.LocalError) {
            e.t.error = TorrentError.None;
            e.t.errorString = '';
          }
        });
      }
      case 'torrent-remove': {
        const a = rawArgs as RpcArgs<'torrent-remove'>;
        for (const e of this.resolveIds(a.ids)) {
          this.entries.delete(e.t.id);
          this.removedLog.push({ id: e.t.id, at: Date.now() });
        }
        return {};
      }
      case 'queue-move-top':
        return this.queueMove((rawArgs as IdsLike).ids, 'top');
      case 'queue-move-up':
        return this.queueMove((rawArgs as IdsLike).ids, 'up');
      case 'queue-move-down':
        return this.queueMove((rawArgs as IdsLike).ids, 'down');
      case 'queue-move-bottom':
        return this.queueMove((rawArgs as IdsLike).ids, 'bottom');
      default: {
        const never: never = method;
        throw new RpcError('rpc', `method name not recognized: ${String(never)}`);
      }
    }
  }
}

type IdsLike = { ids?: TorrentIds };
