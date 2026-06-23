#!/bin/bash
# Post-process carousel: generate PDF, MP4s (beat-synced + silent), and GIF
# Usage: post-process.sh <output-dir>

set -e

DIR="$1"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$DIR" ] || [ ! -d "$DIR" ]; then
    echo "Usage: $0 <output-dir>"
    exit 1
fi

echo "Post-processing: $DIR"

# PDF
echo "  Generating PDF..."
python3 -c "
import img2pdf, glob, os
imgs = sorted(glob.glob(os.path.join('$DIR', '*.png')))
with open(os.path.join('$DIR', 'carousel.pdf'), 'wb') as f:
    f.write(img2pdf.convert(imgs))
print(f'    PDF: {len(imgs)} pages')
"

# Silent MP4
echo "  Generating silent MP4..."
python3 -c "
import os, glob
d = '$DIR'
pngs = sorted(glob.glob(os.path.join(d, '*.png')))
with open('/tmp/ffmpeg-input.txt', 'w') as f:
    for p in pngs:
        f.write(f\"file '{p}'\n\")
        f.write('duration 2.5\n')
    f.write(f\"file '{pngs[-1]}'\n\")
print(f'    {len(pngs)} frames')
"
ffmpeg -y -f concat -safe 0 -i /tmp/ffmpeg-input.txt -vf "scale=1080:1350" -c:v libx264 -pix_fmt yuv420p -r 30 "$DIR/carousel-silent.mp4" 2>/dev/null
echo "    Done: carousel-silent.mp4"

# Beat-synced MP4s
echo "  Generating beat-synced MP4 (desolate)..."
python3 "$SKILL_DIR/scripts/beat-sync-video.py" \
    --slides-dir "$DIR" \
    --audio "$SKILL_DIR/audio/desolate-slowed.m4a" \
    --output "$DIR/carousel-desolate.mp4" 2>/dev/null
echo "    Done: carousel-desolate.mp4"

echo "  Generating beat-synced MP4 (else-paris)..."
python3 "$SKILL_DIR/scripts/beat-sync-video.py" \
    --slides-dir "$DIR" \
    --audio "$SKILL_DIR/audio/else-paris.m4a" \
    --output "$DIR/carousel-else-paris.mp4" 2>/dev/null
echo "    Done: carousel-else-paris.mp4"

# GIF
echo "  Generating GIF..."
ffmpeg -y -f concat -safe 0 -i /tmp/ffmpeg-input.txt -vf "scale=540:675" -loop 0 "$DIR/carousel.gif" 2>/dev/null
echo "    Done: carousel.gif"

echo "Post-processing complete!"
