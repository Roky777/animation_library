# Lucas Asset Collection Manifest

This folder is a curated copy of extracted assets. Original files under `re/assets/` were not moved or modified. The collection contains 94 files: 15 rig/atlas files, 57 split-part sprites, and 22 FX texture candidates.

## Animation Rigs

| Collection folder | Filenames | Original source folder |
| --- | --- | --- |
| `animation/garden/` | `Lucas_Toy_Garden.atlas`, `Lucas_Toy_Garden.skel`, `Lucas_Toy_Garden.png` | `re/assets/lucasgarden/text/` for atlas/skeleton; `re/assets/lucasgarden/Texture2D/` for PNG |
| `animation/room/` | `Lucas_Room_Game.atlas`, `Lucas_Room_Game.skel`, `Lucas_Room_Game.png` | `re/assets/lucasroomrewamp/text/` for atlas/skeleton; `re/assets/lucasroomrewamp/Texture2D/` for PNG |
| `animation/activity/` | `Lucas_Activity_Kids_Game.atlas`, `Lucas_Activity_Kids.skel`, `Lucas_Activity_Kids_Game.png`, `Lucas_Activity_Kids_Intro.atlas`, `Lucas_Activity_Kids_Intro.skel`, `Lucas_Activity_Kids_Intro.png` | `re/assets/data/text/` for atlas/skeleton; `re/assets/data/Texture2D/` for PNG |
| `animation/icecream/` | `Lucas_Activity_Icecream.atlas`, `Lucas_Activity_Icecream.skel`, `Lucas_Activity_Icecream.png` | `re/assets/modebundle_40/text/` for atlas/skeleton; `re/assets/modebundle_40/Texture2D/` for PNG |

## Split Character Sprites

All files below are in `character_parts/garden/` in this collection. Each filename's original path is `re/assets/lucasgarden/Sprite/<filename>`.

- `Body.png`, `Body__1.png`, `Body__2.png`
- `Eye_L.png`, `Eye_L__1.png`, `Eye_L_B.png`, `Eye_L_B__1.png`
- `Eye_R.png`, `Eye_R__1.png`, `Eye_R_B.png`, `Eye_R_B__1.png`, `Eye_R_B__2.png`, `Eye_R_B__3.png`, `eye.png`
- `EyeBlink__1.png`, `Eyeblink.png`
- `Eyebrow.png`, `Eyebrow__1.png`, `Eyebrow_L.png`, `Eyebrow_L__1.png`, `Eyebrow_L__2.png`, `Eyebrow_R.png`, `Eyebrow_R__1.png`, `Eyebrow_R__2.png`
- `Face.png`, `Face__1.png`, `Face__2.png`, `Face__3.png`, `face__4.png`
- `Hand_Bottom.png`, `Hand_Bottom__1.png`, `Hand_Bottom__2.png`, `Hand_Bottom__3.png`, `Hand_L.png`, `Hand_Top.png`, `Hand_Top__1.png`, `Hand_Top__2.png`, `Hand_Top__3.png`
- `Laugh.png`, `Laugh__1.png`, `laugh__2.png`, `laugh__3.png`, `laugh__4.png`
- `Nose.png`, `Open_Eye.png`
- `Smile.png`, `Smile__1.png`, `Smile__2.png`, `Smile__3.png`, `Smile__4.png`
- `Specks.png`
- `Tail.png`, `Tail__1.png`, `Tail__2.png`, `Tail__3.png`
- `Torso.png`, `Torso__1.png`

## FX Texture Candidates

These are copied textures, not standalone particle prefabs. Each filename's original path is the source directory shown for its collection subfolder.

| Collection folder | Filenames | Original source directory |
| --- | --- | --- |
| `fx/garden/` | `confetti_ribbin.png`, `confetti.png`, `Default-Particle.png`, `Default-ParticleSystem.png`, `flash.png`, `glitter-white.png`, `shine.png`, `smoke.png`, `twinkle-1.png`, `twinkle-3.png`, `twinkle-5.png` | `re/assets/lucasgarden/Texture2D/` |
| `fx/room/` | `smoke.png`, `Water_splash_sprite.png`, `water-drop-particle.png` | `re/assets/lucasroomrewamp/Texture2D/` |
| `fx/icecream/` | `confetti.png`, `Fire_flame.png`, `shine.png`, `smoke.png`, `twinkle-2.png`, `twinkle-5.png`, `Water_splash_sprite.png`, `water-drop-particle.png` | `re/assets/modebundle_40/Texture2D/` |

## Provenance Notes

- The atlas and skeleton files are extracted Spine data; PNG files with matching atlas names are their page textures.
- `Lucas_Activity_Kids_Game.atlas` has no matching `Lucas_Activity_Kids_Game.skel` in the extracted listing. `Lucas_Activity_Kids.skel` is included as the nearby activity skeleton, but the pairing is unverified.
- Split-part sprites and FX textures come from shared bundles. Numbered sprite variants and FX ownership are not confirmed to be Lucas-exclusive.
- FX prefab names and controller references are documented in `re/specs/lucas-character.md`; the individual prefab/configuration assets were not available as standalone files to copy.
