# Music Analysis

PR 11 implements the first real automatic content stage in the wizard.

The finished song remains immutable. Analysis derives information from the
master audio and never edits, normalizes, remixes, replaces, or writes back to
the source.

## Core engine

The initial core analyzer is local and provider-neutral at the product layer:

- FFmpeg decodes every supported upload container to mono PCM for analysis.
- Librosa 1.0.0 performs beat/onset and feature analysis.
- The durable generation-job worker runs the analyzer asynchronously.
- The exact audio AssetVersion is registered as the upstream dependency.
- Every successful run creates a new immutable MusicAnalysisVersion and
  MUSIC_ANALYSIS domain-version node.

A future analyzer can be added as another GenerationKind.ANALYSIS provider
without changing the project or wizard domain model.

## Results

A successful analysis stores:

- exact duration;
- downsampled waveform min/max/RMS envelope;
- normalized energy curve;
- tempo estimate and confidence heuristic;
- beat positions;
- 4/4 bar-line candidates with an explicit confidence score;
- estimated structural sections;
- major section-boundary and spectral-novelty changes;
- energy-drop candidates;
- intro/outro candidates based on estimated section boundaries;
- ranked candidate editorial transition anchors;
- optional lyric transcript;
- timestamped vocal passages and instrumental-break candidates only when the
  transcription provider actually supplies timestamped segments.

The analyzer intentionally calls bars, sections, drops, intros/outros and edit
points **candidates**. PR 12's Music Map is where the user accepts, rejects,
renames, corrects, or adds musical anchors. The software does not present a
machine estimate as a creative fact.

## Optional lyrics

Lyric transcription is an independent adapter. The first configurable adapter
is OpenAI audio transcription.

Set:

    AUDIO_TRANSCRIPTION_PROVIDER=openai
    OPENAI_API_KEY=...
    AUDIO_TRANSCRIPTION_MODEL=gpt-transcribe

The default is AUDIO_TRANSCRIPTION_PROVIDER=none, so the core local analysis
has no external API dependency or usage cost.

When transcription returns text without timestamped segments, the transcript
is retained but vocal/instrumental timing is left empty rather than invented.

## Runtime requirements

The worker runtime requires:

- Python 3.12 or a compatible Python 3 installation;
- packages in analysis/requirements.txt;
- FFmpeg available on PATH (or AUDIO_ANALYSIS_FFMPEG set to its binary);
- the normal Node worker environment and access to configured asset storage.

A separate web process does not need Python or FFmpeg unless it also runs the
generation worker.

## Versioning and reproducibility

MusicAnalysis is the stable logical analysis identity for a project.
MusicAnalysisVersion is append-only output for a particular run.

Each version stores:

- analyzer key/version;
- exact master AssetVersion;
- durable GenerationJob;
- optional transcription provider/model;
- complete result JSON;
- semantic fingerprint;
- dependency edges and generation-output provenance.

Re-running analysis never mutates a previous result.

## Wizard behavior

Starting analysis atomically writes the generation job and marks the Music
Analysis stage IN_PROGRESS in the same PostgreSQL transaction used by pg-boss.

On success the worker:

1. persists the immutable analysis version;
2. attaches the output node to the GenerationJob;
3. updates the master duration metadata;
4. completes the Music Analysis wizard stage;
5. marks already-touched downstream wizard stages NEEDS_REVIEW only when the
   semantic analysis fingerprint changed.

Locked Music Analysis stages cannot be re-run within that ProjectVersion.
