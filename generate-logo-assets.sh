#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# HiGreenPanda — logo asset generator
#
# Produces every logo format and size listed in the brand manual from one
# master file.
#
# Usage:
#   ./generate-logo-assets.sh path/to/logo-primary.svg [output-dir]
#
# Accepts .svg (best), .pdf, .eps, or a large .png (2000px+ wide).
#
# Requires: ImageMagick, librsvg, and optionally svgo.
#   macOS:  brew install imagemagick librsvg && npm i -g svgo
#   Ubuntu: sudo apt install imagemagick librsvg2-bin && npm i -g svgo
# ---------------------------------------------------------------------------
set -euo pipefail

SRC="${1:?Usage: $0 <logo-file> [output-dir]}"
OUT="${2:-brand-assets}"

BRAND_GREEN="#2A643B"   # primary brand green
PAD_BG="none"           # transparent

[[ -f "$SRC" ]] || { echo "No such file: $SRC" >&2; exit 1; }
# ImageMagick 7 uses `magick`; version 6 uses `convert`. Support both.
if ! command -v magick >/dev/null 2>&1; then
  if command -v convert >/dev/null 2>&1; then
    magick () { convert "$@"; }
  else
    echo "ImageMagick not found. Install it and re-run." >&2; exit 1
  fi
fi

mkdir -p "$OUT"/{vector,web,favicon,social,print}
echo "Source: $SRC"
echo "Output: $OUT/"

# Render at high resolution once; everything else downsamples from this.
MASTER="$OUT/.master.png"
render_svg () { # $1 = svg in, $2 = png out
  if   command -v rsvg-convert >/dev/null 2>&1; then rsvg-convert -w 4000 -a -o "$2" "$1"
  elif command -v inkscape     >/dev/null 2>&1; then inkscape "$1" -w 4000 -o "$2"
  elif python3 -c "import cairosvg" 2>/dev/null; then
       python3 -c "import cairosvg,sys; cairosvg.svg2png(url=sys.argv[1], write_to=sys.argv[2], output_width=4000)" "$1" "$2"
  else
       magick -background none -density 600 "$1" -resize 4000x "$2"
  fi
}
case "${SRC,,}" in
  *.svg) render_svg "$SRC" "$MASTER" ;;
  *)     magick -background none -density 600 "$SRC[0]" -resize 4000x "$MASTER" ;;
esac
if [[ ! -s "$MASTER" ]]; then
  cat >&2 <<'ERR'
Could not render the source file.

If the source is an SVG, install one of these renderers and re-run:
  macOS:   brew install librsvg
  Ubuntu:  sudo apt install librsvg2-bin
Or export a 4000px-wide PNG from your design tool and pass that instead.
ERR
  exit 1
fi

w () { magick "$MASTER" -background none -resize "$1"x -strip "$2"; }
sq () { # square canvas, centred, optional padding percentage
  local size=$1 out=$2 pad=${3:-0} bg=${4:-none}
  local inner=$(( size - (size * pad / 100) ))
  magick "$MASTER" -background none -resize "${inner}x${inner}" \
    -gravity center -extent "${size}x${size}" -background "$bg" \
    -flatten -strip "$out" 2>/dev/null \
    || magick "$MASTER" -background none -resize "${inner}x${inner}" \
       -gravity center -extent "${size}x${size}" -strip "$out"
}

echo "→ vector"
if [[ "${SRC,,}" == *.svg ]]; then
  cp "$SRC" "$OUT/vector/logo-primary.svg"
  command -v svgo >/dev/null && svgo -q "$OUT/vector/logo-primary.svg" -o "$OUT/vector/logo-primary.svg" || true
  # single-colour versions
  sed -E 's/fill="#[0-9A-Fa-f]{3,8}"/fill="#000000"/g; s/fill:#[0-9A-Fa-f]{3,8}/fill:#000000/g' \
      "$OUT/vector/logo-primary.svg" > "$OUT/vector/logo-mono-black.svg"
  sed -E 's/fill="#[0-9A-Fa-f]{3,8}"/fill="#FFFFFF"/g; s/fill:#[0-9A-Fa-f]{3,8}/fill:#FFFFFF/g' \
      "$OUT/vector/logo-primary.svg" > "$OUT/vector/logo-mono-white.svg"
  cp "$OUT/vector/logo-primary.svg" "$OUT/favicon/favicon.svg"
else
  echo "  (source is raster — supply an .svg to get true vector masters)"
fi
magick "$MASTER" "$OUT/print/logo-primary.pdf"

echo "→ web png"
w 400  "$OUT/web/logo-primary@1x.png"
w 800  "$OUT/web/logo-primary@2x.png"
w 1200 "$OUT/web/logo-primary@3x.png"
w 2400 "$OUT/web/logo-primary-large.png"
magick "$MASTER" -background none -resize 800x \
  -colorspace gray -fill white -colorize 100 -strip "$OUT/web/logo-white@2x.png"
magick "$MASTER" -background none -resize 800x \
  -colorspace gray -fill black -colorize 100 -strip "$OUT/web/logo-black@2x.png"

echo "→ favicons + app icons"
sq 180 "$OUT/favicon/apple-touch-icon.png" 10 white
sq 192 "$OUT/favicon/icon-192.png"
sq 512 "$OUT/favicon/icon-512.png"
sq 512 "$OUT/favicon/icon-maskable-512.png" 20 white
for s in 16 32 48; do sq "$s" "$OUT/favicon/.ico-$s.png"; done
magick "$OUT/favicon/.ico-16.png" "$OUT/favicon/.ico-32.png" "$OUT/favicon/.ico-48.png" \
       "$OUT/favicon/favicon.ico"
rm -f "$OUT/favicon"/.ico-*.png

echo "→ social"
sq 400 "$OUT/social/avatar.png"            8 white
sq 640 "$OUT/social/whatsapp-profile.png"  8 white
# Open Graph cards: logo centred on a brand-green field
for lang in en ar; do
  magick -size 1200x630 "xc:$BRAND_GREEN" \
    \( "$MASTER" -background none -resize 620x \) \
    -gravity center -composite -strip "$OUT/social/og-image-$lang.png"
done
cp "$OUT/social/og-image-en.png" "$OUT/social/og-image.png"
magick -size 2560x1440 "xc:$BRAND_GREEN" \
  \( "$MASTER" -background none -resize 900x \) \
  -gravity center -composite -strip "$OUT/social/youtube-banner.png"

echo "→ documents"
magick "$MASTER" -background none -resize 300x -density 300 -strip "$OUT/print/email-signature.png"
magick "$MASTER" -background none -resize 600x -density 300 -strip "$OUT/print/letterhead-logo.png"
magick "$MASTER" -background none -resize 400x -density 300 -strip "$OUT/print/invoice-logo.png"
magick "$MASTER" -background none -resize 1200x -colorspace gray -fill white -colorize 100 \
  -alpha set -channel A -evaluate multiply 0.15 +channel -strip "$OUT/print/watermark.png"

rm -f "$MASTER"

cat > "$OUT/site.webmanifest" <<JSON
{
  "name": "HiGreenPanda",
  "short_name": "HiGreenPanda",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "$BRAND_GREEN",
  "background_color": "#FFFFFF",
  "display": "standalone"
}
JSON

echo
echo "Done. $(find "$OUT" -type f | wc -l | tr -d ' ') files in $OUT/"
find "$OUT" -type f | sort
