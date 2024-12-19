<p align="center">
  <img src="https://www.stremio.com/website/stremio-logo-small.png" alt="Stremio Web Desktop Logo" width="200" />
</p>
<div align="center">
  <h1>🌌 Stremio Web for Desktop<br/><span style="font-size: 0.6em; font-weight: normal;">Community</span></h1>
</div>


<p align="center">Fork of Stremio Web with fixes for Stremio-Desktop-v5 (Qt6)</p>
<p align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/React-191970?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/HTML-239120?style=for-the-badge&logo=html5&logoColor=white" alt="HTML">
  <img src="https://img.shields.io/badge/CSS-239120?style=for-the-badge&logo=css3&logoColor=white" alt="CSS">
</p>


## ⚠️ **Fork Disclaimer**
- 🚧 **Work in Progress:** This is a fork of the official [Stremio Web](https://github.com/Stremio/stremio-web).
- ✨ **Primary Goal:** Fixes for Stremio Web v5 to make it work with [stremio-shell-qt6 (Desktop App)](https://github.com/Zaarrg/stremio-desktop-v5).
- ⚠️ **Caution:** Stuff might break frequently.

## 🌟 **Fixes**
- Autoplay fix. On end of video next video is played.
- Background fix. Fixed page transparency not resetting.
- Subtitle Selection remembers what was selected in last video. Useful for Binge Watching.

## Build

### Prerequisites

* Node.js 12 or higher
* npm 6 or higher

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm start
```

### Production build

```bash
npm run build
```

## Screenshots

### Board

![Board](/screenshots/board.png)

### Discover

![Discover](/screenshots/discover.png)

### Meta Details

![Meta Details](/screenshots/metadetails.png)

## License

Stremio is copyright 2017-2023 Smart code and available under GPLv2 license. See the [LICENSE](/LICENSE.md) file in the project for more information.
