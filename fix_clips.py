"""
Re-encodes existing clips to be browser-compatible.
- Forces yuv420p (browsers don't support yuv444p)
- Adds +faststart (moov atom at front for streaming)
- Forces baseline-friendly H.264 profile
"""
import os
import subprocess
import sys
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "output"


def needs_fix(path: Path) -> bool:
    """Check if a video file needs re-encoding for browser compatibility."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=pix_fmt,profile",
                "-of", "default=nw=1:nk=1",
                str(path),
            ],
            capture_output=True, text=True, timeout=30,
        )
        info = result.stdout.strip().lower()
        if "yuv444" in info or "high 4:4:4" in info or "high 10" in info:
            return True
        # Check moov position (cheap heuristic)
        with open(path, "rb") as f:
            head = f.read(4096)
        if b"moov" not in head:
            return True
        return False
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        return False


def fix_clip(path: Path) -> bool:
    """Re-encode the clip to browser-compatible H.264 + AAC + faststart."""
    tmp_path = path.with_suffix(".fixed.mp4")
    cmd = [
        "ffmpeg", "-y", "-i", str(path),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-level", "4.0",
        "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(tmp_path),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=600)
        if result.returncode != 0:
            print(f"   [FAIL] {path.name}")
            print(f"   stderr: {result.stderr.decode(errors='ignore')[-500:]}")
            tmp_path.unlink(missing_ok=True)
            return False
        os.replace(tmp_path, path)
        return True
    except (subprocess.SubprocessError, OSError) as e:
        print(f"   [ERR] {path.name}: {e}")
        tmp_path.unlink(missing_ok=True)
        return False


def main() -> int:
    if not OUTPUT_DIR.exists():
        print(f"Output dir not found: {OUTPUT_DIR}")
        return 1

    clips = list(OUTPUT_DIR.rglob("*.mp4"))
    print(f"Found {len(clips)} mp4 files in output/")

    to_fix = [c for c in clips if needs_fix(c)]
    print(f"{len(to_fix)} need re-encoding for browser compatibility\n")

    fixed = 0
    for i, clip in enumerate(to_fix, 1):
        rel = clip.relative_to(OUTPUT_DIR)
        print(f"[{i}/{len(to_fix)}] {rel}")
        if fix_clip(clip):
            fixed += 1
            print(f"   [OK] re-encoded")

    print(f"\nDone. Fixed {fixed}/{len(to_fix)} clips.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
