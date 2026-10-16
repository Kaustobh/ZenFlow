# 🌿 ZenFlow — Paper & Stone Spatial Atelier

> A distraction-free, Japandi-inspired spatial whiteboard engineered with tactile acoustics, kinetic glide navigation, and frictionless thought-chaining.

[![Live Demo](https://img.shields.io/badge/Demo-zen--flow--whiteboard.vercel.app-000?style=flat&logo=vercel&logoColor=white)](https://zen-flow-whiteboard.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Live Atelier Demo**: 🌐 **[https://zen-flow-whiteboard.vercel.app/](https://zen-flow-whiteboard.vercel.app/)**

---

## ⛩️ Philosophy: The Paper & Stone Atelier

Modern collaborative whiteboards suffer from severe visual bloat—noisy toolbars, cursor clutter, and cognitive fatigue. 

**ZenFlow** is built on the Japanese and Scandinavian (Japandi) design philosophy of **reduction and tactile calm**:
- **Washi Paper**: Soft fibrous substrates with subtle elevation physics and warm resting shadows.
- **Riverbed Stone**: Structural sumi-carbon lines and stone textures (`#1c1917`, `#292524`).
- **Kyoto Cinnabar**: Vermilion accents (`#c25e3e`) marking intentional focal points and active detents.

---

## ✨ Key Features

### 💠 The Kumiko Tesseract & Iris Entrance
- **Geometric Brand Identity**: Built on an isometric tri-axial grid ($30^\circ / 90^\circ / 150^\circ$) inspired by traditional Japanese *Kumiko* woodwork (*Mitsukude* lattices).
- **Metric-Free Iris Entrance**: A pure 950ms circular aperture (`clip-path: circle()`) expanding from the center mark directly into the workspace.

### 🌿 Thought-Chaining Ergonomics
- **Double-Click Creation**: Drop a note anywhere with instant auto-focus.
- **<kbd>Tab</kbd> Chaining**: Spawns a connected thought 24px to the right and transfers cursor focus instantly.
- **<kbd>Shift</kbd>+<kbd>Enter</kbd> Branching**: Spawns a note directly below.
- **Instant Palette Hotkeys**: Press <kbd>1</kbd>–<kbd>6</kbd> to recolor selected objects with Japandi washi tones.

### 🧭 Living Connectors & Horizon Compass
- **Continuous Cubic Bezier Arrows**: Smart arrows that magnetically snap to cardinal anchor ports.
- **Relationship Badges**: Midpoint label pills (`--[leads to]-->`, `--[validates]-->`) that move dynamically with containers.
- **Peripheral Off-Screen Radar**: Compass badges at the screen boundary calculate distance and direction to thoughts outside the viewport.
- **Kinetic Glide Engine**: Clicking any compass badge glides the camera across the canvas over 480ms with fluid cubic ease-out physics.

### 🌗 Dual Atmospheres
- **Morning Light**: Sunlit washi substrate (`#faf9f5`) with sumi-carbon ink linework.
- **Ink & Hearth**: Deep obsidian substrate (`#161615`) with riverbed stone accents and ambient glowing cinnabar detents.

### 🔊 Atelier Acoustics
- Procedural Web Audio API soundscape (zero heavy media assets).
- Tactile feedback for paper drops, magnetic anchor snaps, and fling dismissals.

### 📜 The Scroll Index & Export Fidelity
- **The Scroll Index**: Slide-out drawer with a Birds-Eye minimap, structural categories, and quick navigation.
- **Export Parity**: Vector SVG, Markdown hierarchy outlines, and high-resolution PNG snapshots with 100% aesthetic fidelity.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Double Click` | Create sticky note / Edit shape label |
| `Tab` (in note) | Spawn adjacent thought to the right |
| `Shift + Enter` (in note) | Spawn adjacent thought below |
| `V` / `H` | Select tool / Pan Hand tool |
| `N` / `T` | Sticky Note / Instant Text Box |
| `R` / `C` / `F` | Rectangle / Circle / Artisan Frame |
| `L` / `P` | Connector Arrow / Brush Stylus |
| `1` – `6` | Instant Japandi palette tone switch |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo |
| `Ctrl + D` | Duplicate selected objects |
| `Shift + 1` | Fit all objects in atelier |
| `Ctrl + 0` | Reset zoom to 100% |
| `Ctrl + Alt + N` | Create new whiteboard |
| `Ctrl + B` | Toggle Atelier Board Switcher |
| `Z` | Toggle Zen Focus Mode |
| `Backspace` / `Del` | Delete selected objects |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Kaustobh/ZenFlow.git
cd ZenFlow

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with persistence
- **Canvas Engine**: Custom HTML5 Canvas 2D with HiDPI auto-scaling & kinetic momentum physics
- **Audio**: Web Audio API synthesized acoustics
- **Icons**: Custom 1.75px optical monoline SVGs

---

## 📄 License

MIT License © 2026 Kaustobh
