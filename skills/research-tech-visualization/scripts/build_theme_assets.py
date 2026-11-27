"""Build static CSS and a visual theme selector from the bundled palette data."""

import argparse
import hashlib
from html import escape
import json
from pathlib import Path
import re


def luminance(color):
    channels = [int(color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in channels]
    return sum(channel * weight for channel, weight in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(first, second):
    values = sorted((luminance(first), luminance(second)))
    return (values[1] + .05) / (values[0] + .05)


def build(data):
    styles, cards = [], []
    default_theme = data.get('default_theme')
    if 'default_theme' in data and (not isinstance(default_theme, str) or default_theme not in data['themes']):
        raise ValueError('Invalid default theme')
    for identity, theme in data['themes'].items():
        if not re.fullmatch(r'[a-z][a-z0-9_-]*', identity):
            raise ValueError('Invalid theme id')
        colors = theme['css']
        for key, value in colors.items():
            if not re.fullmatch(r'[a-z][a-z-]*', key) or not re.fullmatch(r'#[0-9a-fA-F]{6}', value):
                raise ValueError('Invalid CSS color')
        ratios = [contrast(colors[text], colors[background]) for text in ('ink', 'muted', 'link') for background in ('paper', 'surface', 'accent-soft')]
        if min(ratios) < 4.5:
            raise ValueError(f'{identity}: text contrast below 4.5 ({min(ratios):.2f})')
        palette = theme['series'] + theme['sequential']
        if not palette or any(not re.fullmatch(r'#[0-9a-fA-F]{6}', color) for color in palette):
            raise ValueError('Invalid series/sequential palette')
        selector = f'[data-theme="{identity}"]'
        if identity == default_theme:
            selector = ':root:not([data-theme]),\n' + selector
        styles.append(selector + ' {\n' + '\n'.join(f'  --{key}: {value};' for key, value in colors.items()) + '\n}')
        chips = ''.join(f'<span class="palette-sample"><span style="background:{color}"></span><code>{color}</code></span>' for color in theme['series'])
        ramp = ''.join(f'<span style="background:{color}"></span>' for color in theme['sequential'])
        cards.append(f'''<article class="theme-card" data-theme="{identity}" id="{identity}">
<p class="eyebrow">{escape(identity)}{' / 默认主题' if identity == default_theme else ''}</p><h2>{escape(theme['label'])}</h2>
<p>{escape(theme['use'])}</p><div class="theme-surface"><strong>方法、证据与结果</strong><p class="meta">正文、次级说明和链接在真实背景下分别检查。</p><a href="gallery.html">查看可编辑资产</a></div>
<p class="meta">离散系列候选：方法身份确定后跨图保持稳定。</p><div class="palette-samples">{chips}</div>
<div class="ramp">{ramp}</div><p class="meta">{'六级顺序色：从低到高；不用于无序方法排名。' if ramp else '未提供专属顺序色；不要拿离散色拼成连续数值轴。'}</p>
</article>''')
    page = '''<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>科研可视化主题库</title><link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="themes.css"><style>
.theme-card{padding:28px;border:1px solid var(--line);border-radius:12px;background:var(--paper);color:var(--ink)}.theme-card h2{font-size:26px}.theme-surface{background:var(--surface);border:1px solid var(--line);padding:16px;margin-block:16px}.palette-samples{display:flex;flex-wrap:wrap;gap:12px}.palette-sample{display:grid;gap:5px;font-size:12px}.palette-sample>span{width:66px;height:28px;border:1px solid var(--ink);border-radius:4px}.ramp{display:flex;margin-top:20px}.ramp>span{flex:1;height:22px}.theme-card .meta{color:var(--muted)}
</style></head><body><main class="wrap"><header class="hero"><p class="eyebrow">RESEARCH / THEME LIBRARY</p><h1>方法不变，表达可以不同。</h1><p class="lead">'''+str(len(data['themes']))+''' 个可调整主题。页面角色、离散系列与顺序色分开管理；主题名称不是品牌官方标准。</p><p><a href="gallery.html">返回资产库</a></p></header><div class="grid">'''+''.join(cards)+'''</div><footer>源文件：themes.json；修改后重新生成 themes.css 和本页。色值对比检查不代替最终图面验收。</footer></main></body></html>'''
    return {'themes.css': '\n\n'.join(styles) + '\n', 'theme-gallery.html': page}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('themes', type=Path)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    files = build(json.loads(args.themes.read_text(encoding='utf-8')))
    targets = [args.out / name for name in files]
    if any(target.resolve() == args.themes.resolve() for target in targets):
        raise ValueError('Refusing to overwrite input')
    if not args.force and any(target.exists() for target in targets):
        raise ValueError('Output exists; use another directory or --force')
    args.out.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        (args.out / name).write_text(content, encoding='utf-8')
    print(json.dumps({'written': list(files), 'themes': len(json.loads(args.themes.read_text())['themes']), 'sha256': hashlib.sha256(args.themes.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
