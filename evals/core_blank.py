"""Count the frames of a flow recording in which the screen area is empty.

    python3 evals/core_blank.py <flow.mp4> [<flow.mp4> ...]

A change of screen that removes the old screen before the new one has anything to show leaves
frames with no content under the top bar. Each frame's content area (everything below the top
16%) is measured for detail with ffmpeg; an empty area has almost none. The first half second is
the page's own first load and is left out. Prints, per video, the number of empty frames and
when they happen.
"""
from __future__ import annotations

import re
import subprocess
import sys

EMPTY_BELOW = 0.05  # normalised entropy: a real screen is about 0.3–0.5, an empty one under 0.01
SKIP_SECONDS = 0.5


def empty_frames(video: str) -> list[float]:
    """The times (seconds) of the frames whose content area holds no detail."""
    command = ["ffmpeg", "-hide_banner", "-i", video, "-vf",
               "crop=iw:ih*0.84:0:ih*0.16,entropy,metadata=print:file=-", "-an", "-f", "null", "-"]
    output = subprocess.run(command, capture_output=True, text=True, check=True).stdout
    times: list[float] = []
    now = 0.0
    for line in output.splitlines():
        stamp = re.search(r"pts_time:([0-9.]+)", line)
        if stamp:
            now = float(stamp.group(1))
        detail = re.search(r"normalized_entropy\.normal\.Y=([0-9.]+)", line)
        if detail and now >= SKIP_SECONDS and float(detail.group(1)) < EMPTY_BELOW:
            times.append(now)
    return times


def moments(times: list[float]) -> list[tuple[float, int]]:
    """Runs of consecutive empty frames as (start time, number of frames)."""
    runs: list[tuple[float, int]] = []
    for time in times:
        if runs and time - (runs[-1][0] + runs[-1][1] * 0.04) < 0.06:
            runs[-1] = (runs[-1][0], runs[-1][1] + 1)
        else:
            runs.append((time, 1))
    return runs


def main() -> int:
    for video in sys.argv[1:]:
        times = empty_frames(video)
        described = ", ".join(f"{count} at {start:.1f} s" for start, count in moments(times)) or "none"
        print(f"{video}: {len(times)} empty frames ({described})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
