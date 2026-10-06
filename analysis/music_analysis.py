#!/usr/bin/env python3
import argparse
import json
import math
import os
import subprocess
import tempfile
from pathlib import Path

import librosa
import numpy as np

SCHEMA_VERSION = 1
SAMPLE_RATE = 22050
HOP_LENGTH = 512
ENGINE_VERSION = "1.0.0"


def finite(value, default=0.0):
    value = float(value)
    return value if math.isfinite(value) else default


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, finite(value)))


def ms(seconds):
    return int(round(finite(seconds) * 1000.0))


def percentile_normalize(values):
    values = np.asarray(values, dtype=np.float64)
    if values.size == 0:
        return np.zeros(0, dtype=np.float64)
    low = np.percentile(values, 5)
    high = np.percentile(values, 95)
    if high <= low + 1e-12:
        return np.zeros_like(values)
    return np.clip((values - low) / (high - low), 0.0, 1.0)


def decode_audio(input_path, ffmpeg_path, workdir):
    decoded = Path(workdir) / "decoded.wav"
    command = [
        ffmpeg_path,
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-i",
        str(input_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(SAMPLE_RATE),
        "-c:a",
        "pcm_f32le",
        str(decoded),
    ]
    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode != 0:
        raise RuntimeError(
            "FFmpeg audio decode failed: " + (completed.stderr.strip() or "unknown error")
        )
    return decoded


def waveform_summary(y, sr, duration):
    target_bins = max(200, min(2400, int(math.ceil(max(duration, 1.0) * 4.0))))
    edges = np.linspace(0, len(y), target_bins + 1, dtype=np.int64)
    result = []
    for index in range(target_bins):
        start = int(edges[index])
        end = int(edges[index + 1])
        chunk = y[start:end]
        if chunk.size == 0:
            minimum = maximum = rms = 0.0
        else:
            minimum = finite(np.min(chunk))
            maximum = finite(np.max(chunk))
            rms = finite(np.sqrt(np.mean(np.square(chunk, dtype=np.float64))))
        result.append(
            {
                "startMs": ms(start / sr),
                "endMs": ms(end / sr),
                "min": round(minimum, 6),
                "max": round(maximum, 6),
                "rms": round(rms, 6),
            }
        )
    return result


def choose_bar_phase(beat_frames, onset_env):
    if len(beat_frames) < 8:
        return {"meter": "4/4", "phase": 0, "confidence": 0.0, "barsMs": []}

    scores = []
    for phase in range(4):
        strengths = [
            finite(onset_env[frame])
            for idx, frame in enumerate(beat_frames)
            if idx % 4 == phase and 0 <= frame < len(onset_env)
        ]
        scores.append(float(np.mean(strengths)) if strengths else 0.0)

    order = np.argsort(scores)[::-1]
    best = int(order[0])
    second = scores[int(order[1])] if len(order) > 1 else 0.0
    confidence = clamp((scores[best] - second) / (abs(scores[best]) + 1e-9))
    return {
        "meter": "4/4",
        "phase": best,
        "confidence": round(confidence, 4),
    }


def local_maxima(values, threshold, minimum_distance):
    values = np.asarray(values, dtype=np.float64)
    if values.size < 3:
        return []
    candidates = []
    for index in range(1, len(values) - 1):
        value = finite(values[index])
        if value < threshold:
            continue
        if value >= values[index - 1] and value >= values[index + 1]:
            candidates.append((index, value))

    selected = []
    for index, value in sorted(candidates, key=lambda pair: pair[1], reverse=True):
        if all(abs(index - existing[0]) >= minimum_distance for existing in selected):
            selected.append((index, value))
    return sorted(selected, key=lambda pair: pair[0])


def structural_sections(y, sr, hop_length, rms_norm, duration):
    chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop_length)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=hop_length)
    columns = min(chroma.shape[1], mfcc.shape[1], len(rms_norm))
    if columns < 4:
        return [
            {
                "index": 0,
                "label": "section-1",
                "startMs": 0,
                "endMs": ms(duration),
                "meanEnergy": round(float(np.mean(rms_norm)) if len(rms_norm) else 0.0, 4),
            }
        ], [0, columns]

    features = np.vstack(
        [
            librosa.util.normalize(chroma[:, :columns], axis=1),
            librosa.util.normalize(mfcc[:, :columns], axis=1),
            rms_norm[:columns][np.newaxis, :],
        ]
    )
    estimated_count = max(2, min(16, int(round(max(duration, 1.0) / 20.0))))
    estimated_count = min(estimated_count, max(2, columns // 4))

    boundaries = list(
        map(
            int,
            librosa.segment.agglomerative(
                features, k=estimated_count
            ),
        )
    )
    boundaries = sorted(set([0, *boundaries, columns]))
    sections = []
    for index, (start_frame, end_frame) in enumerate(zip(boundaries, boundaries[1:])):
        start_time = librosa.frames_to_time(start_frame, sr=sr, hop_length=hop_length)
        end_time = min(
            duration,
            librosa.frames_to_time(end_frame, sr=sr, hop_length=hop_length),
        )
        energy_slice = rms_norm[start_frame:max(start_frame + 1, end_frame)]
        sections.append(
            {
                "index": index,
                "label": f"section-{index + 1}",
                "startMs": ms(start_time),
                "endMs": ms(end_time),
                "meanEnergy": round(
                    float(np.mean(energy_slice)) if len(energy_slice) else 0.0, 4
                ),
            }
        )
    if sections:
        sections[-1]["endMs"] = ms(duration)
    return sections, boundaries


def merge_transition_candidates(candidates, tolerance_ms=250, limit=80):
    ordered = sorted(candidates, key=lambda item: (-item["score"], item["timeMs"]))
    selected = []
    for candidate in ordered:
        nearby = next(
            (
                existing
                for existing in selected
                if abs(existing["timeMs"] - candidate["timeMs"]) <= tolerance_ms
            ),
            None,
        )
        if nearby:
            nearby["score"] = max(nearby["score"], candidate["score"])
            nearby["reasons"] = sorted(
                set([*nearby["reasons"], *candidate["reasons"]])
            )
            continue
        selected.append(
            {
                "timeMs": int(candidate["timeMs"]),
                "score": round(clamp(candidate["score"]), 4),
                "reasons": list(candidate["reasons"]),
            }
        )
        if len(selected) >= limit:
            break
    return sorted(selected, key=lambda item: item["timeMs"])


def analyze(input_path, ffmpeg_path):
    with tempfile.TemporaryDirectory(prefix="music-video-analysis-") as workdir:
        decoded = decode_audio(input_path, ffmpeg_path, workdir)
        y, sr = librosa.load(decoded, sr=SAMPLE_RATE, mono=True)
        if y.size == 0:
            raise RuntimeError("Decoded audio contains no samples.")

        duration = float(librosa.get_duration(y=y, sr=sr))
        rms = librosa.feature.rms(y=y, hop_length=HOP_LENGTH)[0]
        rms_norm = percentile_normalize(rms)
        onset_env = librosa.onset.onset_strength(
            y=y, sr=sr, hop_length=HOP_LENGTH
        )
        onset_norm = percentile_normalize(onset_env)

        tempo_value, beat_frames = librosa.beat.beat_track(
            y=y, sr=sr, hop_length=HOP_LENGTH, units="frames"
        )
        tempo_array = np.asarray(tempo_value).reshape(-1)
        bpm = finite(tempo_array[0]) if tempo_array.size else 0.0
        beat_frames = np.asarray(beat_frames, dtype=np.int64)
        beat_times = librosa.frames_to_time(
            beat_frames, sr=sr, hop_length=HOP_LENGTH
        )
        beat_ms = [ms(value) for value in beat_times]

        beat_strengths = [
            onset_norm[frame]
            for frame in beat_frames
            if 0 <= frame < len(onset_norm)
        ]
        beat_confidence = (
            clamp(float(np.mean(beat_strengths))) if beat_strengths else 0.0
        )

        bar_info = choose_bar_phase(beat_frames, onset_env)
        bar_phase = int(bar_info["phase"])
        bars_ms = [
            beat_ms[index]
            for index in range(bar_phase, len(beat_ms), 4)
        ]
        bar_info["barsMs"] = bars_ms

        energy_curve = [
            {
                "timeMs": ms(
                    librosa.frames_to_time(
                        index, sr=sr, hop_length=HOP_LENGTH
                    )
                ),
                "value": round(finite(value), 4),
            }
            for index, value in enumerate(rms_norm)
        ]

        sections, boundaries = structural_sections(
            y, sr, HOP_LENGTH, rms_norm, duration
        )

        structural_changes = []
        for boundary in boundaries[1:-1]:
            time_ms = ms(
                librosa.frames_to_time(
                    boundary, sr=sr, hop_length=HOP_LENGTH
                )
            )
            onset_score = (
                finite(onset_norm[min(boundary, len(onset_norm) - 1)])
                if len(onset_norm)
                else 0.0
            )
            left = rms_norm[max(0, boundary - 32):boundary]
            right = rms_norm[boundary:min(len(rms_norm), boundary + 32)]
            energy_delta = abs(
                (float(np.mean(right)) if len(right) else 0.0)
                - (float(np.mean(left)) if len(left) else 0.0)
            )
            structural_changes.append(
                {
                    "timeMs": time_ms,
                    "score": round(clamp(0.55 + 0.25 * onset_score + 0.2 * energy_delta), 4),
                    "kind": "section-boundary",
                }
            )

        novelty_peaks = local_maxima(
            onset_norm,
            threshold=0.72,
            minimum_distance=max(1, int(round(3.0 * sr / HOP_LENGTH))),
        )[:24]
        for frame, score in novelty_peaks:
            structural_changes.append(
                {
                    "timeMs": ms(
                        librosa.frames_to_time(
                            frame, sr=sr, hop_length=HOP_LENGTH
                        )
                    ),
                    "score": round(clamp(score), 4),
                    "kind": "novelty-peak",
                }
            )

        window = max(1, int(round(2.0 * sr / HOP_LENGTH)))
        drop_scores = np.zeros(len(rms_norm), dtype=np.float64)
        for index in range(window, max(window, len(rms_norm) - window)):
            pre = float(np.mean(rms_norm[index - window:index]))
            post = float(np.mean(rms_norm[index:index + window]))
            onset = finite(onset_norm[index]) if index < len(onset_norm) else 0.0
            jump = max(0.0, post - pre)
            drop_scores[index] = clamp(jump * 0.75 + onset * 0.25)

        drop_peaks = local_maxima(
            drop_scores,
            threshold=0.42,
            minimum_distance=max(1, int(round(4.0 * sr / HOP_LENGTH))),
        )
        drops = []
        for frame, score in drop_peaks[:16]:
            pre = float(np.mean(rms_norm[max(0, frame - window):frame]))
            post = float(
                np.mean(rms_norm[frame:min(len(rms_norm), frame + window)])
            )
            drops.append(
                {
                    "timeMs": ms(
                        librosa.frames_to_time(
                            frame, sr=sr, hop_length=HOP_LENGTH
                        )
                    ),
                    "score": round(clamp(score), 4),
                    "preEnergy": round(clamp(pre), 4),
                    "postEnergy": round(clamp(post), 4),
                }
            )

        candidates = []
        for item in structural_changes:
            candidates.append(
                {
                    "timeMs": item["timeMs"],
                    "score": item["score"],
                    "reasons": [item["kind"]],
                }
            )
        for item in drops:
            candidates.append(
                {
                    "timeMs": item["timeMs"],
                    "score": max(0.65, item["score"]),
                    "reasons": ["energy-drop"],
                }
            )
        for index, value in enumerate(bars_ms):
            candidates.append(
                {
                    "timeMs": value,
                    "score": 0.38 if index else 0.5,
                    "reasons": ["bar-boundary-candidate"],
                }
            )

        transitions = merge_transition_candidates(candidates)
        intro_end = sections[0]["endMs"] if sections else 0
        outro_start = sections[-1]["startMs"] if sections else ms(duration)

        return {
            "schemaVersion": SCHEMA_VERSION,
            "analyzer": {
                "engine": "librosa",
                "version": ENGINE_VERSION,
                "sampleRate": sr,
                "hopLength": HOP_LENGTH,
            },
            "durationMs": ms(duration),
            "waveform": waveform_summary(y, sr, duration),
            "tempo": {
                "bpm": round(bpm, 4),
                "confidence": round(beat_confidence, 4),
                "beatCount": len(beat_ms),
            },
            "beatsMs": beat_ms,
            "barCandidates": bar_info,
            "energyCurve": energy_curve,
            "sections": sections,
            "structuralChanges": sorted(
                structural_changes, key=lambda item: item["timeMs"]
            ),
            "drops": sorted(drops, key=lambda item: item["timeMs"]),
            "introCandidate": {
                "startMs": 0,
                "endMs": int(intro_end),
                "basis": "first-estimated-section",
            },
            "outroCandidate": {
                "startMs": int(outro_start),
                "endMs": ms(duration),
                "basis": "last-estimated-section",
            },
            "transitionCandidates": transitions,
            "transcript": None,
            "vocalPassages": [],
            "instrumentalBreakCandidates": [],
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--ffmpeg", default=os.environ.get("AUDIO_ANALYSIS_FFMPEG", "ffmpeg"))
    args = parser.parse_args()

    result = analyze(Path(args.input), args.ffmpeg)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
