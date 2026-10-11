> **Canonical PR roadmap:** [`registry/roadmap.json`](../registry/roadmap.json). This detailed plan remains intact as the historical scope source; agents must edit the canonical file for PR counts and mapping.

# Music_Video_Wizard: original development plan (complete recovery)

**Source:** ChatGPT Library original `Music_Video_Wizard_and_Development_Plan.docx`. Full extracted text is preserved below. **This is the original planning source**, not a current implementation-completion assertion.

**Handoff:** Inspect the current README, `docs/` and `.exechub/project.yml` if present; reconcile the plan with merged PRs, CI, dependencies and real deployments. Never infer that a plan milestone is completed from the original specification.

**Context:** Original October 6 comprehensive product/workflow and 23-PR first-release plan. The newer 63-unit roadmap is a separate implementation tracking baseline; do not replace either or equate PR numbers.

---

MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 1
Music Video Wizard
Complete creative workflow and development plan
Review edition • 6 October 2026 • Working product name
1. Product definition
Build a web application that guides an artist from an audio track and an idea to a completed, downloadable music 
video. The core workflow is: understand the music, develop a concept, design its visual world, plan scenes and shots, 
test the storyboard against the music, approve initial frames, direct and generate moving clips, edit them over the 
original audio, finish, and export.
The artist remains the director. AI can offer ideas, translate direction into structured plans, generate assets, and 
suggest edits. It must preserve the artist's decisions and expose the actual instructions sent for generation. Assistance
should be available at every stage without becoming compulsory.
This document covers planning only. Implementation starts after approval of the wizard and development plan and 
receipt of the repository. Stack choices below are recommendations to validate against that repository. No provider, 
subscription, deployment, or spending commitment is made here.
The first release must complete the entire workflow inside the application. It is not complete when it merely exports 
prompts or sends users to other websites to generate the essential assets. Importing externally made assets is a 
supported creative option and a fallback.
2. Experience principles
A connected production workspace
The wizard is the guided route through one persistent project. Users can return to any step, work on a single shot 
from concept to clip, or jump between the storyboard and timeline. Finished work remains available when earlier 
decisions change. The application tracks what needs review rather than erasing later stages.
Offer a guided view with the essential decisions and an expanded view with additional controls. A user can provide 
almost everything manually, request drafts at selected stages, or delegate an explicitly bounded batch. Automation 
level can differ by stage, scene, and shot. There is no universal automation setting that overrides locked decisions.
Every step has the same interaction contract
 Hear the relevant part of the song while working.
 Start from an empty canvas, an uploaded reference, a typed idea, a sketch, or an AI draft as appropriate.
 Edit structured fields and plain-language direction; show conflicts between them and let the user resolve 
precedence.
 Ask for alternatives or refine only a selected portion.
 Lock specific fields, choose the scope of a change, and preview affected work.
 Compare versions and undo; an AI response creates a draft rather than silently replacing an approved version.
 Continue when prerequisites are satisfied; explanatory warnings should not force adoption of AI suggestions.
Creative freedom without form fatigue
Do not require users to fill every cinematography field for every shot. Sensible defaults inherit from project, scene, or 
character references; overrides stay visible. Natural-language direction can populate editable fields. Keyboard 
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 2
shortcuts, bulk changes, reusable motifs, duplication, and optional skipping of nonessential steps reduce repetition. 
Optional branches such as captions, narrative dialogue, titles, or performance sync remain optional.
Examples of useful instructions include: "Keep the person and framing; change only the lighting," "Make the chorus 
visually enormous without faster cuts," "Allow deliberate color inconsistency in the dream sequence," and "Keep the 
storyboard; show me three alternate endings."
Workspace layout
 Persistent step navigation shows complete, in progress, needs review, and not started states.
 Main area presents the active canvas: waveform, concept cards, reference board, storyboard, image canvas, clip 
comparison, or editing timeline.
 Context panel contains direction, references, controls, assistance, and history.
 Collapsible bottom transport plays the song or current sequence and shows timecode and musical markers.
 Project status shows coverage, unresolved dependencies, queued tasks, and estimated or actual spending where 
available.
 A shot drawer exposes one shot's purpose, timing, storyboard, initial-frame versions, motion plan, takes, and 
