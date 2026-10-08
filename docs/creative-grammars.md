# Creative Grammars

PR 19 turns the six grammar-oriented Creative Library types into structured,
versioned rule systems that downstream storyboard, shot specification and
generation stages can interpret consistently.

## Grammar families

The builder supports:

- cinematography grammar;
- composition grammar;
- motion grammar;
- performance grammar;
- editing grammar; and
- transition grammar.

Each remains a normal CreativeModule and CreativeModuleVersion, so the existing
library, kit, exact-version, dependency and inheritance behavior continues to
apply.

## Rules, not prose blobs

Every grammar version records:

- an intent;
- its intended scope;
- explicit rules;
- a rule strength: MUST, PREFER, MAY, AVOID or NEVER;
- an optional trigger describing when a rule applies;
- rationale;
- continuity guidance;
- explicit exceptions;
- provider-specific interpretation hints; and
- category-specific controls.

This makes the grammar machine-readable without pretending every creative
choice is absolute.

## Category-specific controls

Cinematography captures lens family, focal-length behavior, depth of field,
focus, exposure, camera height and angle.

Composition captures subject placement, negative space, symmetry, depth
layering, headroom, lead room and horizon behavior.

Motion captures camera movement, subject movement, stability, speed,
acceleration, motivation and start/stop behavior.

Performance captures presence, facial expression, body language, eyeline,
choreography, lip sync and interaction.

Editing captures cut logic, shot duration, rhythmic relationship, continuity,
montage, repetition and time manipulation.

Transitions capture the default transition language, match rules, temporal and
graphical bridges, audio-led transitions and prohibited transitions.

## Reuse and override behavior

Published grammar versions can be placed in Creative Kits or bound directly to
a draft project, sequence or shot through the existing inheritance engine.
Project rules establish defaults, sequence rules can deliberately override
them, and shot rules can override both.

PR 19 does not yet compile these grammars into individual storyboard frames or
shot specifications. That happens in the upcoming planning PRs.
