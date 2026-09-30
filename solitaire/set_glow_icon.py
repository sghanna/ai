#!/usr/bin/env python3
"""
Utility to apply any of the 6 Golden Selection Glow iOS PWA / Favicon options.
Usage:
    python3 set_glow_icon.py <1-6>
"""

import sys
import shutil
from pathlib import Path
from PIL import Image

OPTIONS = {
    "1": {
        "name": "Option 1: In-Game Stack Selection Halo on Emerald Felt",
        "svg": "assets/glow-options/option_1_stack_glow_felt.svg",
        "png": "assets/glow-options/option_1_stack_glow_felt.svg.png"
    },
    "2": {
        "name": "Option 2: Outer Squircle Perimeter Gold Glow on Emerald Felt",
        "svg": "assets/glow-options/option_2_squircle_glow_felt.svg",
        "png": "assets/glow-options/option_2_squircle_glow_felt.svg.png"
    },
    "3": {
        "name": "Option 3: Dual Glow (Cards + Squircle) on Emerald Felt",
        "svg": "assets/glow-options/option_3_dual_glow_felt.svg",
        "png": "assets/glow-options/option_3_dual_glow_felt.svg.png"
    },
    "4": {
        "name": "Option 4: In-Game Stack Selection Halo on Crimson Card-Back",
        "svg": "assets/glow-options/option_4_stack_glow_crimson.svg",
        "png": "assets/glow-options/option_4_stack_glow_crimson.svg.png"
    },
    "5": {
        "name": "Option 5: Outer Squircle Perimeter Gold Glow on Crimson Card-Back (Original)",
        "svg": "assets/glow-options/option_5_squircle_glow_crimson.svg",
        "png": "assets/glow-options/option_5_squircle_glow_crimson.svg.png"
    },
    "5A": {
        "name": "Option 5A: Balanced 52% King (Queen Y=148, Heart 80%)",
        "svg": "assets/glow-options/option_5A_squircle_crimson.svg",
        "png": "assets/glow-options/option_5A_squircle_crimson.svg.png"
    },
    "5B": {
        "name": "Option 5B: Golden Ratio 58% King (Queen Y=156, Heart 75%) [Recommended]",
        "svg": "assets/glow-options/option_5B_squircle_crimson.svg",
        "png": "assets/glow-options/option_5B_squircle_crimson.svg.png"
    },
    "5C": {
        "name": "Option 5C: Generous 64% King (Queen Y=165, Heart 70%)",
        "svg": "assets/glow-options/option_5C_squircle_crimson.svg",
        "png": "assets/glow-options/option_5C_squircle_crimson.svg.png"
    },
    "5D": {
        "name": "Option 5D: Maximum Exposure 70% King (Queen Y=174, Heart 65%)",
        "svg": "assets/glow-options/option_5D_squircle_crimson.svg",
        "png": "assets/glow-options/option_5D_squircle_crimson.svg.png"
    },
    "5E": {
        "name": "Option 5E: Upward Balanced Frame (King Y=24, Queen Y=146, Heart 78%)",
        "svg": "assets/glow-options/option_5E_squircle_crimson.svg",
        "png": "assets/glow-options/option_5E_squircle_crimson.svg.png"
    },
    "6": {
        "name": "Option 6: Dual Glow with Crimson Card-Back Rim on Felt",
        "svg": "assets/glow-options/option_6_crimson_rim_glow.svg",
        "png": "assets/glow-options/option_6_crimson_rim_glow.svg.png"
    },
    "C1": {
        "name": "Option C1: Light Clearance (King 70%, Heart 80%, 8px Gap)",
        "svg": "assets/glow-options/option_C1_combo.svg",
        "png": "assets/glow-options/option_C1_combo.svg.png"
    },
    "C2": {
        "name": "Option C2: Balanced Clearance (King 70%, Heart 80%, 19px Gap) [Recommended]",
        "svg": "assets/glow-options/option_C2_combo.svg",
        "png": "assets/glow-options/option_C2_combo.svg.png"
    },
    "C3": {
        "name": "Option C3: Generous Clearance (King 70%, Heart 80%, 30px Gap)",
        "svg": "assets/glow-options/option_C3_combo.svg",
        "png": "assets/glow-options/option_C3_combo.svg.png"
    },
    "C4": {
        "name": "Option C4: Maximum Bleed (King 70%, Heart 80%, 44px Gap)",
        "svg": "assets/glow-options/option_C4_combo.svg",
        "png": "assets/glow-options/option_C4_combo.svg.png"
    },
    "C5": {
        "name": "Option C5: Gold Border on Top (King 70%, Heart 80%, 19px Gap)",
        "svg": "assets/glow-options/option_C5_combo.svg",
        "png": "assets/glow-options/option_C5_combo.svg.png"
    },
    "C1-A": {
        "name": "Option C1-A: Flush Squircle Clip (Standard Cut at Y=496, Gold Over Rim)",
        "svg": "assets/glow-options/option_C1_A_stopped.svg",
        "png": "assets/glow-options/option_C1_A_stopped.svg.png"
    },
    "C1-B": {
        "name": "Option C1-B: Inner-Stroke Clip (Card Stops at Inside Gold Edge Y=494.25)",
        "svg": "assets/glow-options/option_C1_B_stopped.svg",
        "png": "assets/glow-options/option_C1_B_stopped.svg.png"
    },
    "C1-C": {
        "name": "Option C1-C: Natural Card Border (Playing Card Grey Border Rests at Y=496)",
        "svg": "assets/glow-options/option_C1_C_stopped.svg",
        "png": "assets/glow-options/option_C1_C_stopped.svg.png"
    },
    "C1-D": {
        "name": "Option C1-D: Gold Bezel Contact Shadow (Tactile Inset Bezel at Y=496)",
        "svg": "assets/glow-options/option_C1_D_stopped.svg",
        "png": "assets/glow-options/option_C1_D_stopped.svg.png"
    },
    "C1-E": {
        "name": "Option C1-E: Inset 2px Velvet Margin (Breathing Room Inside Gold Rim)",
        "svg": "assets/glow-options/option_C1_E_stopped.svg",
        "png": "assets/glow-options/option_C1_E_stopped.svg.png"
    },
    "C1-F": {
        "name": "Option C1-F: Corner Arc Match (Card Bottom Corners Follow Squircle Curvature)",
        "svg": "assets/glow-options/option_C1_F_stopped.svg",
        "png": "assets/glow-options/option_C1_F_stopped.svg.png"
    }
}

