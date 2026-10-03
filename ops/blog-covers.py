# Branded cover images for blog articles that have none (HiGP wordmark, category, Arabic title).
# Renders with the preinstalled Chromium (Playwright), writes src/seed/wp/media/<slug>-cover.webp
# and sets "cover" on the article in src/seed/wp/posts.json. The next deploy's seed imports them.
#   python3 ops/blog-covers.py              every article without a cover
#   python3 ops/blog-covers.py <slug> ...   only these (re-renders even if a cover exists)
import json, sys, html, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image
R = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((R/'src/seed/wp/posts.json').read_text())
cats = {c['slug']: c['ar'] for c in data['categories']}
logo = (R/'brand-assets/vector/logo-wordmark.svg').read_text()
only = sys.argv[1:]  # slugs, or empty = all without cover
targets = [p for p in data['posts'] if (p['slug'] in only) or (not only and not p.get('cover'))]
font = f"file://{R}/src/fonts"
def page(p):
    t = html.escape(p['locales']['ar']['title'])
    c = html.escape(cats.get(p['categories'][0], ''))
    size = '64px' if len(t) < 70 else '54px' if len(t) < 105 else '46px'
    return f'''<html dir="rtl"><head><style>
@font-face{{font-family:Plex;src:url({font}/plex-arabic-700.woff2);font-weight:700}}
@font-face{{font-family:Plex;src:url({font}/plex-arabic-400.woff2);font-weight:400}}
@font-face{{font-family:PlexL;src:url({font}/plex-latin-400.woff2)}}
html,body{{margin:0;width:1600px;height:900px;overflow:hidden}}
body{{background:#f3faf4;font-family:Plex,sans-serif;color:#12341b;position:relative}}
.disc{{position:absolute;width:1100px;height:1100px;border-radius:50%;background:#e2f3e5;left:-420px;top:220px}}
.play{{position:absolute;left:-60px;top:500px;width:0;height:0;border-top:190px solid transparent;border-bottom:190px solid transparent;border-left:300px solid #fff;opacity:.9}}
.logo{{position:absolute;right:110px;top:90px;width:300px}}
.logo svg{{width:100%;height:auto}}
.kick{{position:absolute;right:110px;top:300px;font-size:30px;font-weight:700;color:#276b34;background:#fff;border:2px solid #c9e8cd;border-radius:999px;padding:6px 26px}}
h1{{position:absolute;right:110px;top:380px;width:1100px;margin:0;font-size:{size};line-height:1.45;font-weight:700;color:#12341b;text-wrap:balance}}
.url{{position:absolute;left:110px;bottom:70px;font-family:PlexL,sans-serif;font-size:30px;color:#276b34;direction:ltr}}
.bar{{position:absolute;left:0;right:0;bottom:0;height:22px;background:#378d42}}
</style></head><body><div class="disc"></div><div class="play"></div><div class="logo">{logo}</div>
<div class="kick">{c}</div><h1>{t}</h1><div class="url">higreenpanda.com</div><div class="bar"></div></body></html>'''
import tempfile
out = pathlib.Path(tempfile.mkdtemp(prefix='covers-'))
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome' if pathlib.Path('/opt/pw-browsers/chromium-1194/chrome-linux/chrome').exists() else None)
    pg = b.new_page(viewport={'width':1600,'height':900})
    for p in targets:
        f = out/f"{p['slug']}.html"; f.write_text(page(p))
        pg.goto(f'file://{f}'); pg.wait_for_timeout(300)
        pg.screenshot(path=str(out/f"{p['slug']}.png"))
        name = f"{p['slug']}-cover.webp"
        Image.open(out/f"{p['slug']}.png").convert('RGB').save(R/'src/seed/wp/media'/name, 'WEBP', quality=88)
        ar = p['locales']['ar']['title']; en = (p['locales'].get('en') or {}).get('title', ar)
        p['cover'] = {'file': name, 'alt': {'ar': ar, 'en': en}}
        print('cover:', name)
    b.close()
(R/'src/seed/wp/posts.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
