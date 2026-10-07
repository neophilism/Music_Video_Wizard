# Visual Aesthetic Builder

PR 18 turns the generic `VISUAL_AESTHETIC` Creative Library object into a structured, usable visual-style builder.

## Why it is structured

An aesthetic is not stored as one opaque prompt. Each version records explicit decisions for:

- medium and realism;
- movement / stillness character;
- texture and surface qualities;
- color treatment and named palette colors;
- saturation and contrast;
- grain;
- lighting quality, direction, temperature, practicals and shadows;
- edge treatment;
- lens artifacts;
- period characteristics;
- rendering characteristics;
- optional provider-specific hints;
- positive prompt language;
- negative prompt / exclusions;
- exact reference asset versions; and
- one optional exact reference asset designated as the preview.

That structure lets later storyboard, prompt-compilation and generation stages reason about individual decisions instead of copying a paragraph blindly.

## Preview

The builder renders an immediate provider-neutral style card while the user edits. Palette, medium, realism, tonal settings, texture, lighting and rendering choices remain legible before any media-generation provider is involved.

A visual reference can also be designated by exact READY AssetVersion ID. It is included in the same immutable reference set as the rest of the aesthetic references.

## Versions and reuse

Visual aesthetics use the existing Creative Library model:

- the logical CreativeModule has a durable name, description and tags;
- each revision is a separate CreativeModuleVersion;
- publishing locks a reusable version;
- later versions never rewrite an old project; and
- exact references and semantic fingerprints preserve provenance.

The general Creative Library still supports other module types. The specialized builder is used for `VISUAL_AESTHETIC` modules so the saved definition cannot silently degrade into arbitrary JSON.

## Inheritance and overrides

The existing creative-inheritance engine remains the source of truth. A published aesthetic version can occupy the normalized `visual-aesthetic` slot on a draft project, sequence or shot scope.

Resolution follows the established project → sequence → shot order. A sequence can deliberately override the project aesthetic; a shot can deliberately override both. Because each binding points to an exact CreativeModuleVersion, editing or publishing a later aesthetic version does not mutate existing scopes.

PR 18 does not compile provider prompts or generate images/video. Those later systems consume the exact structured aesthetic version through the same dependency and inheritance graph.
