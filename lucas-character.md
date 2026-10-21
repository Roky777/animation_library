# Lucas Character Specification

## Scope and Evidence

This specification is based on the extracted Unity project in `re/`. It covers the Lucas controller states, animation clips explicitly selected by the decompiled controllers, and the visual assets gathered under [`re/character_assets/lucas/`](../character_assets/lucas/). It does not claim to enumerate every clip embedded in Spine skeletons.

Lucas is implemented in multiple scene/activity contexts, with separate Spine atlas/skeleton sets for the garden, room, activity intro/game, and ice-cream activity. The atlas page dimensions and Spine scale below describe the extracted atlas metadata, not an asserted on-screen character size.

## Gameplay Statuses

These are the 20 values in `LucasAnimationControl.Status`. They are controller/activity states, not a one-to-one list of Spine clips.

| # | Status |
| ---: | --- |
| 1 | `Idle` |
| 2 | `Intro` |
| 3 | `IdleWalkingLeft` |
| 4 | `IdleWalkingRight` |
| 5 | `HappyIdleWalkingRight` |
| 6 | `HappyIdleWalkingLeft` |
| 7 | `FaceDragActivity` |
| 8 | `TummyDragActivity` |
| 9 | `SkateRampActivity` |
| 10 | `CarActivity` |
| 11 | `BallonActivity` (source spelling) |
| 12 | `PianoActivity` |
| 13 | `WoobleToyActivity` (source spelling) |
| 14 | `BathTubActivity` |
| 15 | `FootBallActivity` |
| 16 | `CarpetActivity` |
| 17 | `BenchActivity` |
| 18 | `TableActivity` |
| 19 | `TrampolineActivity` |
| 20 | `HorseActivity` |

## Explicitly Observed Animation Clips

Names below are the string values passed to `SetAnimation` or `AddAnimation` in the Lucas controllers inspected. `_R` variants and transition clips are listed separately because the source selects them explicitly.

### Common Walk

- `Common/Walk/Lu_Idle_To_Walk_Left`
- `Common/Walk/Lu_Idle_To_Walk_Right`
- `Common/Walk/Lu_Walk_Left`
- `Common/Walk/Lu_Walk_Left_R`
- `Common/Walk/Lu_Walk_Right`
- `Common/Walk/Lu_Walk_Right_R`

### Happy Walk

- `Common/Happy_Walk/Lu_Idle_To_Happy_Walk_Left`
- `Common/Happy_Walk/Lu_Idle_To_Happy_Walk_Right`
- `Common/Happy_Walk/Lu_Happy_Walk_Left`
- `Common/Happy_Walk/Lu_Happy_Walk_Left_R`
- `Common/Happy_Walk/Lu_Happy_Walk_Right`
- `Common/Happy_Walk/Lu_Happy_Walk_Right_R`

### Intro and General

- `Front_Hi`
- `Idle`
- `Idle_EB`
- `Idle_New`
- `Intro/Lu_Look_Bubble`
- `Intro/Lu_Woow_Pop_Bubble`
- `Intro/Lucas_Room_Touch/Lu_Hi`
- `Intro/Lucas_Room_Touch/Lu_Hi_I'm_Lucas`
- `Intro/Lucas_Room_Touch/Lu_Wondering`
- `Lu_Brave`
- `Lu_Hi_Im_Lucas`
- `N2/Lu_Laugh_03_Tummy_Hand_R`

### Room

- `Room_Game/Friends/Lu_N_Do you remember my name`
- `Room_Game/Friends/Lu_N_Yes I am Lucas L U C A S`
- `Room_Game/Lu_N_Idle`
- `Room_Game/Lu_N_Idle_EB`

### Music

- `Music_Game/Lu_Sexophone_P`
- `Music_Game/Lu_Sexophone`
- `Music_Game/Lu_Sexophone_R`
- `Music_Game/Lu_Trumpet_P`
- `Music_Game/Lu_Trumpet`
- `Music_Game/Lu_Trumpet_R`

### Garden and Activities

