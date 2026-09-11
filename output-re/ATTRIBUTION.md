# Asset credits

## User-provided soundtrack

`music/guren-no-yumiya.m4a`: **Guren no Yumiya — Linked Horizon**. Supplied by the user as the Desktop file `Shingeki no Kyojin S1 OP1  Linked Horizon  - Guren no Yumiya (Lyrics with English Translation).mp4` on September 10, 2026. Extracted using macOS `afconvert -f m4af -d 0`, which copies the original AAC audio packets without re-encoding. The original Desktop video is unchanged. Playback starts and repeats at 20 seconds; the source recording itself is untrimmed. This soundtrack is separate from the Creative Commons environment and character assets below.

## Environment textures

Locally bundled 1K diffuse, OpenGL normal, and roughness maps by **Rob Tuytel**, distributed by **Poly Haven** under **CC0**:

- `materials/roof_*`: [Roof 09](https://polyhaven.com/a/roof_09)
- `materials/stone_*`: [Cobblestone Floor 03](https://polyhaven.com/a/cobblestone_floor_03)
- `materials/plaster_*`: [Rough Plasterbrick 05](https://polyhaven.com/a/rough_plasterbrick_05)
- License: https://polyhaven.com/license

## Generated sky and cloak artwork

`sky/anime-clouds.webp` and `characters/scout-cloak.webp` were generated for this fan prototype with the built-in image generation tool. Full prompts, paths, and method are documented in [ART_GENERATION.md](ART_GENERATION.md). They are not official anime assets.

## Fonts

**Barlow Condensed** by Jeremy Tribby and **Cormorant Garamond** by Christian Thalmann are bundled from the [Google Fonts repository](https://github.com/google/fonts) under the SIL Open Font License. Their license files are included in `fonts/Barlow-OFL.txt` and `fonts/Cormorant-OFL.txt`.

## Character models

`titans/titan_standard.glb`: **AoT 4 - Attack Titan Grisha Jaeger (3D Model)** by **HiGuys920**.

- Source: https://sketchfab.com/3d-models/aot-4-attack-titan-grisha-jaeger-3d-model-6b713f382a2d415c8ede4ae8c23b6940
- Author: https://sketchfab.com/higuys920
- Asset license stated by its author: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/
- Download source: the public Allen Institute Objaverse GLB archive, https://huggingface.co/datasets/allenai/objaverse/blob/main/glbs/000-152/6b713f382a2d415c8ede4ae8c23b6940.glb
- Runtime changes: normalized scale, material tuning, omission of the chest-hair overlay with a missing transparency mask, procedural walk poses and two-bone arm inverse kinematics; used for the standard Attack Titan encounter and the original grapple mode.

`characters/levi.glb`: **Levi Ackerman VR/Game Ready** by **TKSAET**.

- Source: [Levi Ackerman VR/Game Ready](https://sketchfab.com/3d-models/levi-ackerman-vrgame-ready-41ba2beb495c423fa576580696994d63)
- Author: [TKSAET](https://sketchfab.com/tksaet)
- License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/), as stated on the download page and embedded in the GLB.
- Downloaded with the user's authorized Sketchfab account on September 9, 2026, using the GLB / 4K texture option. The self-contained, unmodified source file is bundled locally; no account or remote request is required at runtime.
- Runtime adaptations: normalized height and hip origin, nonmetallic material tuning, original texture colors and alpha masks retained, rest-relative bone posing, two-bone arm IK, wrist orientation, and curled fingers. The source's test animation is replaced by gameplay flight, grounded, and slash poses. Supplemental ODM hardware, swords, and animated Scout cloak are authored in `src/characters/LeviEquipment.ts`.

The former procedural fan character in `src/characters/LeviModel.ts` remains as an asset-load fallback. These are fan assets, not official studio character models.

Attack on Titan, Captain Levi, the Scout insignia and Titan character designs belong to their respective rights holders. Asset uploader license labels do not grant rights to the underlying franchise. This project is a private fan prototype as described in its source specification.

## Expanded Titan roster

The following locally bundled GLBs are added for the user's expanded runner roster. Each source page and embedded GLB identifies the asset as CC BY 4.0. The original downloads are retained without modifying their geometry or textures; runtime adaptations normalize scale, tune nonmetallic materials, map bones, pose the limbs/head, and add encounter-specific motion. Animation, steam, effects, and arcade gameplay are authored for this prototype.

- `titans/armored.glb`: **Armored titan**, uploaded by **Dat Boi / PotBin**. [Model](https://sketchfab.com/3d-models/armored-titan-e9385c16f5584618ae3a3289ff59904a), [uploader](https://sketchfab.com/PotBin), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Downloaded through the user's authorized Sketchfab account, GLB / 2K option, September 9, 2026. The uploader identifies this as a model from the game *Attack on Titan 2*; credit for the underlying game asset belongs to its original creators and rights holders.
- `titans/colossal.glb`: **Colossal Titan**, by **Sidaivan**. [Model](https://sketchfab.com/3d-models/colossal-titan-e031a57fd4bf411f8e893361676b4544), [author](https://sketchfab.com/Sidaivan), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Downloaded from the public [Allen Institute Objaverse archive](https://huggingface.co/datasets/allenai/objaverse/blob/main/glbs/000-028/e031a57fd4bf411f8e893361676b4544.glb).
- `titans/jaw.glb`: **AoT 4 - Porco Galliard Jaw Titan (3D Model)**, by **HiGuys920**. [Model](https://sketchfab.com/3d-models/aot-4-porco-galliard-jaw-titan-3d-model-38ba8a362dfb44c4bf402adee9188bcd), [author](https://sketchfab.com/higuys920), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Downloaded from the public [Allen Institute Objaverse archive](https://huggingface.co/datasets/allenai/objaverse/blob/main/glbs/000-101/38ba8a362dfb44c4bf402adee9188bcd.glb).

Roster source triangle counts are approximately 51.9K (Armored), 66.7K (Colossal), and 69.6K (Jaw). Gameplay scales are deliberately adapted to the city and automatic nape route; they are not canonical height measurements.

## Web delivery optimization

The original GLB geometry and rigs are preserved with lossless Meshopt encoding. Embedded images use high-quality WebP at their original dimensions; standalone sky, cloth, and architectural textures also use WebP. Source originals remain in `output/source-assets` outside the shipped site. `scripts/optimize-assets.mjs` records sizes in `output/asset-optimization.json`. Artist attribution and original licenses continue to apply.
