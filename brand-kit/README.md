# SocietyFlats Brand Kit

Every asset is generated from one file — `generate.mjs` holds the brand tokens
(colours, type, tagline, phone) and the geometry of the mark. Change a token,
run the generator, and the entire kit regenerates consistently:

```bash
node brand-kit/generate.mjs
```

Open `guidelines.html` in a browser for the full brand book (palette, typography,
logo rules, every asset with its file path). It loads Newsreader + Hanken Grotesk
from Google Fonts so you see the real faces.

## What's here

| Folder | Contents |
| --- | --- |
| `logo/` | Mark (tile / on-cream / mono ×2), horizontal + stacked lockups, light/dark, favicon |
| `social/` | OG image 1200×630, Facebook cover 1640×624, X header 1500×500, LinkedIn company 1128×191 + personal 1584×396, YouTube 2560×1440, profile picture 1000², Instagram post 1080² + story 1080×1920 templates |
| `print/` | Business card 3.5×2in front/back (0.125in bleed included), A4 letterhead, A5 flyer — all at 300dpi-equivalent sizes |
| `png/` | Ready-to-upload PNG exports at exact platform sizes |

## Using it

- **Uploading to platforms:** use the PNGs in `png/` — platforms don't accept SVG.
- **Print shops:** hand over the SVGs (vector, any size) plus this note:
  CMYK approximations — Ink Navy `#233B6E` ≈ C90 M75 Y25 K10,
  Brass Gold `#B08A3E` ≈ C30 M42 Y90 K10. Fonts: Newsreader + Hanken Grotesk
  (free on Google Fonts, OFL licence) — install before export.
- **Regenerating PNGs (macOS):** `qlmanage -t -s <size> -o out file.svg`
  then `sips -z <h> <w>` for exact dimensions.
- **The web app's own icons** (`frontend/public/favicon-32.png`,
  `apple-touch-icon.png`, `icon-192/512.png`, `brand/societyflats-*.png`)
  are exported from this kit — regenerate them here if the mark ever changes.

## The mark, in one sentence

A society facade on an Ink Navy tile — nine homes, one lit Brass Gold: the
verified flat you find — never recolour, outline, rotate, or place on busy
photography without the tile.