- `Toy_Garden/1_Lu_Dance_Put_Your_Hands_To_Roll_Over`
- `Toy_Garden/Happy_Jumping`
- `Toy_Garden/Happy_Jumping_Half_2`
- `Toy_Garden/Lu_Bath_Tube`
- `Toy_Garden/Lu_Bath_Tube_Loop`
- `Toy_Garden/Lu_Car_Drive`
- `Toy_Garden/Lu_Car_Drive_EB`
- `Toy_Garden/Lu_Football_Kick`
- `Toy_Garden/Lu_Hanging`
- `Toy_Garden/Lu_Hanging_2`
- `Toy_Garden/Lu_Hanging_P`
- `Toy_Garden/Lu_Hanging_R`
- `Toy_Garden/Lu_Piano_Jump`
- `Toy_Garden/Lu_Seat_Idle`
- `Toy_Garden/Lu_Seat_Idle_EB`
- `Toy_Garden/Lu_Seat_Sleep`
- `Toy_Garden/Lu_Seat_Sleep_Feather`
- `Toy_Garden/Lu_Seat_Sleep_Feather_Sneez`
- `Toy_Garden/Lu_Seat_Wondering`
- `Toy_Garden/Lu_Skateboard_Slide_Left_To_Right`
- `Toy_Garden/Lu_Skateboard_Slide_Left_To_Right_End`
- `Toy_Garden/Lu_Skateboard_Slide_Left_To_Right_Start`
- `Toy_Garden/Lu_Throw_Plane2`
- `Toy_Garden/Lu_Trampoline_3Jump`
- `Toy_Garden/Lu_Trampoline_3Jump_To_Idle`
- `Toy_Garden/Pop balloons/Lu_Look_To_Balloon`
- `Toy_Garden/Pop balloons/Lu_Pinout_&_Pop_Balloon`
- `Toy_Garden/Pop balloons/Lu_Popping_Pointing_Idle`
- `Toy_Garden/Pop balloons/Lu_Popping_Pointing_To_Idle`
- `Toy_Garden/Running_Going_To Garden`
- `Toy_Garden/Sitting On Horse_2`
- `Toy_Garden/Sitting On Horse_3`
- `Toy_Garden/Sitting On Horse_Idle`
- `Toy_Garden/Sitting On Horse_Idle_EB`
- `Toy_Garden/Woobly_Toy/Lu_Kick_Left`
- `Toy_Garden/Woobly_Toy/Lu_Laugh_Left`
- `Toy_Garden/Woobly_Toy/Lu_punch_Left`

`LucasTouchController` also calls `SetAnimation(0, clipFullName, loop: false)`. That name is assembled at runtime, so touch/activity animation coverage cannot be fully recovered from static string searches alone. The list above is therefore the explicit controller-call inventory, not a guaranteed complete list of every animation in each skeleton.

## Visual Rig Inventory

All verified atlas pages use Spine scale `0.3` in their atlas metadata.

| Context | Atlas / skeleton | Atlas page | Page size |
| --- | --- | --- | ---: |
| Garden | `Lucas_Toy_Garden.atlas` / `Lucas_Toy_Garden.skel` | `Lucas_Toy_Garden.png` | 828 x 828 |
| Room | `Lucas_Room_Game.atlas` / `Lucas_Room_Game.skel` | `Lucas_Room_Game.png` | 876 x 876 |
| Activity game | `Lucas_Activity_Kids_Game.atlas` / `Lucas_Activity_Kids.skel` | `Lucas_Activity_Kids_Game.png` | 860 x 860 |
| Activity intro | `Lucas_Activity_Kids_Intro.atlas` / `Lucas_Activity_Kids_Intro.skel` | `Lucas_Activity_Kids_Intro.png` | 732 x 732 |
| Ice-cream activity | `Lucas_Activity_Icecream.atlas` / `Lucas_Activity_Icecream.skel` | `Lucas_Activity_Icecream.png` | 1100 x 1100 |

The activity-game atlas and skeleton filenames do not match exactly. Both extracted files are included, but their pairing is tentative and should be confirmed by loading the skeleton against the atlas in the target Spine runtime. Garden, room, activity-intro, and ice-cream sets have matching atlas/skeleton names.

The garden bundle also contains independently extracted sprites named for body, torso, tail, hands, face, eyes, brows, nose, and expressions. The numbered variants are kept as extracted; their exact rig/variant mapping has not been established. See the asset manifest for the copied filenames and original paths.

## FX Evidence

The extracted resource catalog references these effects in Lucas-related interactions or nearby gameplay: `dust_skidIntro`, `Lucas_Zzz`, `LucasDizziness`, `balloon_Pop1` through `balloon_Pop3`, `Balloons_Appear`, `Punch_Hit`, `Tree_Shaking_Leaf_1` through `_3`, `Bushes_Shaking`, `TransitionParticle_Plane`, `TransitionParticle_FootBall`, `TransitionParticle_Horse`, and `Radio`. Controller code also references piano particle release and car particles.

The collection includes likely reusable texture inputs (smoke, water splash/drop, confetti, flash, glitter, shine, twinkles, and fire). These are texture candidates from the relevant extracted bundles, not proof that each texture belongs exclusively to Lucas or to a specific named effect. The actual particle prefab/configuration assets are not individually present in the gathered source files, so the resource-catalog names above are references, not copied prefab implementations.

## Source References

- `re/src/Assembly-CSharp/LucasAnimationControl.cs` - garden status enum and activity animation/FX behavior.
- `re/src/Assembly-CSharp/LucasRoomCharacterAnimations.cs` - room character animation behavior.
- `re/src/Assembly-CSharp/LucasRoomAnimations.cs` - room interactions and transitions.
- `re/src/Assembly-CSharp/LucasTouchController.cs` - dynamically selected touch clips.
- `re/src/Assembly-CSharp/LucasBalloonPopScreen.cs` - balloon reward clips.
- `re/src/Assembly-CSharp/SpawnPartilcleControl.cs` - shared particle effect control.
- `re/prefabs/resources.assets.json` - extracted resource catalog FX references.

Copied assets and their original paths are listed in [`re/character_assets/lucas/MANIFEST.md`](../character_assets/lucas/MANIFEST.md).
