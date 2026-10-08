# Motif + Typography Systems

PR 20 specializes the existing MOTIF and TYPOGRAPHY_KIT Creative Library types
so recurring visual ideas and on-screen text are explicit, reusable systems
rather than loose prompt fragments.

## Motifs

A motif version records:

- motif type;
- visual signature;
- semantic function;
- introduction;
- recurrence mode and cue guidance;
- optional minimum and maximum occurrence guidance;
- evolution across the video;
- allowed variation rules;
- prohibited uses;
- continuity guidance; and
- optional provider-specific interpretation hints.

Recurrence modes distinguish fixed repetition, escalation, evolution, callbacks
and conditional appearances. This gives later storyboard planning enough
information to place a motif deliberately rather than sprinkling it randomly.

## Typography

A Typography Kit contains explicit text roles such as title, section heading,
lyric, lower third, caption and credit. Each role can specify family, fallback,
weight, style, case, tracking, line height, alignment and maximum lines.

The kit also records the global system for:

- placement and safe areas;
- color;
- outline/shadow treatment;
- texture;
- motion;
- entrances and exits;
- timing against music/picture;
- compositing;
- accessibility;
- exclusions; and
- provider-specific hints.

Font-family fields are descriptive references only. The application does not
bundle or redistribute font files.

## Versioning and reuse

Both systems use the existing CreativeModule/CreativeModuleVersion model.
Publishing locks an exact reusable version. Creative Kits and project →
sequence → shot inheritance can pin those versions without live-link mutation.

PR 20 does not yet place motifs or typography on storyboard frames. The
storyboard and shot-specification PRs consume these exact systems next.