timeline uses.
Desktop is the primary production surface. Smaller screens support concept work, reference uploads, approvals, and 
preview; timeline interactions need a specifically designed compact view rather than a squeezed desktop layout. 
Keyboard navigation, labeled controls, readable contrast, and reduced-motion preferences are part of the 
implementation.
3. The sixteen-step wizard
Step 1 — Set up the project and choose the music
Purpose: establish the soundtrack and delivery target before making timing-dependent decisions.
Inputs: title, track upload, optional lyrics, artist notes, reference material, output aspect ratio, frame rate, desired 
duration or excerpt, and generation budget preference. Support vocal tracks and instrumentals. Optional stems can 
assist analysis but are not required. Users may upload images or video they already want included.
Creative controls: choose the full track or mark an excerpt; define visual lead-in or tail; choose whether sound effects 
or additional dialogue may be used; set a preferred master format. Preserve the source audio as an immutable asset. 
Analyze a working copy and create a playback proxy without overwriting the original.
Assistance: validate the media, explain incompatible inputs, and suggest project defaults. Ask for target orientation 
before producing final frames. Avoid forcing the user to select a model or technical codec immediately.
Output and continuation: a saved project, playable soundtrack, source metadata, and explicit time bounds. Audio 
must be playable or deliberately deferred for concept-only work; timing-dependent production remains blocked until 
a valid soundtrack exists. Audio replacement later creates a new version and triggers timing review.
Step 2 — Map the music
Purpose: make the video's pacing respond to the track rather than to a generic beat grid.
Inputs: audio, optional supplied lyrics and stems, manual markers, and a description of the song's emotional 
movement.
Creative controls: rename or redraw song sections; tap or correct tempo; mark beat changes, pickups, pauses, solos, 
significant lyrics, climaxes, and deliberate moments of stillness. Draw an editable energy curve and label emotional 
turns. Choose beat-based, phrase-based, narrative, free-flowing, or mixed pacing. Allow "do not cut here" ranges and 
deliberately offbeat cuts.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 3
Assistance: suggest section boundaries, beats, lyric timing where available, and structural landmarks. Display 
uncertainty. Transcription of sung lyrics is a draft; supplied lyrics and manual correction take priority. Beat and section
analysis must tolerate irregular meter and instrumental music.
Output and continuation: an editable music map with absolute times and optional musical labels. A manual map is 
sufficient; the wizard must work if automated analysis is unavailable or wrong.
Step 3 — Write the creative brief
Purpose: state what this video should make a viewer feel and remember.
Inputs: music map, interpretation of the song, intended audience or viewing context, initial idea, references, 
preferences, and exclusions.
Creative controls: specify theme, emotional trajectory, visual density, symbolism, literal versus abstract 
interpretation, narrative versus performance versus hybrid form, seriousness or humor, ending, and essential 
moments. List required images and things to avoid. Indicate whether the song's meaning should be followed, 
contrasted, or left open.
Assistance: ask targeted questions only where a decision matters; distill rough notes into an editable brief. Offer a 
blank brief for users who already know what they want. Keep reference annotations separate from instructions to 
copy a work.
Output and continuation: a versioned brief with priorities and explicit boundaries. Advanced users can proceed with a
short idea rather than completing every field.
Step 4 — Explore and choose a concept
Purpose: develop a strong central idea before generating expensive assets.
Inputs: approved brief, user concepts, uploaded mood references, and music map.
Creative controls: request a chosen number of alternatives; develop one original idea; combine selected elements; 
revise setting, point of view, metaphor, premise, opening image, visual hook, or ending. Compare ideas along user￾chosen criteria such as emotional impact, originality, feasibility, continuity burden, and estimated generation effort. A
user can approve a self-written concept without AI scoring.
Assistance: propose meaningfully different treatments of the brief, flag an idea's likely production difficulty, and 
explain its relationship to specific moments in the music. Do not disguise variations of one idea as distinct options.
Output and continuation: a selected concept version with a concise premise, opening, progression, signature 
moments, and ending. Unselected ideas stay in a concept library and can be restored or used in another project.
Step 5 — Develop the treatment and visual arc
Purpose: turn the selected idea into a coherent full-track experience.
Inputs: concept, music map, required moments, and performance or narrative choices.
Creative controls: write or edit the treatment by song section; define story events or an abstract progression; 
determine reveals, recurring symbols, emotional peaks, and final image. Adjust how much is shown or withheld. Plan 
repeated chorus material versus evolving imagery. Permit an entirely nonnarrative arc.
Assistance: draft an opening-to-ending treatment, identify unresolved story logic, and suggest motifs or visual 
transformations. Present suggestions with the relevant song section. Preserve intentional ambiguity and user-defined 
discontinuity.
Output and continuation: a treatment and section-to-visual map. Every in-scope portion of the soundtrack has a visual
intention, even if that intention is a sustained image or deliberate darkness.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 4
Step 6 — Establish the visual language
Purpose: create an approved visual vocabulary that future shots can inherit.
Inputs: treatment, reference images, palettes, style notes, and optional user artwork.
Creative controls: choose medium, era, realism, palette, contrast, lighting, texture, grain, framing, camera character, 
composition, depth of field, and rules for visual evolution. Combine styles by section or layer rather than enforcing 
uniformity everywhere. Assign references specific purposes: lighting, pose, composition, palette, setting, or texture.
Assistance: convert prose into a visual bible and generate a small, user-sized set of look tests. Compare those tests 
with the soundtrack. Explain which requested controls are descriptive instructions and which are enforceable model 
parameters.
Output and continuation: a versioned visual bible with selected look tests, inherited defaults, and allowed deviations. 
Uploaded reference boards can satisfy this step without generated tests.
Step 7 — Build the cast, locations, and continuity references
Purpose: define recurring things precisely enough to recognize them across shots.
Inputs: visual bible, treatment, subject references, character descriptions, wardrobe notes, locations, and props.
Creative controls: define each character's identity, appearance, wardrobe variants, expression range, and evolution; 
specify location geometry and key props; choose fixed or deliberately changing details. Establish screen direction and 
object-state continuity where important. Users may choose no recurring characters at all.
Assistance: produce editable character sheets, location views, and prop references; suggest missing views only when 
needed. Reference reuse improves consistency but cannot guarantee identical characters or physical motion across 
generated shots.
Output and continuation: a reference library with stable entity IDs, approved versions, scene assignments, and 
continuity rules. References involving real people include relevant user-supplied permission notes. Private source files
remain private by default.
Step 8 — Plan scenes and coverage
Purpose: organize the treatment into manageable visual units before defining individual shots.
Inputs: treatment, music map, visual bible, recurring entities, and budget preference.
Creative controls: add, split, reorder, or merge scenes; assign time ranges; choose narrative, performance, dance, 
animation, abstract, or mixed material; decide where footage can recur. Define a scene's purpose, emotional state, 
cast, location, major action, continuity, and coverage needs. Decide whether the chorus uses recognizable repeated 
imagery or entirely new scenes each time.
Assistance: draft a scene breakdown and coverage suggestions; identify uncovered music ranges or unusually complex
scenes. Show that cost depends on unique generated material, takes, and usable duration rather than merely the 
number of cuts.
Output and continuation: a timed scene plan covering the intended video. A montage can be one scene with many 
shots. Scene planning is editable at all later stages.
Step 9 — Design the shots and storyboard
Purpose: specify the visual grammar and sequence in enough detail to test it.
Inputs: scene plan, reference library, music map, and sketches or images.
Creative controls: create or reorder shot cards; set intended duration, subject, action, framing, angle, camera 
behavior, scene role, symbolic purpose, transition intent, and musical anchor. Split or merge shots; add cutaways; 
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 5
repeat a motif; duplicate with controlled changes. Draw rough compositions, upload storyboards, use inexpensive 
thumbnails, or use written panels initially.
Assistance: suggest coverage, draft panels and shot descriptions, and flag contradictory directions. Permit 
unconventional composition and long takes. A user chooses whether to generate storyboard thumbnails; a thumbnail 
may later be promoted or refined into the final starting frame instead of being generated twice.
Output and continuation: stable shot IDs and a storyboard with intended timing. A shot is a planned visual unit; a take
is one generated or imported execution; a timeline placement is one use of a take. These must remain separate so a 
single take can be used multiple times.
Step 10 — Preview the storyboard as an animatic
Purpose: test the idea's pacing over the music before committing to full video generation.
Inputs: storyboard panels, intended timing, soundtrack, and transition notes.
Creative controls: play stills and placeholders as a timed sequence; adjust dwell time, cut positions, holds, scene 
order, openings, and ending. Use beat snapping or disable it. Compare alternate edits, deliberately leave silence or 
darkness where specified, and decide which areas need more or less visual activity.
Assistance: identify coverage gaps, visual repetition, or timing conflicts; offer a pacing alternative for a selected range.
Suggestions must not convert every musical accent into a cut.
Output and continuation: an approved animatic snapshot or a user-recorded decision to proceed while identified 
issues remain. Technical gaps must be resolved or explicitly represented as intentional elements before final 
rendering. This step establishes a shot-generation plan and preliminary budget.
Step 11 — Create and approve each shot's starting frame
Purpose: create the image that will guide each generated clip.
Inputs: shot description, storyboard, visual bible, approved entities, and any user-supplied image.
Creative controls: generate a chosen number of candidates; refine only composition, pose, lighting, background, 
wardrobe, or another selected detail; annotate or mask an area for editing when supported; crop with a visible 
preview; compare across a contact sheet and against adjacent shots. Users can use an uploaded or existing frame 
directly.
Assistance: assemble an editable image-generation brief from the locked project and shot rules. Identify likely motion 
problems such as an action already completed in the starting frame. Suggest corrections without replacing the frame.
Output and continuation: a selected frame version for each generated shot, with provider-compatible dimensions and
references. Imported finished video can bypass frame generation. A storyboard thumbnail is not automatically an 
approved final frame. Selection, generation, and approval are separate actions.
The generation input frame and the eventual first visible editorial frame may differ because of clip handles or 
trimming. Show both concepts clearly; image-to-video should not be presented as a guarantee of pixel-identical 
output at frame zero.
Step 12 — Direct motion and run a pilot sequence
Purpose: specify how the still image becomes a moving shot and verify the approach on representative material.
Inputs: approved starting frame, planned duration, shot purpose, adjacent shots, and music segment.
Creative controls: describe subject movement, camera movement, environmental movement, expression, direction, 
speed, action phases, desired ending, and things that should stay still. Describe motion at important moments where 
practical. Add a target ending frame or other guidance only for providers that support it. Set continuity mode: 
independent shots, matched scenes, or explicitly chained clips.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 6
Assistance: translate direction into the selected provider's supported inputs and visible prompt; validate duration, 
aspect ratio, and references. Distinguish requested motion from supported hard parameters. Explain when the 
planned editorial duration requires a longer source take, multiple clips, or extension.
Pilot: user selects a small representative set, such as one identity-sensitive shot, one movement-heavy shot, and one 
transition-sensitive shot. Generate and review them over the relevant music; revise the motion recipe and references.
The user controls the number of takes and spend.
Output and continuation: approved motion recipes and a tested path from frame to usable footage. A deliberate 
decision to skip the pilot is allowed. Precise singing, rapping, dance, or instrument synchronization is marked as a 
specialized capability rather than implied by ordinary image-to-video.
Step 13 — Generate clips and select takes
Purpose: create usable moving footage with control over batches, costs, and consistency.
Inputs: selected frames, motion recipes, supported provider settings, and shot-generation plan.
Creative controls: generate one shot, a scene, or a reviewed batch; set take count and spending caps; prioritize 
difficult shots; pause work not yet submitted; keep rejected takes; compare clips synchronized to the song; label why 
a take works or fails. Retry with specific changes, change provider explicitly, import another clip, or choose an already 
available take.
Assistance: recommend batch ordering and point out obvious artifacts or continuity questions as review aids. Offer 
targeted regeneration, extension where supported, or a revised shot design. Do not silently stretch or repeat footage 
to hide missing coverage.
Dependency behavior: independent shots can run concurrently within limits. Chained shots wait until the user selects 
the predecessor's ending frame or take. Rejected or changed predecessors mark dependent work for review. Artist￾approved discontinuity remains allowed.
Output and continuation: a take library with selected usable ranges, source duration, motion recipe, frame lineage, 
model settings, provider task IDs, and available cost data. A blocked or failed shot stays visibly unresolved; completed 
neighboring work remains usable.
Step 14 — Assemble and refine the edit
Purpose: sequence chosen footage over the exact soundtrack and shape the final film.
Inputs: animatic, selected takes, source in/out ranges, original soundtrack, and music map.
Creative controls: assemble from the storyboard; drag, trim, split, replace, ripple, slip, reorder, and reuse clips; choose
insert versus overwrite behavior; lock the music; snap to frames, markers, beats, or nothing; add intentional black or 
still holds. Support practical video layers and an optional sound-effects lane. Retiming, reversing, looping, or freezing 
a clip must be explicit user choices.
Assistance: draft an assembly, suggest alternate trims or swaps, or tighten a selected passage while preserving locked 
placements. Explain coverage conflicts: "This take supplies six usable seconds; this placement needs eight." Offer 
choices instead of disguising the difference.
Output and continuation: a versioned rough cut and then a selected fine cut with full coverage. A chosen take's 
source duration, its editorial use duration, and a transition's overlap remain distinct. Transitions consume explicit 
source handles or require another user-selected treatment.
Step 15 — Finish and review
Purpose: polish the selected edit and inspect the full video rather than only individual clips.
Inputs: fine cut, source assets, output specification, and optional text or sound-effect assets.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 7
Creative controls: choose cuts or transitions, adjust color and crop per shot or scene, add titles or credits if desired, 
control grain and other supported finishing effects, add lyric captions optionally, and balance optional sound effects 
beneath the original music. Preserve intentional visual variation. Keep audio processing opt-in; do not normalize or 
alter the artist's master by default.
Assistance: flag missing assets, empty coverage, frozen or black frames, inconsistent dimensions, audible 
discontinuities, title-safe issues, and potential continuity changes. Automated observations are candidates for review, 
not judgments about artistic merit. Screen for flash-risk patterns as a review aid without promising certification.
Review: frame stepping, full-screen playback, looped segments, timecoded notes, and return-to-shot revision. 
Technical blockers are distinguished from optional artistic notes. Run a low-cost server-rendered draft so the user can 
inspect the actual render path, not solely the browser approximation.
Output and continuation: an approved cut, resolved technical checks, and a final render specification. The user can 
retain documented artistic choices that differ from automated suggestions.
Step 16 — Render, download, and preserve the project
Purpose: deliver the completed music video and enough source material to revise it later.
Inputs: immutable approved timeline snapshot, available source assets, render settings, and chosen package 
contents.
Creative controls: select supported resolution, frame rate, aspect ratio, codec preset, title or caption versions, and 
included source materials. Show which deliveries require cropping or reframing and which would require new 
generation. A portrait version is a separate reviewed composition, not automatically an equivalent crop of the 
landscape master.
Rendering: run background work with progress, cancellation where feasible, retry, and clear failure messages. 
Preserve the snapshot used for each render. Verify actual duration, dimensions, playable codecs, complete coverage, 
and audiovisual alignment before marking the export ready.
Output: a downloadable video, optional caption file, selected frames and clips, storyboard and treatment, project 
manifest, and provenance/credit notes. A source package is optional because of size. A reopened project restores the 
edit and lineage when its referenced media are present. No automatic public publishing is included in the initial 
release.
4. Revision, approval, and dependency rules
Drafts, selections, and locks
All concepts, treatments, frames, takes, and timelines are versioned. Generation completion does not imply approval.
Keep the current selection distinct from previous versions and from hard locks. Locks can protect a field, entity, shot, 
placement, or soundtrack. Unlocking is explicit. Autosave stores draft edits; undo and checkpoints recover creative 
states.
Before an AI change, show its scope: this field, this shot, this scene, or the project. A request such as "change the coat
to white" must preserve other locked decisions. The application can constrain the request, but cannot guarantee a 
generative model changes only that detail; compare the resulting candidate before adoption.
How upstream changes propagate
Change What needs review What must remain intact
Replace audio or change excerpt Music map, timing, animatic, edit, renders Concepts, assets, original audio, prior cuts
Revise concept or treatment Relevant scenes and shots All existing frames and takes until replaced
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 8
Change character or style reference Linked frames, clips, continuity Unrelated shots and historical reference 
versions
Select a new starting frame Motion recipe and takes derived from the 
old frame
Old takes and uses pinned to them
Select a different take Placements configured to follow the shot 
selection
Pinned placements and render snapshots
Change a cut or title Browser preview and new render Generated footage and older exports
A needs-review indicator is not an order to regenerate. Offer keep, revise, regenerate selected items, or deliberately 
accept the mismatch. A timeline placement may follow the shot's selection or pin a specific take version. The user 
must see which behavior applies. Already published downloads or historical renders never change in place.
Useful checkpoints
Save named checkpoints at concept selection, treatment selection, visual-bible approval, animatic approval, frame 
selection, pilot review, rough cut, fine cut, and render. Branching alternatives can be represented as project 
snapshots initially; more complex simultaneous editorial branches can follow later.
5. Architecture and implementation strategy
Recommended stack
 Web application: TypeScript with React and a server framework such as Next.js, validated against the supplied 
