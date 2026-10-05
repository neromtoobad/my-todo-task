#!/usr/bin/env python3
"""Cut 3x2 expression sheets into mood portraits; resize textures and images."""
import sys, glob, os
from PIL import Image
OUT = sys.argv[1]
MOODS = ["neutral", "happy", "flirty", "angry", "sad", "shock"]
# Most sheets came back as the 3x2 grid we asked for. These came back 4x2
# (eight faces); the cell each mood sits in, as (column, row):
FOUR = {"tobi", "ivie", "ebi", "nedu", "zee", "pf"}
CELL4 = {"neutral": (0, 0), "happy": (1, 0), "flirty": (2, 0), "angry": (0, 1), "sad": (1, 1), "shock": (3, 1)}
for f in glob.glob("src/portraits_*.png"):
    k = os.path.basename(f)[len("portraits_"):-4]
    im = Image.open(f).convert("RGB")
    W, H = im.size
    cols = 4 if k in FOUR else 3
    cw, ch = W / cols, H / 2
    side = min(cw, ch) * 0.94
    for i, mood in enumerate(MOODS):
        c, r = CELL4[mood] if cols == 4 else (i % 3, i // 3)
        if k == "ebi" and mood == "angry": c, r = 3, 0  # her shouting face landed top right
        cx = c * cw + cw / 2
        # Tall cells: sit the square near the top so the hair stays in.
        cy = r * ch + (side / 2 + ch * 0.03 if ch > side * 1.1 else ch / 2)
        box = (int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2))
        im.crop(box).resize((256, 256), Image.LANCZOS).save(f"{OUT}/portraits/{k}_{mood}.webp", quality=84)
for f in glob.glob("src/tex_*.png"):
    k = os.path.basename(f)[4:-4]
    Image.open(f).convert("RGB").resize((512, 512), Image.LANCZOS).save(f"{OUT}/tex/{k}.jpg", quality=86)
eye = Image.open("src/img_eye.png").convert("RGB")
eye.resize((512, 512), Image.LANCZOS).save(f"{OUT}/img/eye.jpg", quality=88)
eye.resize((64, 64), Image.LANCZOS).save(f"{OUT}/img/favicon.png")
bg = Image.open("src/img_menu_bg.png").convert("RGB")
bg.resize((1600, int(1600 * bg.size[1] / bg.size[0])), Image.LANCZOS).save(f"{OUT}/img/menu_bg.jpg", quality=80)
print("images done")
