#!/usr/bin/env python3
"""Build deterministic, independently unpackable skill ZIPs; no install or cloud writes."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import stat
import zipfile

EXCLUDED = {'.git', 'node_modules', '__pycache__', '.venv', 'data', 'output', 'dist'}
FIXED_TIME = (2020, 1, 1, 0, 0, 0)


def version_of(root: Path) -> str:
    text = (root / 'SKILL.md').read_text(encoding='utf-8')
    match = re.search(r'^\s+version:\s*"?([0-9]+\.[0-9]+\.[0-9]+)"?\s*$', text, re.M)
    if not match:
        raise ValueError('Root SKILL.md needs a semantic metadata version')
    return match.group(1)


def source_files(root: Path, output: Path) -> list[Path]:
    files = []
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if any(part in EXCLUDED for part in relative.parts) or path.resolve().is_relative_to(output):
            continue
        if path.name in {'.DS_Store', '.env'} or path.suffix in {'.pyc', '.zip'}:
            continue
        if path.is_symlink():
            raise ValueError(f'Refusing symlink: {relative}')
        if path.is_file():
            files.append(path)
    if root / 'SKILL.md' not in files:
        raise ValueError(f'Missing skill entrypoint: {root.name}')
    return files


def build_archives(root: Path, output: Path) -> dict:
    root, output = root.resolve(), output.resolve()
    if root == output or root.is_relative_to(output):
        raise ValueError('Output must not be the source directory or its ancestor')
    version = version_of(root)
    modules = json.loads((root / 'assets/extension-modules.json').read_text())['modules']
    packages = [('design-lark-chart', root)] + [(m['name'], root / m['path']) for m in modules]
    names = [name for name, _ in packages]
    if len(names) != len(set(names)) or any(not re.fullmatch(r'[a-z0-9-]+', n) for n in names):
        raise ValueError('Invalid or duplicate package names')
    planned = [(name, source, source_files(source, output)) for name, source in packages]
    targets = [output / f'{name}-{version}.zip' for name in names] + [output / 'manifest.json']
    if any(target.exists() for target in targets):
        raise FileExistsError('Release files already exist; use a new output directory')
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'version': version, 'format': 'one-top-level-skill-directory', 'archives': []}
    for name, source, files in planned:
        target = output / f'{name}-{version}.zip'
        with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in files:
                info = zipfile.ZipInfo(f'{name}/{path.relative_to(source).as_posix()}', FIXED_TIME)
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = (stat.S_IFREG | (path.stat().st_mode & 0o777)) << 16
                archive.writestr(info, path.read_bytes())
        manifest['archives'].append({'name': name, 'file': target.name, 'files': len(files),
                                     'bytes': target.stat().st_size,
                                     'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    with (output / 'manifest.json').open('x', encoding='utf-8') as stream:
        json.dump(manifest, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = build_archives(Path(__file__).resolve().parents[1], args.output)
    except (OSError, ValueError, KeyError) as exc:
        parser.exit(1, f'Packaging failed: {exc}\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