repository. Use accessible existing component primitives with a custom production-workspace design.
 Relational data: PostgreSQL for accounts, project membership, structured plans, timeline revisions, jobs, 
dependencies, and usage records.
 Media: private S3-compatible object storage with signed upload/download URLs, resumable large uploads, 
metadata, and separate originals/proxies/renders. Do not put binary media in the relational database.
 Jobs: durable database job records and an outbox; a queue such as BullMQ/Redis handles dispatch. PostgreSQL 
remains the source of truth, not transient queue memory.
 Workers: separate processes for audio analysis, thumbnails/proxies, AI submissions and reconciliation, and 
FFmpeg rendering. Long operations must not run inside web requests.
 Playback: audio-led browser previews using proxies and a single timeline model. Media-element playback is 
useful but insufficient proof of frame-accurate final output.
 Rendering: FFmpeg in container workers with pinned builds, resource limits, scratch cleanup, and tested 
fonts/filter behavior.
 AI: separately replaceable text-planning, image-generation, and image-to-video adapters. Start with one 
supported provider per needed capability; add more after the first complete path works.
Service choices, library versions, hosting, and provider accounts are finalized during repository review. The 
infrastructure must support long-running workers and substantial media storage. Browser-only hosting cannot 
substitute for that backend.
Canonical project and media model
Entity Purpose
Workspace and ProjectMember Ownership, scoped permissions, future collaboration
Project and ProjectRevision Track, output target, wizard state, snapshots
AudioAsset and MusicMapRevision Immutable source, analysis, manual markers, corrections
Brief, ConceptVersion, TreatmentVersion Creative intent, alternatives, selected plans
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 9
VisualBibleVersion and ReferenceEntityVersion Style, cast, locations, props, inheritance
Scene and ShotVersion Purpose, references, action, intended timing, storyboard
FrameVersion and MotionRecipeVersion Approved image inputs and moving-shot direction
GenerationRequest and GenerationJob Provider inputs, task state, retries, reconciliation
ClipTake and Asset Media versions, source metadata, lineage, proxy references
TimelineRevision and Placement Track order, source ranges, timing, effects, audio policies
Approval, Lock, DependencyEdge, ReviewNote Creative control and affected-work review
RenderJob and ExportArtifact Exact inputs, output checks, downloadable versions
UsageReservation and UsageLedger Estimated commitments and reconciled actual usage
Every owned row and object-storage access is scoped to its workspace/project. Assets store checksums, verified 
media metadata, provider/model details when applicable, and lineage. Secrets are separate from project manifests 
and browser state.
Timing must have one source of truth
Store the project's frame rate as a rational value. Use integer project frames for editorial placement and exact source 
time bases or rational source positions for media ranges. Retain the source audio sample rate and sample-based 
offsets. Convert musical markers explicitly to timeline positions; do not rely on accumulated floating-point seconds.
The browser, animatic, validation, and renderer consume the same versioned timeline document. A separate 
compilation layer resolves placements, retiming, overlaps, crops, text, and audio policy into a render manifest. Mixed￾frame-rate imports are normalized to proxies but originals remain unchanged. Variable-frame-rate and rotation 
metadata are validated during ingest.
The project must define how the last partial audio frame is handled. Preview, render, and duration checks use that 
same rule. The source music is not time-stretched merely to fit footage. Default exports can transcode audio into the 
selected delivery codec; preserve the original source, and record any intentional processing.
AI orchestration and provider boundaries
Provider documentation confirms that image-to-video can use an input image and prompt and execute as an 
asynchronous task. Some services support first-and-last-frame conditioning. These are examples of available 
integration paths, not a commitment to a particular model. See the official references at the end.
Build a capability registry per provider/model: supported aspect ratios, resolution, source requirements, durations, 
reference images, ending frames, extension, seed support, audio behavior, cancellation, and known restrictions. Only 
expose supported hard parameters. A camera instruction expressed in a prompt remains guidance unless a 
documented endpoint supports an actual control.
Compile project, scene, entity, and shot instructions into a visible request. Preserve the user's raw direction and the 
final compiled prompt. A seed or stored prompt is provenance and may not reproduce an identical asset after a 
provider update.
Generation job states include draft, validated, reserved, queued, submitting, provider-running, acquiring-output, 
ready, failed, blocked, cancelled, and submission-unknown. Persist task IDs immediately. If submission times out after
possible provider acceptance, reconcile before retrying; if reconciliation is impossible, show an unknown outcome 
instead of automatically creating another paid request. Webhooks and polling must tolerate duplicates and out-of￾order events. Download successful outputs into owned storage promptly; never rely on expiring provider URLs for 
long-term playback.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 10
Cancellation stops unsubmitted local work. Submitted work is cancelled only if supported; show that stopping local 
polling may not stop provider work or charges. No silent provider fallback, prompt softening, or paid rerun. A blocked 
prompt returns a visible explanation and editable alternatives for the artist to choose.
Budget and runtime controls
Before a paid request, summarize the number of unique shots, takes, billable source seconds, image candidates, 
upscales, render/storage estimates, and uncertainty. Estimate cost from current configured rates; do not hard-code a 
price in the product plan. A 3-second timeline use may require buying a longer provider clip. Reused placements need
not create new generation charges.
Reserve budget atomically before dispatch so concurrent jobs cannot knowingly exceed the configured batch cap. 
Reconcile actual provider usage where available and label estimates as estimates. Provider-side charging, late usage 
reports, and account changes mean an application estimate is not a universal billing guarantee. Retries consume the 
approved retry allowance; changed scope or additional takes require a new user action or preauthorized batch 
allowance.
Queue tasks by project and capability; apply provider limits, maximum concurrency, per-project fairness, deadlines, 
and storage quotas. Cache derived previews and unchanged render segments by content hash where justified. Begin 
without prematurely distributing every service into a separate microservice.
Reliability, access, and privacy
Use server-side credentials, encrypted secret storage where needed, signed media URLs, scoped project 
authorization, and explicit export/share permissions. Validate uploaded content by probing actual media rather than 
trusting filenames. Restrict outbound asset fetching to controlled paths to prevent SSRF; execute rendering with 
argument arrays, process limits, and isolated worker environments. Never interpolate a user prompt or filename into 
shell commands.
Use optimistic concurrency on plans and timelines. Persist drafts and reconcile interrupted uploads and jobs. Establish
database backups, an asset-retention policy, deletion behavior, and restoration checks. Review notes and provenance
can store user permission information; avoid claiming that the application can certify all media rights. Do not promise 
provider confidentiality or training exclusions without verifying the chosen provider's contract and configuration.
6. PR milestones and acceptance criteria
PR numbers below identify the planned implementation sequence. Actual GitHub numbers will follow the repository's
existing history. Each milestone should leave main usable, use migrations for data changes, and ship a bounded, 
reviewable behavior with meaningful checks. Later PRs depend on the earlier infrastructure unless stated otherwise.
Phase A — Prove the media and persistence foundation
PR 1 — Project foundation and implementation contracts
Deliver: repository setup, CI, configuration validation, local-development instructions, architecture decisions, schema 
conventions, shared types, and a small legally usable synthetic-media fixture. Define the canonical timeline, asset 
lineage, and provider interfaces before competing formats emerge.
Acceptance: a fresh checkout builds and runs; missing configuration produces actionable errors; the fixture and timing
contract are documented. No fake generation is presented as real.
PR 2 — Accounts, projects, and scoped ownership
Deliver: authentication integration, workspaces, project create/open/rename/archive, membership schema, 
persistence, and authorization. Collaboration UI can wait; ownership cannot.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 11
Acceptance: users can resume their projects; account A cannot read, modify, export, or guess media from account B 
through direct API requests or signed URLs.
PR 3 — Asset ingest and playable audio
Deliver: private uploads, resumable ingest, checksums, verified metadata, upload failure recovery, 
waveform/playback proxies, thumbnails, and source preservation. Implement Step 1.
Acceptance: supported audio and sample image/video uploads survive reload; corrupt and incompatible media 
produce clear errors; a large interrupted upload resumes without creating conflicting assets.
PR 4 — Canonical timeline and media timing
Deliver: rational frame rates, integer placements, source-range mapping, music markers, coverage validation, timeline
revisions, and optimistic concurrency. Define trimming and transition-handle semantics.
Acceptance: fixtures covering mixed frame rates, fractional frame rates, repeated placements, source bounds, and 
audio end handling serialize consistently and validate correctly.
PR 5 — Durable jobs and an early render proof
Deliver: persistent job records, outbox, worker queue, progress, retry/cancellation, storage acquisition, and a minimal
server render using imported clips over the audio. This is a technical proof, not the final editor.
Acceptance: a three-shot fixture renders to a playable video with verified alignment and duration; a restarted worker 
recovers work; retry does not create duplicate export records. Establish browser-to-server timing comparison early.
PR 6 — AI broker, capabilities, and usage controls
Deliver: text/image/video adapter contracts, initial chosen text provider, capability registry, typed request 
compilation, provenance, reservations, quotas, and server-side credentials. Add deterministic test adapters only in 
clearly labeled development/test modes.
Acceptance: capability validation rejects unsupported settings; duplicate submission events do not duplicate 
reservations; unknown submission outcomes are surfaced; concurrent jobs obey a batch cap. Live image/video calls 
arrive in later PRs.
Phase B — Build the complete creative planning workspace
PR 7 — Editable music map
Deliver: Step 2 waveform markers, section boundaries, tempo/beat suggestions, emotional annotations, optional lyric
import/correction, and manual analysis fallback.
Acceptance: an instrumental and an irregularly phrased vocal fixture can both be mapped; manual edits persist and 
are not overwritten by reanalysis.
PR 8 — Brief and concept laboratory
Deliver: Steps 3–4 brief editor, scoped assistance, concept alternatives, comparison, user-authored concepts, 
selection, and version history.
Acceptance: users can write and approve an original idea or refine an AI draft; a locked premise survives an ending￾only revision; unselected concepts remain recoverable.
PR 9 — Treatment and visual arc
Deliver: Step 5 treatment editor, section-to-visual mapping, narrative or abstract arcs, recurring motifs, and creative 
checkpoints.
Acceptance: an entire track has an editable visual intention; a nonnarrative video works without artificial character or 
plot requirements; a section revision preserves unrelated material.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 12
PR 10 — Visual bible and reference library
Deliver: Steps 6–7 uploaded boards, style rules, cast/location/prop entities, reference roles, inheritance, versions, and
controlled exceptions. Provide the structure for generated look tests; live generation is added in PR 13.
Acceptance: scenes can inherit a default and intentionally override it; a reference update identifies linked work 
without changing pinned historical versions.
PR 11 — Scene breakdown and storyboard
Deliver: Steps 8–9 scene planning, editable shot cards, sketches/uploaded panels, reordering, duplication, 
split/merge, timing, musical anchors, and coverage review.
Acceptance: shot IDs remain stable through reordering; one shot can have multiple future takes and uses; intentional 
repeated chorus imagery is represented without duplicate asset requirements.
PR 12 — Animatic playback and timing approval
Deliver: Step 10 audio-synchronized still sequence, editable durations/cuts, alternative snapshots, coverage checks, 
and approval state.
Acceptance: storyboard changes play at the correct music positions; the animatic and early renderer use the same 
timing model; existing images remain available after a timing change.
Phase C — Produce real frames and moving footage
PR 13 — Live image generation and shot-frame approval
Deliver: initial live image adapter, look tests, storyboard thumbnail assistance, Step 11 candidate generation, 
supported edits, uploads as alternatives, contact sheets, selected-frame lineage, and explicit approval.
Acceptance: a real image can be generated, persisted, compared, selected, and reopened; editing one detail creates a
candidate without replacing the approved frame. Unsupported masking or reference controls are not falsely exposed.
PR 14 — Motion direction and live image-to-video pilot
Deliver: Step 12 motion recipes, capability-aware duration choices, initial live video adapter, task tracking, provider￾output acquisition, and representative pilot playback over audio.
Acceptance: approved frames yield real persisted clips playable after provider URLs expire; submitted/polling work 
survives restart; pilot direction and actual source duration remain visible. Require a real paid-provider smoke check 
under an agreed test budget before calling integration complete.
PR 15 — Controlled batch generation and continuity dependencies
Deliver: Step 13 reviewed batch manifests, take counts, project fairness, queue control, spending reservations, 
independent versus chained shots, and scoped retries.
Acceptance: independent shots can complete out of order; a chained shot waits for the selected predecessor; failures 
do not lose successful takes; concurrent dispatch honors the batch allowance.
PR 16 — Take review and revision propagation
Deliver: synchronized take comparison, usable-range selection, rejection notes, targeted regeneration, imports, 
needs-review indicators, pinned versus following selections, and shot history.
Acceptance: selecting a new frame or take identifies only dependent work; previous cuts still resolve their exact 
versions; a user can keep an old take deliberately.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 13
Phase D — Finish a complete music video inside the application
PR 17 — Practical timeline editor
Deliver: Step 14 initial assembly, trim/split/move, ripple/slip, insert/overwrite, explicit repeat/retime/freeze, video 
layers, locked master audio, snapping, undo, and timeline snapshots.
Acceptance: a user can assemble the whole track using generated and imported takes; source bounds remain valid; 
audio does not move unless explicitly unlocked; coverage gaps are visible.
PR 18 — Finishing controls and preview consistency
Deliver: Step 15 transitions with handle validation, crop/reframe, basic color controls, titles, optional captions, 
optional sound effects, and clearly bounded supported effects.
Acceptance: preview and render fixtures agree on effect ordering, title placement, crop, overlaps, and soundtrack 
behavior; transitions cannot silently consume nonexistent frames.
PR 19 — Production render pipeline
Deliver: immutable render snapshots, final manifest compilation, robust FFmpeg workers, delivery presets, progress, 
cancellation, output acquisition, audio policy, and resource limits.
Acceptance: full-duration output has the specified dimensions and frame rate, correct selected audio, no unintended 
gaps, verified sync, and deterministic timeline interpretation. Reopening or editing the project does not alter an 
already queued render.
PR 20 — Quality review and downloadable project packages
Deliver: Step 15 issue review and Step 16 video downloads, optional captions, source selection, treatment/storyboard
export, provenance manifest, export history, and restoration using available assets.
Acceptance: users can download a completed video and restore a package into a new project; missing package media 
are reported rather than ignored; technical blockers and optional creative notes stay distinct.
Phase E — Make the complete path ready for real users
PR 21 — Full-workflow verification and recovery
Deliver: end-to-end verification across all sixteen steps, interrupted upload/job/render recovery, long-project 
performance, accessibility, responsive review, and user-facing error paths.
Acceptance: complete a representative full-length music video; also verify a short narrative fixture, an abstract 
instrumental, a repeated-shot montage, and a deliberate revision after generation. Check timing at the opening, 
section changes, and end. Complete one live-provider path and use deterministic fixtures for repeatable CI.
PR 22 — Usage and operator controls
Deliver: user cost history, estimates versus actual usage, quotas, worker health, queue monitoring, job inspection, 
provider failures, storage use, retention tools, and bounded administrative recovery actions. These support the 
requested workflow's resource needs.
Acceptance: an operator can identify a stuck or failed render without seeing unnecessary private prompt or media 
content; per-project spending and retention records reconcile; no key appears in logs or the client bundle.
PR 23 — Release readiness and deployment documentation
Deliver: security review, authorization checks, backup/restore rehearsal, deletion behavior, production configuration, 
migrations, provider preflight, worker/storage setup, operational runbook, and initial release deployment once 
authorized.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 14
Acceptance: deployment supports real asynchronous workers and private media; restoration is demonstrated; the full
workflow and known limitations are documented; no development-only adapter is reachable as a claimed live 
feature.
Milestone boundary: after PR 14, a real frame-to-video path works. After PR 20, the application completes a 
downloadable video end to end. After PR 23, that workflow has the operational and release checks needed for the 
first real release. Do not label the early planning UI or a mock-provider demonstration as the finished MVP.
Later PRs — Extend the working foundation
PR 24 — Creative collaboration and client review
Add editor/reviewer roles, timecoded comments, approval requests, invite flows, and scoped review links. 
Acceptance includes conflict handling and verified access expiration. The initial workspace/member schema already 
supports this direction.
PR 25 — Advanced performance and motion branches
Add separately validated singing/rap synchronization, choreography or performance-reference workflows, 
instrument-related direction, advanced ending-frame/extension controls, and richer continuity repair. Each feature 
needs a supported provider and a demonstrated result. Do not promise precise fingering or choreographic timing on 
the strength of generic video generation.
PR 26 — Alternate compositions and editing interoperability
Add reviewed portrait/square adaptations, multiple delivery branches, configurable higher-quality formats, and 
export to external editors using a validated interchange format. Demonstrate an actual import into a supported editor
before advertising interoperability. Add another image/video provider only where its capabilities materially improve 
the workflow.
Subscription billing, public galleries, automatic publishing, marketplace features, and training custom generative 
models are outside the first-release scope. They are not prerequisites for making a complete video.
7. Validation strategy and completion standards
Highest-risk checks
 Timing: no accumulating drift across a full track; fractional frame rates, audio sample offsets, source trims, 
