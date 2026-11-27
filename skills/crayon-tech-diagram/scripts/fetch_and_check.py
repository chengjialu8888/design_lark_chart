#!/usr/bin/env python3
"""Download generated diagrams, name them by their real format, and make review thumbnails.

Usage:
  python3 fetch_and_check.py --out <dir> <name>=<url> [<name>=<url> ...]
  python3 fetch_and_check.py --out ./illustrations 01-架构=https://... 02-对比=https://...

For each item:
  - downloads the URL
  - detects the real format from magic bytes (generators often return JPEG behind a .png name)
  - saves as <out>/<name>.<jpg|png|webp|gif>
  - reads pixel size from the file header
  - writes a <=1200px thumbnail to <out>/_thumbs/ for visual text review (Pillow, else macOS sips)
Prints one JSON line per item; exits 1 if any item failed.
"""
import argparse
import json
import os
import shutil
import struct
import subprocess
import sys
import urllib.request

MAGIC = [
    (b"\xff\xd8\xff", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
]


def detect(data: bytes) -> str:
    for sig, ext in MAGIC:
        if data.startswith(sig):
            return ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return ""


def size_of(data: bytes, ext: str):
    try:
        if ext == "png":
            return struct.unpack(">II", data[16:24])
        if ext == "gif":
            return struct.unpack("<HH", data[6:10])
        if ext == "jpg":
            i = 2
            while i < len(data) - 9:
                if data[i] != 0xFF:
                    i += 1
                    continue
                marker = data[i + 1]
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack(">HH", data[i + 5:i + 9])
                    return w, h
                seg = struct.unpack(">H", data[i + 2:i + 4])[0]
                i += 2 + seg
    except struct.error:
        pass
    return None


def thumbnail(src: str, dst: str) -> str:
    try:
        from PIL import Image  # type: ignore

        with Image.open(src) as im:
            im.thumbnail((1200, 1200))
            im.convert("RGB").save(dst, "JPEG", quality=85)
        return dst
    except ImportError:
        pass
    if shutil.which("sips"):
        r = subprocess.run(["sips", "-Z", "1200", src, "--out", dst, "-s", "format", "jpeg"],
                           capture_output=True, text=True)
        if r.returncode == 0:
            return dst
    return ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("items", nargs="+", help="name=url")
    args = ap.parse_args()

    os.makedirs(os.path.join(args.out, "_thumbs"), exist_ok=True)
    failed = False
    for item in args.items:
        if "=" not in item:
            print(json.dumps({"item": item, "ok": False, "error": "expected name=url"}, ensure_ascii=False))
            failed = True
            continue
        name, url = item.split("=", 1)
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                data = resp.read()
            ext = detect(data)
            if not ext:
                raise ValueError("unrecognized image format")
            path = os.path.join(args.out, f"{name}.{ext}")
            with open(path, "wb") as f:
                f.write(data)
            dims = size_of(data, ext)
            thumb = thumbnail(path, os.path.join(args.out, "_thumbs", f"{name}.jpg"))
            print(json.dumps({"item": name, "ok": True, "path": os.path.abspath(path), "format": ext,
                              "size": dims, "thumb": os.path.abspath(thumb) if thumb else None},
                             ensure_ascii=False))
        except Exception as e:  # noqa: BLE001 - report every failure per item
            print(json.dumps({"item": name, "ok": False, "error": str(e)}, ensure_ascii=False))
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
