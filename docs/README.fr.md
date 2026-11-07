<div align="center">

# Tributary

**Une interface web rapide et moderne pour le client BitTorrent [Transmission](https://transmissionbt.com).**

[English](../README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · **Français** · [Deutsch](README.de.md) · [日本語](README.ja.md)

![Capture d’écran de Tributary](screenshot.jpg)

</div>

---

## Qu’est-ce que c’est ?

[Transmission](https://transmissionbt.com) est un logiciel BitTorrent gratuit et très répandu. Il tourne souvent en
arrière-plan (en tant que « démon ») sur un serveur domestique, un NAS ou un Raspberry Pi, et on le pilote depuis un navigateur.

**Tributary** est une page web qui remplace l’interface web fournie avec Transmission. Elle ressemble à une application de
bureau, existe en 6 langues et reste rapide même avec des milliers de torrents. Elle dialogue directement avec Transmission :
aucun serveur ni base de données supplémentaire à installer.

> Tributary est un projet indépendant, sans lien avec l’équipe de Transmission.

## Fonctionnalités

- 📋 **Liste des torrents** : tri, colonnes redimensionnables et masquables, sélection multiple (Maj / Ctrl), menu contextuel, fluide avec plus de 5 000 torrents
- 🔍 **Filtres et recherche** : par état (téléchargement, partage, erreurs…), par étiquette, par tracker
- 🔬 **Panneau de détails** : infos générales avec carte des pièces, arborescence des fichiers (choisissez quoi télécharger), pairs, trackers, graphique de vitesse
- ➕ **Ajout facile** : déposez un fichier `.torrent` n’importe où sur la page ou collez des liens magnet
- 🐢 **Mode tortue** et **préférences** complètes (limites de vitesse, file d’attente, règles de partage, réseau)
- 🌍 **6 langues** : English, 简体中文, Español, Français, Deutsch, 日本語, choisie automatiquement selon votre navigateur
- 🌙 **Thèmes sombre et clair**, raccourcis clavier (appuyez sur <kbd>?</kbd> dans l’application)
- 🎮 **Mode démo** : testez tout avec des torrents simulés, sans Transmission

---

## Démarrage rapide : essayer la démo (5 minutes)

Pas besoin de Transmission ici. Tributary verra qu’il n’y a pas de Transmission et passera en **mode démo** avec de faux torrents.

### 1. Installer Node.js

Téléchargez et installez la version **LTS** sur [nodejs.org](https://nodejs.org) (version 20 ou plus récente).
Pour vérifier, ouvrez un terminal (Windows : *PowerShell* ; macOS : *Terminal*) et lancez :

```bash
node --version
```

### 2. Récupérer le code

Cliquez sur le bouton vert **Code → Download ZIP** de cette page puis décompressez l’archive, ou, si vous avez Git :

```bash
git clone https://github.com/manb0fish/tributary.git
cd tributary
```

### 3. Installer et lancer

Dans un terminal ouvert dans le dossier `tributary` :

```bash
npm install
npm run dev
```

Ouvrez ensuite **http://localhost:5173** dans votre navigateur. Un badge violet **Démo** apparaît en haut à gauche. 🎉

Pour arrêter, appuyez sur <kbd>Ctrl</kbd> + <kbd>C</kbd> dans le terminal.

---

## Se connecter à votre propre Transmission

### 1. Vérifier que Transmission autorise l’accès à distance

- **Application de bureau Transmission** : ouvrez *Préférences → À distance* et cochez **Autoriser l’accès à distance**. Le port par défaut est **9091**.
- **transmission-daemon** (serveurs / NAS) : l’accès à distance est activé par défaut. Si vous avez défini un identifiant et
  un mot de passe, votre navigateur vous les demandera.

### 2. Lancer Tributary en le pointant vers Transmission

Remplacez l’adresse par celle de la machine qui fait tourner Transmission (`http://localhost:9091` s’il est sur le même ordinateur).

**macOS / Linux :**

```bash
TRANSMISSION_URL=http://192.168.1.10:9091 npm run dev
```

**Windows (PowerShell) :**

```powershell
$env:TRANSMISSION_URL="http://192.168.1.10:9091"; npm run dev
```

Ouvrez **http://localhost:5173**. La barre d’état en bas à droite doit afficher **Connecté** (point vert).

---

## Installation permanente

Les étapes ci-dessus font tourner Tributary sur votre ordinateur. Pour que **Transmission lui-même** serve Tributary (et
l’ouvrir depuis n’importe quel appareil sans rien d’autre en marche), compilez-le une fois et indiquez le résultat à Transmission.

### 1. Récupérer les fichiers

**Le plus simple : le télécharger (pas besoin de Node.js).** Ouvrez la [dernière version publiée](https://github.com/manb0fish/tributary/releases/latest), téléchargez
**tributary.zip** (ou **tributary.tar.gz**) et décompressez-le. Vous obtenez un dossier nommé `tributary`. Copiez-le sur la
machine qui fait tourner Transmission, par exemple dans `/opt/tributary`.

Sur un serveur Linux, vous pouvez tout faire depuis le terminal :

```bash
cd /opt
sudo curl -L -o tributary.tar.gz https://github.com/manb0fish/tributary/releases/latest/download/tributary.tar.gz
sudo tar -xzf tributary.tar.gz
```

**Ou compilez-le vous-même :** lancez `npm run build` dans le dossier du projet. Le résultat se trouve dans `dist/` ; utilisez ce dossier à la place.

### 2. Indiquer à Transmission de l’utiliser

Transmission lit la variable d’environnement `TRANSMISSION_WEB_HOME` au démarrage.

**Linux avec systemd** (la plupart des serveurs) :

```bash
sudo systemctl edit transmission-daemon
```

Ajoutez ces lignes, enregistrez, puis redémarrez :

```ini
[Service]
Environment=TRANSMISSION_WEB_HOME=/opt/tributary
```

```bash
sudo systemctl restart transmission-daemon
```

**Docker** : montez le dossier `tributary` dans le conteneur (par exemple sur `/tributary`) et ajoutez la variable d’environnement
`TRANSMISSION_WEB_HOME=/tributary`.

**Autres cas** : définissez `TRANSMISSION_WEB_HOME` avec le chemin complet du dossier avant de lancer Transmission.

### 3. L’ouvrir

Rendez-vous sur **http://VOTRE-SERVEUR:9091/transmission/web/**. C’est tout !

---

## Astuces

| Pour… | Faites ceci |
| --- | --- |
| Ajouter un torrent | Déposez un fichier `.torrent` sur la page ou cliquez sur **+ Ajouter** |
| Sélectionner plusieurs torrents | <kbd>Maj</kbd>+clic pour une plage, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+clic au cas par cas |
| Plus d’actions | Clic droit sur un torrent |
| Choisir les fichiers à télécharger | Sélectionnez un torrent → onglet **Fichiers** → décochez des fichiers |
| Rechercher | Appuyez sur <kbd>/</kbd> et tapez |
| Changer de langue ou de thème | ⚙ (icône des curseurs, en haut à droite) → **Langue** / **Thème** |
| Voir tous les raccourcis | Appuyez sur <kbd>?</kbd> |

Options d’URL utiles : `?demo` force le mode démo, `?mock=5000` crée une démo avec 5 000 torrents.

## Dépannage

<details>
<summary><b>« Impossible de joindre Transmission »</b></summary>

- Vérifiez l’adresse et le port (**9091** par défaut) et que Transmission est bien lancé.
- Essayez d’ouvrir directement `http://ADRESSE:9091/transmission/web/`. Si cela ne charge pas non plus, le problème se situe
  entre votre ordinateur et Transmission (pare-feu, mauvaise IP).
- En cas de **403 Forbidden**, la `rpc-whitelist` de Transmission bloque votre ordinateur. Arrêtez Transmission, modifiez
  `settings.json` pour ajouter votre IP à `rpc-whitelist` (ou mettez `rpc-whitelist-enabled` à `false` sur un réseau
  domestique de confiance), puis relancez-le. Transmission écrase `settings.json` en quittant : arrêtez-le *avant* de modifier le fichier.
</details>

<details>
<summary><b>Les données de démo s’affichent toujours</b></summary>

Tributary repasse en mode démo quand il n’arrive pas à se connecter. Ouvrez ⚙ → **Connexion** et choisissez
**Démon réel uniquement** pour voir l’erreur réelle, puis consultez la section précédente.
</details>

<details>
<summary><b>« Port 5173 is already in use » (port déjà utilisé)</b></summary>

Un autre programme utilise ce port. Fermez-le, ou lancez `npm run dev -- --port 5174`.
</details>

---

## Langues

Tributary utilise automatiquement la langue de votre navigateur. Vous pouvez la changer à tout moment via ⚙ → **Langue**
ou *Préférences → Interface*.

**Envie d’ajouter une langue ?** Copiez `src/i18n/locales/en.ts` dans un nouveau fichier (par ex. `it.ts`), traduisez les
textes et ajoutez-le à la liste `LOCALES` de `src/i18n/index.ts`. S’il manque une clé, `npm run typecheck` vous dira
exactement laquelle. Les pull requests sont les bienvenues !

## Pour les développeurs

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Lance le serveur de développement avec rechargement à chaud |
| `npm run build` | Vérifie les types et compile dans `dist/` |
| `npm run typecheck` | Vérifie uniquement les types |
| `npm run preview` | Sert localement le dossier `dist/` compilé |

**Technologies :** React 19, TypeScript (strict), Vite, Tailwind CSS 4, Radix UI, TanStack Query / Table / Virtual, Zustand.

```
src/
├── lib/rpc/        client RPC Transmission (gère l’échange 409 du session-id), types, backend de démo
├── lib/            cache des torrents avec interrogation incrémentale, formatage, utilitaires d’état
├── i18n/           système de traduction + un fichier par langue
├── components/     barre latérale, barre d’outils, tableau, inspecteur, boîtes de dialogue
├── hooks/          chargement des données (TanStack Query), actions, raccourcis clavier
└── store/          état de l’interface (Zustand)
```

## Contributeurs

- [@manb0fish](https://github.com/manb0fish) : propriétaire du projet
- **Claude** (assistant IA d’[Anthropic](https://www.anthropic.com)) : a coécrit le code, les traductions et la documentation

Les nouvelles contributions sont les bienvenues ! Ajouter une traduction est une excellente première contribution (voir [Langues](#langues)).

## Licence

[GPL-3.0](../LICENSE)
