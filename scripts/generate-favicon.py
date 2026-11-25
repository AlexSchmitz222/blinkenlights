#!/usr/bin/env python3
"""
Generates the favicons from the logo pattern below (keep it in sync with
src/app/shared/logo/logo.component.ts).

    python3 scripts/generate-favicon.py

Writes public/favicon.svg, public/favicon.ico (16/32/48 px) and public/apple-touch-icon.png.
Needs Pillow (pip install pillow).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

LOGO = [
    "###.",
    "#..#",
    "###.",
    "#..#",
    "###.",
]

BG = (10, 10, 11, 255)        # --bl-stage-bg (dark)
OFF = (38, 38, 43, 255)       # slightly lighter than --bl-light-off so it reads at 16 px
ON = (255, 227, 163, 255)     # --bl-light-on
GLOW = (255, 196, 92, 150)

ROOT = Path(__file__).resolve().parent.parent / "public"
COLS, ROWS = len(LOGO[0]), len(LOGO)


def layout(size: float):
    """Cell size, gap and top-left offset for a square canvas of `size`."""
    pad = size * 0.14
    gap_ratio = 0.22
    cell = (size - 2 * pad) / (ROWS + (ROWS - 1) * gap_ratio)
    gap = cell * gap_ratio
    width = COLS * cell + (COLS - 1) * gap
    height = ROWS * cell + (ROWS - 1) * gap
    return cell, gap, (size - width) / 2, (size - height) / 2


def svg() -> str:
    size = 32
    cell, gap, x0, y0 = layout(size)
    rects = []
    for y, row in enumerate(LOGO):
        for x, c in enumerate(row):
            fill = "#ffe3a3" if c == "#" else "#26262b"
            rects.append(
                f'<rect x="{x0 + x * (cell + gap):.2f}" y="{y0 + y * (cell + gap):.2f}" '
                f'width="{cell:.2f}" height="{cell:.2f}" rx="{cell * 0.22:.2f}" fill="{fill}"/>'
            )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
        f'<rect width="{size}" height="{size}" rx="7" fill="#0a0a0b"/>'
        + "".join(rects)
        + "</svg>\n"
    )


def raster(size: int) -> Image.Image:
    scale = 8  # supersample for smooth edges
    s = size * scale
    cell, gap, x0, y0 = layout(s)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.22, fill=BG)

    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for y, row in enumerate(LOGO):
        for x, c in enumerate(row):
            left = x0 + x * (cell + gap)
            top = y0 + y * (cell + gap)
            box = [left, top, left + cell, top + cell]
            draw.rounded_rectangle(box, radius=cell * 0.22, fill=ON if c == "#" else OFF)
            if c == "#" and size >= 48:
                glow_draw.rounded_rectangle(box, radius=cell * 0.22, fill=GLOW)

    if size >= 48:
        glow = glow.filter(ImageFilter.GaussianBlur(cell * 0.35))
        img = Image.alpha_composite(img, glow)
        # redraw lit cells on top of their glow so they stay crisp
        draw = ImageDraw.Draw(img)
        for y, row in enumerate(LOGO):
            for x, c in enumerate(row):
                if c == "#":
                    left = x0 + x * (cell + gap)
                    top = y0 + y * (cell + gap)
                    draw.rounded_rectangle([left, top, left + cell, top + cell], radius=cell * 0.22, fill=ON)

    return img.resize((size, size), Image.LANCZOS)


def main():
    (ROOT / "favicon.svg").write_text(svg())
    raster(48).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    touch = Image.new("RGBA", (180, 180), BG)  # iOS wants an opaque square icon
    touch.alpha_composite(raster(180))
    touch.convert("RGB").save(ROOT / "apple-touch-icon.png")
    print("Wrote favicon.svg, favicon.ico, apple-touch-icon.png to", ROOT)


if __name__ == "__main__":
    main()
