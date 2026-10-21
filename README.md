# Sparky Animation Library

A standalone browser library with **29 Sparky animations**, looping gallery previews, a dark animation studio and game-ready exports.

## Open the app

**[Launch Sparky Animation Library](https://roky777.github.io/animation_library/)**

The GitHub repository URL displays source code. The link above opens the running app.

## Run locally

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/**. The root entry page takes you to the library.

No build step, API key, external service or package installation is required. Serve the files over HTTP rather than opening the HTML directly.

## Features

- Search, collections and multi-selection.
- Looping animation previews with pause and speed controls.
- Frame timeline, onion skin, same-scale comparison, zoom, backgrounds and root guides.
- Current-frame PNG capture and copyable integration code.
- Selected-animation ZIP exports with PNG atlases, JSON timing, the Canvas player, Markdown guides and agent integration instructions.
- Direct game-folder export in browsers supporting directory access, with ZIP export as the alternative.

The Dance collection contains both **Cute Bounce Dance** and **Hip Dance**. **Blowing Whistle** is under Celebrations and is a visual animation without audio.

## Integrate into a game

```js
import { SpriteSheetPlayer } from './animation-library/player.js';

const player = await SpriteSheetPlayer.load(
  canvas,
  './animation-library/animations/01-idle/animation.json'
);
player.play();
```

When exporting a pack, give its `AGENT_INSTRUCTIONS.md` to your coding agent. Keep the exported folder structure and use the timing, loop setting and root in each JSON file.

Atlases are losslessly deduplicated. For playback exposure `i`, use `frameMap[i]` to locate the physical atlas cell, then apply `frameDurationsMs[i]`. The bundled player handles this mapping and any runtime breathing effects. Gallery previews repeat for browsing; game exports retain each action's intended loop or one-shot behavior.

## Repository contents

```text
index.html                   Website entry (opens the library)
.nojekyll                    Preserve static assets on GitHub Pages
animation-library/
  index.html                 Gallery and pack export
  demo.html                  Animation studio
  library.js, library.css    Gallery behavior and theme
  animator.css               Studio theme
  player.js                  Canvas animation player
  zip.js                     Dependency-free ZIP writer
  manifest.json              Animation index
  animations/<clip-id>/
    spritesheet-optimized-v1.png
    animation.json
    animation.md
```

This repository contains only the Sparky library and its active resources. Lucas rigs, original sprite experiments and local authoring archives are excluded.

Read [app instructions](animation-library/APP_README.md), [per-animation guides](animation-library/README.md), [optimization notes](animation-library/OPTIMIZATION.md) and [quality review](animation-library/QUALITY_REVIEW.md). Technical validation does not certify artistic quality.

## Validate a fresh checkout

```sh
node scripts/check-library.mjs
```

This dependency-free check validates the root entry, relative app resources, all29 clip files, PNG dimensions, frame maps and durations.