def main():
    root = Path(__file__).resolve().parent
    if len(sys.argv) < 2:
        print("Usage: python3 set_glow_icon.py <1-6>")
        print("\nAvailable Options:")
        for k, v in sorted(OPTIONS.items()):
            print(f"  [{k}] {v['name']}")
        sys.exit(1)

    raw_choice = sys.argv[1].strip()
    # Normalize common formats like C1A, C1_A, c1-a
    choice = raw_choice.upper().replace("_", "-")
    if choice in ["C1A", "C1B", "C1C", "C1D", "C1E", "C1F"]:
        choice = choice[:2] + "-" + choice[2:]
    elif choice in ["5A", "5B", "5C", "5D", "5E"]:
        pass

    if choice not in OPTIONS:
        print(f"Error: Invalid choice '{raw_choice}'. Please select a valid option key.")
        sys.exit(1)

    opt = OPTIONS[choice]
    svg_path = root / opt["svg"]
    png_path = root / opt["png"]

    if not svg_path.exists():
        print(f"Error: SVG file not found at {svg_path}")
        sys.exit(1)
    if not png_path.exists():
        print(f"Error: PNG file not found at {png_path}")
        sys.exit(1)

    # 1. Update favicon.svg
    shutil.copyfile(svg_path, root / "favicon.svg")
    print(f"✓ Copied {svg_path.name} -> favicon.svg")

    # 2. Generate PNGs using PIL
    img = Image.open(png_path).convert("RGBA")
    
    # 512x512
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(root / "assets/icon-512.png", "PNG", optimize=True)
    print("✓ Exported assets/icon-512.png (512x512)")

    # 192x192
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(root / "assets/icon-192.png", "PNG", optimize=True)
    print("✓ Exported assets/icon-192.png (192x192)")

    # 180x180 (apple-touch-icon)
    img_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
    img_180.save(root / "apple-touch-icon.png", "PNG", optimize=True)
    img_180.save(root / "assets/apple-touch-icon.png", "PNG", optimize=True)
    print("✓ Exported apple-touch-icon.png (180x180)")

    print(f"\n★ Successfully applied {opt['name']} as active icon!")

if __name__ == "__main__":
    main()
