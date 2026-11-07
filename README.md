<div align="center">

# Tributary

**A fast, modern web interface for the [Transmission](https://transmissionbt.com) BitTorrent client.**

**English** · [简体中文](docs/README.zh-CN.md) · [Español](docs/README.es.md) · [Français](docs/README.fr.md) · [Deutsch](docs/README.de.md) · [日本語](docs/README.ja.md)

![Tributary screenshot](docs/screenshot.jpg)

</div>

---

## What is this?

[Transmission](https://transmissionbt.com) is a popular, free BitTorrent program. It often runs quietly in the background
(as a "daemon") on a home server, NAS, or Raspberry Pi, and you control it from a web browser.

**Tributary** is a web page that replaces Transmission's built-in web interface. It looks and feels like a desktop app,
works in 6 languages, and stays fast even with thousands of torrents. It talks to Transmission directly, so there's no
extra server or database to set up.

> Tributary is an independent project and is not affiliated with the Transmission team.

## Features

- 📋 **Torrent list**: sort, resize and hide columns, select many at once (Shift / Ctrl), right-click menu, smooth with 5,000+ torrents
- 🔍 **Filters and search**: by status (downloading, seeding, errors…), by label, by tracker
- 🔬 **Details panel**: general info with piece map, file tree (choose which files to download), peers, trackers, speed graph
- ➕ **Add torrents easily**: drag a `.torrent` file anywhere onto the page, or paste magnet links
- 🐢 **Turtle mode** and full **preferences** (speed limits, queue, seeding rules, network)
- 🌍 **6 languages**: English, 简体中文, Español, Français, Deutsch, 日本語, picked automatically from your browser
- 🌙 **Dark and light themes**, keyboard shortcuts (press <kbd>?</kbd> in the app)
- 🎮 **Demo mode**: try everything with simulated torrents, no Transmission needed

---

## Quick start: try the demo (5 minutes)

You don't need Transmission for this. Tributary will notice there's no Transmission and switch to **demo mode** with fake torrents.

### 1. Install Node.js

Download and install the **LTS** version from [nodejs.org](https://nodejs.org) (version 20 or newer).
To check it worked, open a terminal (on Windows: *PowerShell*; on macOS: *Terminal*) and run:

```bash
node --version
```

### 2. Get the code

Either click the green **Code → Download ZIP** button on this page and unzip it, or, if you have Git:

```bash
git clone https://github.com/manb0fish/tributary.git
cd tributary
```

### 3. Install and start

In a terminal inside the `tributary` folder:

```bash
npm install
npm run dev
```

Now open **http://localhost:5173** in your browser. You'll see a purple **Demo** badge in the top-left corner. 🎉

To stop it, press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the terminal.

---

## Connect to your own Transmission

### 1. Make sure Transmission allows remote access

- **Transmission desktop app:** open *Preferences → Remote* and tick **Allow remote access**. The default port is **9091**.
- **transmission-daemon** (servers / NAS): remote access is on by default. If you set a username and password, your browser
  will ask for them.

### 2. Start Tributary pointed at it

Replace the address with your Transmission machine's address (use `http://localhost:9091` if it's on the same computer).

**macOS / Linux:**

```bash
TRANSMISSION_URL=http://192.168.1.10:9091 npm run dev
```

**Windows (PowerShell):**

```powershell
$env:TRANSMISSION_URL="http://192.168.1.10:9091"; npm run dev
```

Open **http://localhost:5173**. The status bar at the bottom right should say **Connected** (green dot).

---

## Install it permanently

The steps above run Tributary from your computer. To have **Transmission itself** serve Tributary (so you can open it from any
device, with nothing else running), build it once and point Transmission at the result.

### 1. Get the files

**Easiest: download it (no Node.js needed).** Open the [latest release](https://github.com/manb0fish/tributary/releases/latest), download **tributary.zip** (or
**tributary.tar.gz**) and unzip it. You get a folder called `tributary`. Copy it to the machine running Transmission,
for example to `/opt/tributary`.

On a Linux server you can do it straight from the terminal:

```bash
cd /opt
sudo curl -L -o tributary.tar.gz https://github.com/manb0fish/tributary/releases/latest/download/tributary.tar.gz
sudo tar -xzf tributary.tar.gz
```

**Or build it yourself:** run `npm run build` in the project folder. The result is in `dist/`; use that folder instead.

### 2. Tell Transmission to use it

Transmission reads the `TRANSMISSION_WEB_HOME` environment variable when it starts.

**Linux with systemd** (most servers):

```bash
sudo systemctl edit transmission-daemon
```

Add these lines, save, then restart:

```ini
[Service]
Environment=TRANSMISSION_WEB_HOME=/opt/tributary
```

```bash
sudo systemctl restart transmission-daemon
```

**Docker:** mount the `tributary` folder into the container (for example at `/tributary`) and add the environment variable
`TRANSMISSION_WEB_HOME=/tributary`.

**Anything else:** set `TRANSMISSION_WEB_HOME` to the folder's full path before starting Transmission.

### 3. Open it

Go to **http://YOUR-SERVER:9091/transmission/web/**. That's it!

---

## Tips

| Do this | How |
| --- | --- |
| Add a torrent | Drag a `.torrent` file onto the page, or click **+ Add** |
| Select several torrents | <kbd>Shift</kbd>+click for a range, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+click to pick individually |
| More actions | Right-click a torrent |
| Choose files to download | Select a torrent → **Files** tab → untick files |
| Search | Press <kbd>/</kbd> and type |
| Change language or theme | ⚙ (sliders icon, top right) → **Language** / **Theme** |
| See all shortcuts | Press <kbd>?</kbd> |

Useful URL options: `?demo` forces demo mode, `?mock=5000` makes a demo with 5,000 torrents.

## Troubleshooting

<details>
<summary><b>"Can't reach Transmission"</b></summary>

- Check the address and port (default **9091**) and that Transmission is running.
- Try opening `http://ADDRESS:9091/transmission/web/` directly. If that doesn't load either, the problem is between your
  computer and Transmission (firewall, wrong IP).
- If you get **403 Forbidden**, Transmission's `rpc-whitelist` is blocking your computer. Stop Transmission, edit
  `settings.json` to add your IP to `rpc-whitelist` (or set `rpc-whitelist-enabled` to `false` on a trusted home network),
  then start it again. Transmission overwrites `settings.json` on exit, so stop it *before* editing.
</details>

<details>
<summary><b>It keeps showing demo data</b></summary>

Tributary falls back to demo mode when it can't connect. Open ⚙ → **Connection** and choose **Live daemon only** to see the
real error, then check the section above.
</details>

<details>
<summary><b>"Port 5173 is already in use"</b></summary>

Something else is using that port. Stop the other program, or run `npm run dev -- --port 5174`.
</details>

---

## Languages

Tributary picks your browser's language automatically. Change it any time in ⚙ → **Language** or *Preferences → Interface*.

**Want to add a language?** Copy `src/i18n/locales/en.ts` to a new file (e.g. `it.ts`), translate the text, and add it to
the `LOCALES` list in `src/i18n/index.ts`. If you missed a key, `npm run typecheck` will tell you exactly which one.
Pull requests are welcome!

## For developers

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run typecheck` | Type-check only |
| `npm run preview` | Serve the built `dist/` locally |

**Built with:** React 19, TypeScript (strict), Vite, Tailwind CSS 4, Radix UI, TanStack Query / Table / Virtual, Zustand.

```
src/
├── lib/rpc/        Transmission RPC client (handles the 409 session-id handshake), types, demo backend
├── lib/            torrent cache with incremental polling, formatting, status helpers
├── i18n/           translation system + one file per language
├── components/     sidebar, toolbar, table, inspector, dialogs
├── hooks/          data fetching (TanStack Query), actions, keyboard shortcuts
└── store/          UI state (Zustand)
```

## Contributors

- [@manb0fish](https://github.com/manb0fish): project owner
- **Claude** (AI assistant by [Anthropic](https://www.anthropic.com)): co-wrote the code, translations and documentation

New contributors are very welcome. Adding a translation is a great first contribution (see [Languages](#languages)).

## License

[GPL-3.0](LICENSE)
