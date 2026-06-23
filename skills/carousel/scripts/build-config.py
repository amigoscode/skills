#!/usr/bin/env python3
"""
Helper to build carousel config JSON with embedded SVG icons.
Reads a simplified config from stdin (JSON with iconPath fields instead of SVG content)
and outputs a full config with embedded SVGs to the specified output path.

Usage:
    python3 build-config.py /tmp/carousel-config.json < simplified-config.json
"""
import json
import sys
import os

# Tech icons directory. Defaults to the icons bundled with this skill
# (assets/tech_icons). Override with the CAROUSEL_ICONS_DIR env var, which the
# skill sets from config.json's "techIconsDir" field.
_DEFAULT_ICONS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "tech_icons"
)
ICONS_DIR = os.path.expanduser(os.environ.get("CAROUSEL_ICONS_DIR", _DEFAULT_ICONS_DIR))

def read_svg(icon_name):
    """Read SVG content from icon file."""
    path = os.path.join(ICONS_DIR, icon_name)
    if os.path.exists(path):
        with open(path) as f:
            return f.read().strip()
    return None

def main():
    if len(sys.argv) < 2:
        print("Usage: build-config.py <output-path>", file=sys.stderr)
        sys.exit(1)

    output_path = sys.argv[1]
    config = json.load(sys.stdin)

    # Embed cover icon
    if "techIconFile" in config:
        svg = read_svg(config["techIconFile"])
        if svg:
            config["techIconSvg"] = svg
        del config["techIconFile"]

    # Embed per-slide icons
    for slide in config.get("contentSlides", []):
        if "iconFile" in slide:
            svg = read_svg(slide["iconFile"])
            if svg:
                slide["iconSvg"] = svg
            del slide["iconFile"]

    with open(output_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"Config written to {output_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
