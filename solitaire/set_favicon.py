#!/usr/bin/env python3
"""
Quick utility to switch the active favicon.svg in agy-solitaire.
Usage:
    python3 set_favicon.py 1   # Double Happiness (囍)
    python3 set_favicon.py 2   # Crowned King
    python3 set_favicon.py 3   # Foundation Ace
    python3 set_favicon.py 4   # Classic Ace of Spades
    python3 set_favicon.py 5   # Red Lantern
    python3 set_favicon.py 6   # Four Suits Medallion
    python3 set_favicon.py 7   # K♣ + Q♥ Tableau Stack (PWA & Favicon)
"""

import sys
import shutil
from pathlib import Path

FAVICON_MAP = {
    "1": "favicon-double-happiness.svg",
    "2": "favicon-crowned-king.svg",
    "3": "favicon-foundation-ace.svg",
    "4": "favicon-ace-spades.svg",
    "5": "favicon-lantern.svg",
    "6": "favicon-four-suits.svg",
    "7": "favicon-kq-stacked.svg",
    "8": "favicon-kqj-crimson.svg",
    "9": "favicon-kqj-felt-rim.svg",
    "double-happiness": "favicon-double-happiness.svg",
    "crowned-king": "favicon-crowned-king.svg",
    "foundation-ace": "favicon-foundation-ace.svg",
    "ace-spades": "favicon-ace-spades.svg",
    "lantern": "favicon-lantern.svg",
    "four-suits": "favicon-four-suits.svg",
    "kq-stacked": "favicon-kq-stacked.svg",
    "kqj-crimson": "favicon-kqj-crimson.svg",
    "kqj-felt-rim": "favicon-kqj-felt-rim.svg",
    "kq": "favicon-kq-stacked.svg",
    "kqj": "favicon-kqj-crimson.svg"
}

def main():
    root = Path(__file__).resolve().parent
    if len(sys.argv) < 2:
        print("Usage: python3 set_favicon.py <1-6>")
        print("Options:")
        for k in sorted(FAVICON_MAP.keys()):
            if k.isdigit():
                print(f"  {k}: {FAVICON_MAP[k]}")
        sys.exit(1)

    choice = sys.argv[1].lower().strip()
    target_filename = FAVICON_MAP.get(choice)
    if not target_filename:
        print(f"Error: Unknown option '{choice}'. Choose 1 to 6.")
        sys.exit(1)

    src = root / target_filename
    dst = root / "favicon.svg"

    if not src.exists():
        print(f"Error: Source file {src} does not exist.")
        sys.exit(1)

    shutil.copyfile(src, dst)
    print(f"✅ Successfully set active favicon.svg to Option {choice}: {target_filename}")

if __name__ == "__main__":
    main()
