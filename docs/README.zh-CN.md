<div align="center">

# Tributary

**一个快速、现代的 [Transmission](https://transmissionbt.com) BitTorrent 客户端网页界面。**

[English](../README.md) · **简体中文** · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

![Tributary 截图](screenshot.jpg)

</div>

---

## 这是什么？

[Transmission](https://transmissionbt.com) 是一款流行的免费 BitTorrent 下载软件。它常常作为“守护进程”（daemon）
在家用服务器、NAS 或树莓派上默默运行，而你通过浏览器来控制它。

**Tributary** 是一个用来替换 Transmission 自带网页界面的网页。它用起来像桌面软件，支持 6 种语言，
即使有成千上万个种子也依然流畅。它直接与 Transmission 通信，不需要额外的服务器或数据库。

> Tributary 是独立项目，与 Transmission 官方团队无关。

## 功能

- 📋 **种子列表**：排序、调整和隐藏列，批量选择（Shift / Ctrl），右键菜单，5000+ 个种子也能流畅滚动
- 🔍 **筛选和搜索**：按状态（下载中、做种中、出错……）、按标签、按 Tracker
- 🔬 **详情面板**：常规信息与分块图、文件树（可选择要下载的文件）、用户、Tracker、速度曲线
- ➕ **轻松添加种子**：把 `.torrent` 文件拖到页面任意位置，或粘贴磁力链接
- 🐢 **限速模式**（乌龟模式）和完整的**偏好设置**（速度限制、队列、做种规则、网络）
- 🌍 **6 种语言**：English、简体中文、Español、Français、Deutsch、日本語，根据浏览器自动选择
- 🌙 **深色和浅色主题**，键盘快捷键（在应用中按 <kbd>?</kbd> 查看）
- 🎮 **演示模式**：用模拟的种子体验全部功能，无需安装 Transmission

---

## 快速上手：试用演示版（5 分钟）

这一步不需要 Transmission。Tributary 发现没有 Transmission 时，会自动切换到带有模拟种子的**演示模式**。

### 1. 安装 Node.js

从 [nodejs.org](https://nodejs.org) 下载并安装 **LTS** 版本（20 或更高）。
安装后打开终端（Windows：*PowerShell*；macOS：*终端*），运行下面的命令检查是否成功：

```bash
node --version
```

### 2. 获取代码

点击本页面绿色的 **Code → Download ZIP** 按钮并解压；如果你装了 Git，也可以：

```bash
git clone https://github.com/manb0fish/tributary.git
cd tributary
```

### 3. 安装并启动

在 `tributary` 文件夹中打开终端，运行：

```bash
npm install
npm run dev
```

然后在浏览器中打开 **http://localhost:5173**。左上角会出现紫色的**演示**标记。🎉

要停止运行，在终端里按 <kbd>Ctrl</kbd> + <kbd>C</kbd>。

---

## 连接你自己的 Transmission

### 1. 确认 Transmission 允许远程访问

- **Transmission 桌面版**：打开*偏好设置 → 远程*，勾选**允许远程访问**。默认端口是 **9091**。
- **transmission-daemon**（服务器 / NAS）：默认已开启远程访问。如果你设置了用户名和密码，浏览器会提示你输入。

### 2. 让 Tributary 连接到它

把下面的地址换成运行 Transmission 的机器地址（如果在同一台电脑上，用 `http://localhost:9091`）。

**macOS / Linux：**

```bash
TRANSMISSION_URL=http://192.168.1.10:9091 npm run dev
```

**Windows（PowerShell）：**

```powershell
$env:TRANSMISSION_URL="http://192.168.1.10:9091"; npm run dev
```

打开 **http://localhost:5173**。右下角状态栏应显示**已连接**（绿点）。

---

## 永久安装

上面的方法是在你自己的电脑上运行 Tributary。如果想让 **Transmission 自己** 提供 Tributary
（这样任何设备都能直接打开，无需额外运行任何东西），只需构建一次，再让 Transmission 指向构建结果。

### 1. 构建

```bash
npm run build
```

这会生成一个 `dist` 文件夹。把它复制到运行 Transmission 的机器上，例如 `/opt/tributary`。

### 2. 告诉 Transmission 使用它

Transmission 启动时会读取 `TRANSMISSION_WEB_HOME` 环境变量。

**使用 systemd 的 Linux**（大多数服务器）：

```bash
sudo systemctl edit transmission-daemon
```

添加下面几行，保存，然后重启：

```ini
[Service]
Environment=TRANSMISSION_WEB_HOME=/opt/tributary
```

```bash
sudo systemctl restart transmission-daemon
```

**Docker**：把 `dist` 文件夹挂载到容器中（例如 `/tributary`），并添加环境变量 `TRANSMISSION_WEB_HOME=/tributary`。

**其他情况**：在启动 Transmission 之前，把 `TRANSMISSION_WEB_HOME` 设置为该文件夹的完整路径。

### 3. 打开

访问 **http://你的服务器:9091/transmission/web/**，大功告成！

---

## 使用技巧

| 想做的事 | 方法 |
| --- | --- |
| 添加种子 | 把 `.torrent` 文件拖到页面上，或点击 **+ 添加** |
| 选择多个种子 | <kbd>Shift</kbd>+点击选择范围，<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+点击逐个选择 |
| 更多操作 | 右键点击种子 |
| 选择要下载的文件 | 选中种子 → **文件** 标签 → 取消勾选文件 |
| 搜索 | 按 <kbd>/</kbd> 然后输入 |
| 切换语言或主题 | ⚙（右上角滑块图标）→ **语言** / **主题** |
| 查看所有快捷键 | 按 <kbd>?</kbd> |

实用的 URL 参数：`?demo` 强制使用演示模式，`?mock=5000` 生成包含 5000 个种子的演示。

## 常见问题

<details>
<summary><b>“无法连接到 Transmission”</b></summary>

- 检查地址和端口（默认 **9091**），并确认 Transmission 正在运行。
- 直接打开 `http://地址:9091/transmission/web/` 试试。如果也打不开，说明问题出在你的电脑和 Transmission
  之间（防火墙、IP 错误等）。
- 如果出现 **403 Forbidden**，是 Transmission 的 `rpc-whitelist` 拦截了你的电脑。先停止 Transmission，
  编辑 `settings.json`，把你的 IP 加入 `rpc-whitelist`（在可信的家庭网络中也可以把 `rpc-whitelist-enabled`
  设为 `false`），然后重新启动。Transmission 退出时会覆盖 `settings.json`，所以一定要*先停止*再编辑。
</details>

<details>
<summary><b>一直显示演示数据</b></summary>

Tributary 连接失败时会退回演示模式。打开 ⚙ → **连接**，选择**仅连接守护进程**即可看到真实的错误信息，再参考上一条排查。
</details>

<details>
<summary><b>“Port 5173 is already in use”（端口被占用）</b></summary>

有其他程序占用了该端口。关闭那个程序，或运行 `npm run dev -- --port 5174`。
</details>

---

## 语言

Tributary 会自动使用浏览器的语言。你可以随时在 ⚙ → **语言** 或*偏好设置 → 界面*中更改。

**想添加一种语言？** 把 `src/i18n/locales/en.ts` 复制为新文件（例如 `it.ts`），翻译其中的文字，
然后把它添加到 `src/i18n/index.ts` 的 `LOCALES` 列表中。如果漏了某个键，`npm run typecheck` 会准确告诉你是哪一个。
欢迎提交 Pull Request！

## 开发者信息

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动支持热更新的开发服务器 |
| `npm run build` | 类型检查并构建到 `dist/` |
| `npm run typecheck` | 仅做类型检查 |
| `npm run preview` | 在本地预览构建好的 `dist/` |

**技术栈：** React 19、TypeScript（严格模式）、Vite、Tailwind CSS 4、Radix UI、TanStack Query / Table / Virtual、Zustand。

```
src/
├── lib/rpc/        Transmission RPC 客户端（自动处理 409 会话 ID 握手）、类型定义、演示后端
├── lib/            增量轮询的种子缓存、格式化、状态工具
├── i18n/           翻译系统 + 每种语言一个文件
├── components/     侧边栏、工具栏、表格、详情面板、对话框
├── hooks/          数据获取（TanStack Query）、操作、键盘快捷键
└── store/          界面状态（Zustand）
```

## 许可证

[GPL-3.0](../LICENSE)