repeated takes, and transition overlaps behave consistently.
 Paid jobs: interrupted submissions, duplicate callbacks, late status, restart recovery, concurrent reservations, and 
uncertain outcomes do not silently cause additional paid work.
 Versioning: historical frames/takes/cuts/renders resolve the exact versions that created them; scoped changes 
respect locks and identify affected work.
 Media: expiring provider links, corrupt files, orientation metadata, mixed source formats, missing audio, and 
source bounds receive explicit treatment.
 Access: project authorization applies to APIs, background jobs, signed URLs, exports, review links, and operator 
tooling.
 Creative quality: manually inspect identity-sensitive transitions, difficult motion, the full video arc, and 
consistency between direction and results. Automated tests cannot certify artistic quality or model adherence.
Use deterministic adapters and synthetic fixtures for repeatable checks; use small real-provider smoke tests for live 
contract validation. Run appropriate checks in each PR, then complete a full-length real creative project before 
release. Performance targets and upload/project limits should be measured and recorded after the first working 
render and provider pilot rather than invented now.
MUSIC VIDEO WIZARD | WORKFLOW & DEVELOPMENT
Review edition • 6 October 2026 | 15
Definition of complete first release
A new user can upload a track, provide an original brief, choose or write a concept, refine a treatment, establish 
references, build a storyboard, watch an animatic, generate and approve initial frames, direct and generate clips, 
choose takes, edit the whole video, finish it, download a verified playable export, and resume or revise the saved 
project. The app exposes costs and failures, preserves creative work, and needs no required manual media-processing
step outside the product.
8. Decisions for plan approval
Approve or revise the sixteen-step structure, the manual-versus-assisted interaction model, the continuity/reference 
approach, and the first-release boundary through PR 23. The recommended implementation begins with a real 
media-processing proof before building the full wizard, and later adds live image/video generation before polishing 
the final editor.
After repository access, validate existing code, select actual provider integrations and hosting based on demonstrated 
capability, put the approved plan in the repository, and begin PR 1. Early provider choices and small live test budgets 
need to be concrete before PRs that incur generation costs.
9. Official integration references
Checked 6 October 2026. These references support feasibility and implementation boundaries; exact capabilities, 
availability, prices, and contracts must be rechecked when adapters are implemented.
1. Runway API getting-started guide: image-to-video input image/prompt, task IDs, asynchronous results, and failure 
handling. https://docs.dev.runwayml.com/guides/using-the-api/
2. Runway API input parameters: media formats, limits, input delivery methods, and aspect-ratio handling. 
https://docs.dev.runwayml.com/assets/inputs/
3. Google documentation, generate videos using first and last video frames: endpoint-conditioning capability 
example. https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-first￾and-last-frames