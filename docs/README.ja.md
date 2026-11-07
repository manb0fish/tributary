<div align="center">

# Tributary

**BitTorrent クライアント [Transmission](https://transmissionbt.com) のための、高速でモダンな Web インターフェース。**

[English](../README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **日本語**

![Tributary のスクリーンショット](screenshot.jpg)

</div>

---

## これは何？

[Transmission](https://transmissionbt.com) は人気のある無料の BitTorrent ソフトです。自宅サーバーや NAS、
Raspberry Pi の上で「デーモン」としてバックグラウンドで動かし、ブラウザーから操作するのが一般的です。

**Tributary** は、Transmission に付属する Web インターフェースの代わりに使える Web ページです。
デスクトップアプリのような操作感で、6 つの言語に対応し、トレントが何千件あっても軽快に動きます。
Transmission と直接やり取りするので、追加のサーバーやデータベースは必要ありません。

> Tributary は独立したプロジェクトであり、Transmission 開発チームとは関係ありません。

## 主な機能

- 📋 **トレント一覧**：並べ替え、列の幅変更・非表示、複数選択（Shift / Ctrl）、右クリックメニュー、5,000 件以上でもなめらか
- 🔍 **フィルターと検索**：状態（ダウンロード中、シード中、エラーなど）、ラベル、トラッカーで絞り込み
- 🔬 **詳細パネル**：ピースマップ付きの概要、ファイルツリー（ダウンロードするファイルを選択）、ピア、トラッカー、速度グラフ
- ➕ **かんたん追加**：`.torrent` ファイルをページのどこにでもドロップ、またはマグネットリンクを貼り付け
- 🐢 **速度制限モード**（タートルモード）と充実した**環境設定**（速度制限、キュー、シードのルール、ネットワーク）
- 🌍 **6 言語**：English、简体中文、Español、Français、Deutsch、日本語。ブラウザーの言語に合わせて自動で選択
- 🌙 **ダーク / ライトテーマ**、キーボードショートカット（アプリ内で <kbd>?</kbd> を押すと一覧表示）
- 🎮 **デモモード**：Transmission がなくても、模擬トレントですべての機能を試せます

---

## クイックスタート：デモを試す（5 分）

ここでは Transmission は不要です。Tributary は Transmission が見つからないと、模擬トレントを使った**デモモード**に自動で切り替わります。

### 1. Node.js をインストール

[nodejs.org](https://nodejs.org) から **LTS** 版（バージョン 20 以降）をダウンロードしてインストールします。
確認するには、ターミナル（Windows は *PowerShell*、macOS は *ターミナル*）を開いて次を実行します：

```bash
node --version
```

### 2. コードを入手

このページの緑色の **Code → Download ZIP** ボタンを押して展開するか、Git があれば次を実行します：

```bash
git clone https://github.com/manb0fish/tributary.git
cd tributary
```

### 3. インストールして起動

`tributary` フォルダーでターミナルを開き、次を実行します：

```bash
npm install
npm run dev
```

ブラウザーで **http://localhost:5173** を開くと、左上に紫色の**デモ**バッジが表示されます。🎉

止めるときは、ターミナルで <kbd>Ctrl</kbd> + <kbd>C</kbd> を押します。

---

## 自分の Transmission に接続する

### 1. Transmission がリモートアクセスを許可しているか確認

- **Transmission デスクトップ版**：*環境設定 → リモート* を開き、**リモートアクセスを許可** にチェックを入れます。既定のポートは **9091** です。
- **transmission-daemon**（サーバー / NAS）：リモートアクセスは最初から有効です。ユーザー名とパスワードを設定している場合は、ブラウザーが入力を求めます。

### 2. Tributary の接続先を指定して起動

アドレスは Transmission が動いているマシンのものに置き換えてください（同じパソコンなら `http://localhost:9091`）。

**macOS / Linux：**

```bash
TRANSMISSION_URL=http://192.168.1.10:9091 npm run dev
```

**Windows（PowerShell）：**

```powershell
$env:TRANSMISSION_URL="http://192.168.1.10:9091"; npm run dev
```

**http://localhost:5173** を開き、右下のステータスバーに **接続済み**（緑の点）と表示されれば成功です。

---

## 常用するためのインストール

上の手順では Tributary は自分のパソコン上で動いています。**Transmission 自身** に Tributary を配信させれば、
他に何も動かさなくても、どの端末からでも開けるようになります。一度ビルドして、その結果を Transmission に指定するだけです。

### 1. ビルド

```bash
npm run build
```

`dist` フォルダーが作られます。これを Transmission が動いているマシンにコピーします（例：`/opt/tributary`）。

### 2. Transmission に使わせる

Transmission は起動時に環境変数 `TRANSMISSION_WEB_HOME` を読み込みます。

**systemd を使う Linux**（多くのサーバー）：

```bash
sudo systemctl edit transmission-daemon
```

次の行を追加して保存し、再起動します：

```ini
[Service]
Environment=TRANSMISSION_WEB_HOME=/opt/tributary
```

```bash
sudo systemctl restart transmission-daemon
```

**Docker**：`dist` フォルダーをコンテナにマウントし（例：`/tributary`）、環境変数 `TRANSMISSION_WEB_HOME=/tributary` を追加します。

**その他の環境**：Transmission を起動する前に、`TRANSMISSION_WEB_HOME` にフォルダーのフルパスを設定します。

### 3. 開く

**http://あなたのサーバー:9091/transmission/web/** にアクセスすれば完了です！

---

## 使い方のヒント

| やりたいこと | 方法 |
| --- | --- |
| トレントを追加 | `.torrent` ファイルをページにドロップ、または **+ 追加** をクリック |
| 複数のトレントを選択 | <kbd>Shift</kbd>+クリックで範囲選択、<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+クリックで個別選択 |
| その他の操作 | トレントを右クリック |
| ダウンロードするファイルを選ぶ | トレントを選択 → **ファイル** タブ → 不要なファイルのチェックを外す |
| 検索 | <kbd>/</kbd> を押して入力 |
| 言語やテーマを変更 | ⚙（右上のスライダーアイコン）→ **言語** / **テーマ** |
| ショートカット一覧を見る | <kbd>?</kbd> を押す |

便利な URL オプション：`?demo` でデモモードを強制、`?mock=5000` で 5,000 件のトレントを持つデモを作成します。

## トラブルシューティング

<details>
<summary><b>「Transmission に接続できません」</b></summary>

- アドレスとポート（既定は **9091**）、そして Transmission が起動しているかを確認してください。
- `http://アドレス:9091/transmission/web/` を直接開いてみてください。それも開けない場合、問題はパソコンと
  Transmission の間（ファイアウォール、IP の誤りなど）にあります。
- **403 Forbidden** が出る場合は、Transmission の `rpc-whitelist` があなたのパソコンをブロックしています。
  Transmission を停止し、`settings.json` の `rpc-whitelist` に自分の IP を追加して（信頼できる家庭内ネットワークなら
  `rpc-whitelist-enabled` を `false` にしても構いません）、もう一度起動してください。Transmission は終了時に
  `settings.json` を上書きするので、必ず*停止してから*編集してください。
</details>

<details>
<summary><b>ずっとデモデータが表示される</b></summary>

Tributary は接続できないとデモモードに切り替わります。⚙ → **接続** で **デーモンのみ** を選ぶと実際のエラーが表示されるので、
上の項目を参考に確認してください。
</details>

<details>
<summary><b>「Port 5173 is already in use」（ポートが使用中）</b></summary>

別のプログラムがそのポートを使っています。そのプログラムを終了するか、`npm run dev -- --port 5174` を実行してください。
</details>

---

## 言語

Tributary はブラウザーの言語を自動的に使います。⚙ → **言語** または *環境設定 → 表示* からいつでも変更できます。

**言語を追加したいですか？** `src/i18n/locales/en.ts` を新しいファイル（例：`it.ts`）にコピーして翻訳し、
`src/i18n/index.ts` の `LOCALES` リストに追加してください。キーが足りない場合は、`npm run typecheck` がどのキーかを正確に教えてくれます。
プルリクエスト歓迎です！

## 開発者向け

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | ホットリロード付きの開発サーバーを起動 |
| `npm run build` | 型チェックをして `dist/` にビルド |
| `npm run typecheck` | 型チェックのみ |
| `npm run preview` | ビルドした `dist/` をローカルで配信 |

**使用技術：** React 19、TypeScript（strict）、Vite、Tailwind CSS 4、Radix UI、TanStack Query / Table / Virtual、Zustand。

```
src/
├── lib/rpc/        Transmission RPC クライアント（409 セッション ID のやり取りを自動処理）、型定義、デモ用バックエンド
├── lib/            差分ポーリング対応のトレントキャッシュ、表示形式、状態ヘルパー
├── i18n/           翻訳の仕組み + 言語ごとのファイル
├── components/     サイドバー、ツールバー、テーブル、詳細パネル、ダイアログ
├── hooks/          データ取得（TanStack Query）、操作、キーボードショートカット
└── store/          UI の状態（Zustand）
```

## ライセンス

[GPL-3.0](../LICENSE)
