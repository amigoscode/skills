#!/usr/bin/env python3
"""
Beat-Sync Video Generator
Generates an MP4 where slides change on bass hits in the audio.

Usage:
    python3 beat-sync-video.py --slides-dir <path> --audio <path> --output <path> [--num-slides N] [--delta 0.3]
"""

import argparse
import glob
import json
import os
import subprocess
import sys

import librosa
import numpy as np


def detect_bass_hits(audio_path, num_needed, delta=0.3):
    """Detect bass hits in audio and return timestamps.

    Uses two strategies:
    1. Onset detection (bass hits) — good for tracks with clear, spaced drops
    2. Beat tracking with half-time — fallback for fast tracks where onsets are too dense

    If the best onset window has avg interval < 0.8s, switches to beat tracker
    with every-2nd-beat (half-time) for a more natural slide rhythm.
    """
    y, sr = librosa.load(audio_path, sr=22050)
    duration = librosa.get_duration(y=y, sr=sr)

    # Strategy 1: Onset detection (bass hits)
    y_bass = librosa.effects.preemphasis(y, coef=-0.97)
    onset_env = librosa.onset.onset_strength(
        y=y_bass, sr=sr, hop_length=512, aggregate=np.median
    )
    beats = librosa.onset.onset_detect(
        onset_envelope=onset_env, sr=sr, hop_length=512,
        backtrack=False, delta=delta
    )
    beat_times = librosa.frames_to_time(beats, sr=sr, hop_length=512)

    # Take every other onset for a slower, more readable pace
    if len(beat_times) >= num_needed * 2:
        halftime_onsets = beat_times[::2]
        if len(halftime_onsets) >= num_needed:
            selected, avg_interval = _find_best_window(halftime_onsets, num_needed)
            if avg_interval >= 1.5:
                print(f"Using every-other onset: avg interval {avg_interval:.2f}s", file=sys.stderr)
                return selected, duration

    # Try regular onsets if half-time didn't work
    if len(beat_times) >= num_needed:
        selected, avg_interval = _find_best_window(beat_times, num_needed)
        if avg_interval >= 1.5:
            print(f"Using onset detection: avg interval {avg_interval:.2f}s", file=sys.stderr)
            return selected, duration

    # Strategy 2: Beat tracker with every-4th-beat for readable pacing
    print("Onsets too fast or sparse, switching to beat tracker...", file=sys.stderr)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=512)
    all_beats = [float(t) for t in librosa.frames_to_time(beat_frames, sr=sr, hop_length=512)]

    # Filter beats after the intro (skip first 20% of track or first 10s)
    min_start = max(10.0, duration * 0.1)
    filtered = [t for t in all_beats if t >= min_start]

    # Take every 4th beat (~2 bars) for readable slide pacing
    every_4th = filtered[::4]

    if len(every_4th) >= num_needed:
        selected, avg_interval = _find_best_window(np.array(every_4th), num_needed)
        print(f"Using every-4th beat: avg interval {avg_interval:.2f}s", file=sys.stderr)
        return selected, duration

    # Fallback: every 2nd beat
    halftime = filtered[::2]
    if len(halftime) >= num_needed:
        selected, avg_interval = _find_best_window(np.array(halftime), num_needed)
        print(f"Using half-time beats: avg interval {avg_interval:.2f}s", file=sys.stderr)
        return selected, duration

    # Fallback: use regular beats
    if len(filtered) >= num_needed:
        selected, avg_interval = _find_best_window(np.array(filtered), num_needed)
        print(f"Using regular beats: avg interval {avg_interval:.2f}s", file=sys.stderr)
        return selected, duration

    # Last resort: even spacing
    print(f"Warning: not enough beats found. Using even spacing.", file=sys.stderr)
    interval = min(1.5, duration / num_needed)
    return [i * interval for i in range(num_needed)], duration


def _find_best_window(beat_times, num_needed):
    """Find the best consecutive window of num_needed beats with most consistent spacing."""
    best_score = float('inf')
    best_start = 0

    for i in range(len(beat_times) - num_needed + 1):
        window = beat_times[i:i + num_needed]
        intervals = np.diff(window)
        score = np.std(intervals)
        if score < best_score:
            best_score = score
            best_start = i

    selected = [float(t) for t in beat_times[best_start:best_start + num_needed]]
    avg_interval = float(np.mean(np.diff(selected)))
    return selected, avg_interval


def create_video(slides_dir, audio_path, output_path, beat_times, audio_duration):
    """Create MP4 with slides synced to beat times."""
    pngs = sorted(glob.glob(os.path.join(slides_dir, "*.png")))
    num_slides = len(pngs)

    if num_slides != len(beat_times):
        print(f"Warning: {num_slides} slides but {len(beat_times)} beats. Using first {min(num_slides, len(beat_times))}.", file=sys.stderr)
        count = min(num_slides, len(beat_times))
        pngs = pngs[:count]
        beat_times = beat_times[:count]

    # Calculate durations
    avg_interval = np.mean(np.diff(beat_times)) if len(beat_times) > 1 else 1.5
    concat_file = "/tmp/ffmpeg-beats-sync.txt"

    with open(concat_file, "w") as f:
        for i, png in enumerate(pngs):
            f.write(f"file '{os.path.abspath(png)}'\n")
            if i < len(beat_times) - 1:
                dur = beat_times[i + 1] - beat_times[i]
            else:
                dur = avg_interval
            f.write(f"duration {dur:.3f}\n")
        f.write(f"file '{os.path.abspath(pngs[-1])}'\n")

    total_video_dur = (beat_times[-1] - beat_times[0]) + avg_interval

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_file,
        "-t", f"{total_video_dur:.3f}",
        "-i", audio_path,
        "-vf", "scale=1080:1350",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffmpeg error: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    print(json.dumps({
        "output": output_path,
        "duration": round(total_video_dur, 2),
        "slides": num_slides,
        "beat_start": round(beat_times[0], 3),
        "avg_interval": round(avg_interval, 3)
    }))


def main():
    parser = argparse.ArgumentParser(description="Beat-sync video generator")
    parser.add_argument("--slides-dir", required=True, help="Directory with slide PNGs")
    parser.add_argument("--audio", required=True, help="Audio file path")
    parser.add_argument("--output", required=True, help="Output MP4 path")
    parser.add_argument("--delta", type=float, default=0.3, help="Beat detection sensitivity (lower = more beats)")
    args = parser.parse_args()

    pngs = sorted(glob.glob(os.path.join(args.slides_dir, "*.png")))
    num_slides = len(pngs)

    if num_slides == 0:
        print("Error: no PNGs found in slides directory", file=sys.stderr)
        sys.exit(1)

    print(f"Detecting bass hits for {num_slides} slides...", file=sys.stderr)
    beat_times, audio_duration = detect_bass_hits(args.audio, num_slides, args.delta)

    print(f"Selected {len(beat_times)} beats starting at {beat_times[0]:.3f}s", file=sys.stderr)
    for i, t in enumerate(beat_times):
        print(f"  Slide {i+1}: {t:.3f}s", file=sys.stderr)

    create_video(args.slides_dir, args.audio, args.output, beat_times, audio_duration)


if __name__ == "__main__":
    main()
