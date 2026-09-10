"""Rebuild imported catalog images without touching the source project.

Usage: python _tools/refresh-catalog-media.py <source-root> [target-root]
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageFilter


SOURCE_ROOT = Path(sys.argv[1]).resolve()
TARGET_ROOT = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else Path.cwd().resolve()
WIDTHS = (640, 960, 1440)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def target_stem(media: dict) -> str:
    return re.sub(r"-\d+\.webp$", "", media["src"])


def rebuild(source_relative: str, media: dict, *, plan: bool = False):
    source = SOURCE_ROOT / source_relative
    if not source.is_file():
        raise FileNotFoundError(source)
    with Image.open(source) as opened:
        image = opened.convert("RGB")
        source_width, source_height = image.size
        widths = [width for width in WIDTHS if width < source_width]
        widths.append(source_width if source_width <= WIDTHS[-1] else WIDTHS[-1])
        widths = sorted(set(widths))
        variants = []
        stem = target_stem(media)
        for width in widths:
            destination_relative = f"{stem}-{width}.webp"
            destination = TARGET_ROOT / destination_relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            height = round(source_height * width / source_width)
            if width == source_width and source.suffix.lower() == ".webp":
                shutil.copyfile(source, destination)
            else:
                output = image if width == source_width else image.resize((width, height), Image.Resampling.LANCZOS)
                if width < source_width and not plan:
                    output = output.filter(ImageFilter.UnsharpMask(radius=0.65, percent=38, threshold=3))
                output.save(destination, "WEBP", quality=96 if plan else 92, method=6)
            variants.append({"src": destination_relative.replace("\\", "/"), "width": width})
        media["srcset"] = variants
        media["src"] = variants[-1]["src"]
        media["width"] = variants[-1]["width"]
        media["height"] = round(source_height * variants[-1]["width"] / source_width)


def pair(source_items, target_items, source_keys, target_keys):
    source_by_slug = {item["slug"]: item for item in source_items}
    for target in target_items:
        source = source_by_slug[target["slug"]]
        for source_key, target_key, plan in zip(source_keys, target_keys, (False, False, True), strict=True):
            source_value = source.get(source_key)
            target_value = target.get(target_key)
            source_media = source_value if isinstance(source_value, list) else ([source_value] if source_value else [])
            target_media = target_value if isinstance(target_value, list) else ([target_value] if target_value else [])
            if len(source_media) != len(target_media):
                raise ValueError(f"Media count mismatch for {target['slug']}:{target_key}")
            for source_entry, target_entry in zip(source_media, target_media, strict=True):
                relative = source_entry["src"] if isinstance(source_entry, dict) else source_entry
                rebuild(relative, target_entry, plan=plan)


newbuild_source = read_json(SOURCE_ROOT / "output/newbuilds/catalog-v3.json")
newbuild_target_path = TARGET_ROOT / "src/data/newbuilds.json"
newbuild_target = read_json(newbuild_target_path)
pair(newbuild_source["items"], newbuild_target["items"], ("cover", "images", "floorplans"), ("cover", "images", "floorplans"))
write_json(newbuild_target_path, newbuild_target)

construction_source = read_json(SOURCE_ROOT / "_private/construction-projects.json")
construction_target_path = TARGET_ROOT / "src/data/construction-projects.json"
construction_target = read_json(construction_target_path)
pair(construction_source["projects"], construction_target["items"], ("mainImage", "gallery", "floorPlans"), ("mainImage", "gallery", "floorPlans"))
write_json(construction_target_path, construction_target)

referenced = set()
for catalog in (newbuild_target, construction_target):
    stack = [catalog]
    while stack:
        value = stack.pop()
        if isinstance(value, dict):
            if isinstance(value.get("srcset"), list):
                referenced.update(item["src"] for item in value["srcset"])
            stack.extend(value.values())
        elif isinstance(value, list):
            stack.extend(value)

removed = 0
for relative_root in ("assets/images/newbuilds", "assets/images/construction-projects"):
    media_root = (TARGET_ROOT / relative_root).resolve()
    if TARGET_ROOT not in media_root.parents:
        raise RuntimeError(f"Unsafe media root: {media_root}")
    for stale in media_root.rglob("*-480.webp"):
        relative = stale.relative_to(TARGET_ROOT).as_posix()
        if relative not in referenced:
            stale.unlink()
            removed += 1

print(f"Catalog media rebuilt with a 640 px minimum responsive tier and no upscaling; removed {removed} stale 480 px files.")
