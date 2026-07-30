# SocietyFlats Brand Kit

Every asset is generated from one file — `generate.mjs` holds the brand tokens
(colours, type, tagline, phone) and the geometry of the mark. Change a token,
run the generator, and the entire kit regenerates consistently:

```bash
node brand-kit/generate.mjs
```

Open `guidelines.html` in a browser for the full brand book (palette, typography,
logo rules, every asset with its file path). It loads Hanken Grotesk
from Google Fonts so you see the real faces.

## What's here

| Folder | Contents |
| --- | --- |
| `logo/` | Mark (tile / on-cream / mono ×2), wordmarks, horizontal + stacked lockups, light/reversed, favicon |
| `social/` | OG image 1200×630, Facebook cover 1640×624, X header 1500×500, LinkedIn company 1128×191 + personal 1584×396, YouTube 2560×1440, profile picture 1000², Instagram post 1080² + story 1080×1920 templates |
| `print/` | Business card 3.5×2in front/back (0.125in bleed included), A4 letterhead, A5 flyer — all at 300dpi-equivalent sizes |
| `png/` | Ready-to-upload PNG exports at exact platform sizes |

## Generating variants

Two commands, run from the project folder (`Final Now`), in Terminal:

```bash
# 1. Regenerate all SVGs — with optional per-sector story variants:
node brand-kit/generate.mjs --story-sectors "Sector 102, Golf Course Ext, Sector 65"

# 2. Export every SVG (variants included) to upload-ready PNGs:
bash brand-kit/export-pngs.sh
```

Variants land in `social/variants/` (SVG) and `png/social/variants/` (PNG),
one per sector, ready to post. For anything beyond sectors — headline changes,
festive editions, new asset types — edit the tokens/copy at the top of
`generate.mjs` (or ask Claude) and rerun both commands.

## Using it

- **Uploading to platforms:** use the PNGs in `png/` — platforms don't accept SVG.
- **Print shops:** hand over the SVGs (vector, any size) plus this note:
  CMYK approximations — Charcoal Ink `#1D1D1F` ≈ C72 M66 Y62 K74,
  Verified Green `#0F7B63` ≈ C86 M28 Y66 K12, Verified Green (dark) `#3BAE93`
  ≈ C68 M5 Y52 K0. Font: Hanken Grotesk
  (free on Google Fonts, OFL licence) — install before export.
- **Regenerating PNGs (macOS):** `qlmanage -t -s <size> -o out file.svg`
  then `sips -z <h> <w>` for exact dimensions.
- **The web app's own icons** (`frontend/public/favicon-32.png`,
  `apple-touch-icon.png`, `icon-192/512.png`, `brand/societyflats-*.png`)
  are exported from this kit — regenerate them here if the mark ever changes.

## The mark, in one sentence

A society grid on a Charcoal Ink tile — nine homes, one cell in Verified Green
and one taller cell. The society comes first; the green cell is the
route to a real home; the light is the verified signal. Never recolour, outline,
rotate, or place it on busy photography without the tile.
