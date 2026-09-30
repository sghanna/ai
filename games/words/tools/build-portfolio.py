# /// script
# requires-python = ">=3.9"
# dependencies = ["Markdown>=3.7,<4"]
# ///
"""Build the public Words case from its canonical portfolio Markdown."""
from pathlib import Path
from html import escape
import argparse
import re
import shutil
import markdown

GAME = Path(__file__).resolve().parents[1]
CANONICAL = GAME.parent / "portfolio" / "words.md"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--source", type=Path, default=CANONICAL if CANONICAL.exists() else GAME / "PORTFOLIO.md")
args = parser.parse_args()
source = args.source.resolve()
text = source.read_text()
body = markdown.markdown(text, extensions=["tables", "sane_lists"])
body = re.sub(r'<p>(<img [^>]+>)</p>\s*<p><em>(.*?)</em></p>', r'<figure>\1<figcaption>\2</figcaption></figure>', body, flags=re.S)
body = body.replace('<table>', '<div class="table-scroll" tabindex="0" role="region" aria-label="Verification evidence"><table>').replace('</table>', '</table></div>')
body = body.replace('<img ', '<img loading="lazy" decoding="async" ')
title = text.splitlines()[0].removeprefix('# ')
page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Shawn Hanna's Words case study: device requirements, AI collaboration, responsive game design and verified fixes.">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'">
<title>{escape(title)} | Shawn Hanna</title>
<link rel="canonical" href="https://sghanna.github.io/ai/games/words/portfolio.html">
<link rel="stylesheet" href="portfolio.css"></head>
<body><a class="skip" href="#main">Skip to case study</a>
<header><nav aria-label="Portfolio navigation"><a class="name" href="portfolio.html">Shawn Hanna<span>Product direction and practical tools</span></a><a class="play" href="./">Play Words <span aria-hidden="true">↗</span></a></nav></header>
<main id="main" tabindex="-1"><article>{body}</article></main>
<footer><p>Words / Word Wheel · September 30, 2026</p><p><a href="PORTFOLIO.md">Read the Markdown source</a> · <a href="https://github.com/sghanna/ai/tree/main/games/words">Source and verification</a></p></footer>
</body></html>'''
(GAME / "portfolio.html").write_text(page)
if source != GAME / "PORTFOLIO.md":
    shutil.copy2(source, GAME / "PORTFOLIO.md")
for name in re.findall(r'!\[[^\]]*\]\((assets/[^)]+)\)', text):
    origin, target = source.parent / name, GAME / name
    if origin.resolve() != target.resolve():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origin, target)
print(f"Built {GAME / 'portfolio.html'} from {source}")
