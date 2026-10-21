# Sparky Animation Library

A browser-based library of 29 character animations with looping previews, search, collections, an inspection studio and game-ready ZIP exports.

## Run locally

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/animation-library/index.html**. No package installation or API key is required. The original Lucas rig inspector remains at `/index.html`; it loads the Spine runtime from a CDN.

## Use the library

- Browse and select clips, then download a ZIP or use **Save to game folder** in browsers supporting directory access.
- Exported packs include transparent PNG atlases, JSON playback data, a Canvas player, per-clip Markdown guides, a manifest, a preview and `AGENT_INSTRUCTIONS.md` for coding agents.
- Open a card's arrow for frame scrubbing, onion skin, same-scale comparison, zoom, background choices, ground guides and current-frame PNG capture.
- Gallery previews repeat for browsing. Game exports preserve each animation's original loop or one-shot behavior.

## Integrate into a game

```js
import { SpriteSheetPlayer } from './animation-library/player.js';

const player = await SpriteSheetPlayer.load(
  canvas,
  './animation-library/animations/01-idle/animation.json'
);
player.play();
```

Keep the shared cell size and root across actions. The atlases are losslessly deduplicated: **use `frameMap[i]` to locate playback exposure i**, then use `frameDurationsMs[i]` for its timing. The bundled player implements that mapping and the documented runtime breathing effects.

## Project files

| Path | Purpose |
| --- | --- |
| `animation-library/` | Portable gallery, studio, player and active clip resources |
| `animation/sparky/improved/` | Active atlases and collection registry for the sprite runner |
| `sprite-runner.html` | Standalone sprite-sheet runner |
| `tools/` | Packaging, validation and original authoring utilities |
| `tests/` | Runtime and authoring regression checks |

The active library is included. Large generated working drafts, rejected sheets, source archives and generated ZIP files stay local and are ignored by Git. Some authoring tools and pixel-regression tests require those original working resources; they are not required to run or export the app.

## Checks and packaging

```sh
node tests/sprite-player.mjs
node tests/library-quality.cjs
python3 tools/package-library-app.py
```

The packaging command writes `output/sparky-animation-library-app.zip`. Full source-art regression checks require the local authoring archive.

See [app instructions](animation-library/APP_README.md), [integration guide](animation-library/README.md), [optimization notes](animation-library/OPTIMIZATION.md) and [quality review](animation-library/QUALITY_REVIEW.md). Technical checks do not certify artistic quality. The party-whistle clip is a visual animation and does not include audio.
