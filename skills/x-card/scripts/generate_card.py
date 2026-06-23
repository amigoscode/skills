from PIL import Image, ImageDraw, ImageFont
import os
import json
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)

# --- Load config from --config-file or use defaults ---
config = {}
if "--config-file" in sys.argv:
    idx = sys.argv.index("--config-file")
    with open(sys.argv[idx + 1]) as f:
        config = json.load(f)


def resolve_asset(cfg_path, default_path):
    """Resolve an asset path: expand ~, resolve relative paths against the skill
    directory, fall back to the bundled default if nothing else exists."""
    if cfg_path:
        p = os.path.expanduser(cfg_path)
        if not os.path.isabs(p):
            p = os.path.join(SKILL_DIR, cfg_path)
        if os.path.exists(p):
            return p
    return default_path


# Bundled defaults keep the skill self-contained.
DEFAULT_PHOTO = os.path.join(SKILL_DIR, "assets", "profile.png")
DEFAULT_FONTS = os.path.join(SKILL_DIR, "assets", "fonts")

PROFILE_PHOTO = resolve_asset(config.get("profilePhoto"), DEFAULT_PHOTO)
FONTS         = resolve_asset(config.get("fontsDir"), DEFAULT_FONTS)
NAME          = config.get("name", "Your Name")
HANDLE        = config.get("handle", "@yourhandle")
LINES         = config.get("lines", ["Quote goes here."])
OUTPUT_DIR    = os.path.expanduser(config.get("outputDir", "~/amigoscode-skills/x-card"))
CAPTION       = config.get("caption", "")
HASHTAGS      = config.get("hashtags", "")
RETWEETS      = config.get("retweets", "306")
LIKES         = config.get("likes", "3.1K")

os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT = os.path.join(OUTPUT_DIR, "x-card.png")
# ----------------------------

SCALE = 2
W, H  = 1080 * SCALE, 1350 * SCALE   # 4:5 portrait ratio
PAD_X = 60 * SCALE                     # horizontal padding
PAD_TOP = 50 * SCALE                   # top padding

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREY  = (136, 136, 136)

img  = Image.new("RGB", (W, H), BLACK)
draw = ImageDraw.Draw(img)

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size * SCALE)

f_name   = font("Outfit-Bold.ttf", 36)
f_handle = font("WorkSans-Regular.ttf", 30)
f_stats_num = font("Outfit-Bold.ttf", 28)
f_stats_label = font("WorkSans-Regular.ttf", 28)

# --- Profile photo (circular) ---
photo = Image.open(PROFILE_PHOTO).convert("RGB")
pw, ph = photo.size
side   = min(pw, ph)
photo  = photo.crop(((pw - side) // 2, 0, (pw - side) // 2 + side, side))
PHOTO_SIZE = 96 * SCALE
photo  = photo.resize((PHOTO_SIZE, PHOTO_SIZE), Image.LANCZOS)
mask   = Image.new("L", (PHOTO_SIZE, PHOTO_SIZE), 0)
ImageDraw.Draw(mask).ellipse([0, 0, PHOTO_SIZE, PHOTO_SIZE], fill=255)

photo_x = PAD_X
photo_y = PAD_TOP
img.paste(photo, (photo_x, photo_y), mask)

# --- Name + handle (to the right of photo) ---
text_x = photo_x + PHOTO_SIZE + 24 * SCALE
name_y = photo_y + 10 * SCALE
draw.text((text_x, name_y), NAME, font=f_name, fill=WHITE)

# --- Blue verified tick (loaded from asset image) ---
name_bbox = draw.textbbox((0, 0), NAME, font=f_name)
name_w = name_bbox[2] - name_bbox[0]
name_h = name_bbox[3] - name_bbox[1]

TICK_SIZE = 40 * SCALE
tick_x = text_x + name_w + 12 * SCALE
tick_y = name_y + (name_h - TICK_SIZE) // 2 + 4 * SCALE

BADGE_PATH = os.path.join(SCRIPT_DIR, "..", "assets", "verified-badge.png")
tick_img = Image.open(BADGE_PATH).convert("RGBA")
tick_img = tick_img.resize((TICK_SIZE, TICK_SIZE), Image.LANCZOS)
img.paste(tick_img, (tick_x, tick_y), tick_img)

# Handle below name
handle_y = name_y + name_h + 8 * SCALE
draw.text((text_x, handle_y), HANDLE, font=f_handle, fill=GREY)

# --- Body text ---
body_top = photo_y + PHOTO_SIZE + 80 * SCALE
body_bottom = H - 140 * SCALE  # leave room for stats
available_h = body_bottom - body_top
max_text_w = W - 2 * PAD_X

num_lines = len(LINES)
MIN_BODY = 42
MAX_BODY = 72
LH_RATIO = 1.45

# Find the largest font size that fits
best_size = MIN_BODY
for size in range(MAX_BODY, MIN_BODY - 1, -1):
    test_font = font("WorkSans-Regular.ttf", size)
    lh = int(size * LH_RATIO * SCALE)
    total_h = num_lines * lh
    if total_h > available_h:
        continue
    fits = True
    for line in LINES:
        if line:
            bbox = draw.textbbox((0, 0), line, font=test_font)
            if (bbox[2] - bbox[0]) > max_text_w:
                fits = False
                break
    if fits:
        best_size = size
        break

f_body = font("WorkSans-Regular.ttf", best_size)
lh = int(best_size * LH_RATIO * SCALE)

# Place body text top-aligned (not vertically centered)
y = body_top
for line in LINES:
    if line:
        draw.text((PAD_X, y), line, font=f_body, fill=WHITE)
    y += lh

# --- Stats bar at bottom ---
stats_y = H - 100 * SCALE

# Retweets
rt_num_text = RETWEETS
rt_label_text = " Retweets"
draw.text((PAD_X, stats_y), rt_num_text, font=f_stats_num, fill=WHITE)
rt_num_bbox = draw.textbbox((0, 0), rt_num_text, font=f_stats_num)
rt_num_w = rt_num_bbox[2] - rt_num_bbox[0]
draw.text((PAD_X + rt_num_w, stats_y), rt_label_text, font=f_stats_label, fill=GREY)
rt_label_bbox = draw.textbbox((0, 0), rt_label_text, font=f_stats_label)
rt_total_w = rt_num_w + (rt_label_bbox[2] - rt_label_bbox[0])

# Likes (spaced after retweets)
likes_x = PAD_X + rt_total_w + 60 * SCALE
draw.text((likes_x, stats_y), LIKES, font=f_stats_num, fill=WHITE)
likes_num_bbox = draw.textbbox((0, 0), LIKES, font=f_stats_num)
likes_num_w = likes_num_bbox[2] - likes_num_bbox[0]
draw.text((likes_x + likes_num_w, stats_y), " Likes", font=f_stats_label, fill=GREY)

# --- Downsample to final size for crisp edges ---
img = img.resize((1080, 1350), Image.LANCZOS)
img.save(OUTPUT, "PNG", dpi=(300, 300))

# Save caption file if provided
if CAPTION:
    caption_path = os.path.join(OUTPUT_DIR, "linkedin-post.txt")
    with open(caption_path, "w") as f:
        f.write(CAPTION)
        if HASHTAGS:
            f.write(f"\n\n{HASHTAGS.lower()}")

# Output result as JSON
result = {
    "outputDir": OUTPUT_DIR,
    "xCard": OUTPUT,
    "fontSize": best_size,
}
if CAPTION:
    result["caption"] = os.path.join(OUTPUT_DIR, "linkedin-post.txt")
print(json.dumps(result, indent=2))
