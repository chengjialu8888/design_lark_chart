"""Render five editable mean-summary chart starters without inventing statistics."""

import argparse
import hashlib
from html import escape
import json
from pathlib import Path
import re

from check_experiments import finite, inspect, reject_constant, unique_object


def load(path):
    return json.loads(path.read_text(encoding='utf-8'), parse_constant=reject_constant, object_pairs_hook=unique_object)


def build(data, config, themes, digest):
    report = inspect(data)
    if report['errors']:
        raise ValueError('; '.join(report['errors']))
    methods, datasets = config['methods'], config['datasets']
    primary, cost = config['primary_metric'], config['cost_metric']
    if not methods or not datasets or len(set(methods)) != len(methods) or len(set(datasets)) != len(datasets):
        raise ValueError('Methods/datasets must be nonempty and unique')
    if config['focus_dataset'] not in datasets or primary == cost:
        raise ValueError('Invalid focus dataset or metric selection')
    if type(config['precision']) is not int or not 0 <= config['precision'] <= 8:
        raise ValueError('Precision must be an integer from 0 to 8')
    for method in methods:
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', config['method_colors'][method]):
            raise ValueError('Method colors must be explicit hex colors')
    for metric in (primary, cost):
        lower, upper = config['domains'][metric]
        if not finite(lower) or not finite(upper) or lower >= upper:
            raise ValueError('Invalid axis domain')
    if not isinstance(data.get('notice'), str) or not data['notice'].strip():
        raise ValueError('A visible notice/context is required')
    indexed = {}
    for record in data['records']:
        if record['statistic'] != 'mean' or record['config'] != config['config']:
            raise ValueError('Starter accepts only mean summaries in one explicit configuration')
        if record['method'] not in methods or record['dataset'] not in datasets or record['metric'] not in (primary, cost):
            raise ValueError('Input contains unselected dimensions; do not silently omit records')
        key = (record['method'], record['dataset'], record['metric'])
        if key in indexed:
            raise ValueError('Additional dimensions collide; use another renderer or explicit separate views')
        indexed[key] = record
        if record['status'] == 'ok':
            values = [record['value']]
            if record.get('uncertainty'):
                values += [record['uncertainty']['low'], record['uncertainty']['high']]
            lower, upper = config['domains'][record['metric']]
            if any(not lower <= value <= upper for value in values):
                raise ValueError('Value/interval outside explicit domain; change the axis, not the data')
    expected = {(method, dataset, metric) for method in methods for dataset in datasets for metric in (primary, cost)}
    if set(indexed) != expected:
        raise ValueError('Missing combination; include an explicit unavailable record instead of dropping it')
    theme_id = config.get('theme', themes.get('default_theme'))
    if not isinstance(theme_id, str) or theme_id not in themes['themes']:
        raise ValueError('Invalid or missing theme')
    config = {**config, 'theme': theme_id}
    theme = themes['themes'][theme_id]
    ink, muted, grid = theme['css']['ink'], theme['css']['muted'], theme['css']['line']
    surface = theme['css']['surface']
    left, right = config['labels']['left'], config['labels']['right']
    if any(type(value) is not int or value < 80 for value in (left, right)) or left + right > 650:
        raise ValueError('Label margins must leave at least 390 units of plot width')
    width, plot_width = 1040, 1040 - left - right
    number = lambda value: f"{value:.{config['precision']}f}"
    xml = lambda value: escape(str(value), quote=True)

    def text(horizontal, vertical, value, size=17, anchor='start', color=None):
        return f'<text x="{horizontal:.3f}" y="{vertical:.3f}" font-size="{size}" text-anchor="{anchor}" fill="{color or ink}">{xml(value)}</text>'

    def line(start_x, start_y, end_x, end_y, color=grid, extra=''):
        return f'<line x1="{start_x:.3f}" y1="{start_y:.3f}" x2="{end_x:.3f}" y2="{end_y:.3f}" stroke="{color}" {extra}/>'

    def coordinate(value, metric, start=None, extent=None):
        start = left if start is None else start
        extent = plot_width if extent is None else extent
        lower, upper = config['domains'][metric]
        return start + (value - lower) / (upper - lower) * extent

    def metric_label(metric):
        definition = data['metrics'][metric]
        direction = {'higher':'越高越好','lower':'越低越好','unknown':'方向未知','target':'目标值'}[definition['direction']]
        return f"{definition.get('label', metric)} ({definition['unit']}) · {direction}"

    def axis(metric, top, bottom):
        content = []
        lower, upper = config['domains'][metric]
        for tick in range(6):
            value = lower + (upper - lower) * tick / 5
            horizontal = coordinate(value, metric)
            content += [line(horizontal, top, horizontal, bottom), text(horizontal, bottom + 28, number(value), 15, 'middle', muted)]
        content.append(text(left, bottom + 62, metric_label(metric), 16, color=muted))
        return ''.join(content)

    def frame(identity, title, subtitle, content, height):
        return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="{identity}-title {identity}-desc" data-viz-type="chart" data-source-sha256="{digest}">
<title id="{identity}-title">{xml(title)}</title><desc id="{identity}-desc">{xml(subtitle)}。{xml(data['notice'])}</desc>
<style>text{{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}}</style><rect width="{width}" height="{height}" fill="{surface}"/>
{text(32,44,title,27)}{text(32,77,subtitle,16,color=muted)}{content}
{text(32,height-22,data['notice'],15,color=muted)}</svg>'''

    def row_chart(identity, title, dataset_list, intervals, compact=False):
        content, vertical = [], 132
        for dataset in dataset_list:
            content.append(text(32, vertical, f"{dataset} / {config['config']}", 18))
            vertical += 36
            content.append(axis(primary, vertical - 18, vertical + 60 * (len(methods) - 1) + 20))
            for method in methods:
                record = indexed[(method, dataset, primary)]
                content.append(text(left - 20, vertical + 6, method, 18, 'end'))
                if record['status'] != 'ok':
                    content.append(text(left + 16, vertical + 6, f"未绘点：{record['status']}", 17, color=muted))
                else:
                    horizontal = coordinate(record['value'], primary)
                    color = config['method_colors'][method]
                    uncertainty = record.get('uncertainty') if intervals else None
                    if uncertainty:
                        low = coordinate(uncertainty['low'], primary)
                        high = coordinate(uncertainty['high'], primary)
                        content += [line(low,vertical,high,vertical,color,'stroke-width="3"'), line(low,vertical-6,low,vertical+6,color,'stroke-width="2"'), line(high,vertical-6,high,vertical+6,color,'stroke-width="2"')]
                    content.append(f'<circle data-method="{xml(method)}" data-dataset="{xml(dataset)}" data-value="{record["value"]}" cx="{horizontal:.3f}" cy="{vertical}" r="7" fill="{color}" stroke="{ink}"/>')
                    summary = f"{number(record['value'])} {record['unit']}"
                    if intervals and compact:
                        summary = f"{number(record['value'])} · {uncertainty['kind']}" if uncertainty else f"{number(record['value'])} · 无区间"
                    elif intervals:
                        summary += f" · {uncertainty['kind']} [{number(uncertainty['low'])}, {number(uncertainty['high'])}]" if uncertainty else ' · 区间未提供'
                    content.append(text(width - right + 20,vertical + 6,summary,16))
                vertical += 60
            vertical += 84
        subtitle = '均值；区间原样显示已给类型，n 见全量表' if intervals else '均值点图；不展示区间，请结合完整数据表'
        if compact:
            subtitle = '均值与给定区间；n 与详细口径见完整表' if intervals else '同配置均值；不展示区间'
        return frame(identity,title,subtitle,''.join(content),vertical + 30)

    files = {
        'chart-dot.svg': row_chart('dot','方法比较：先看位置，再读精确值',[config['focus_dataset']],False),
        'chart-interval.svg': row_chart('interval','均值与不确定性：有依据才画区间',datasets,True),
        'chart-small-multiples.svg': row_chart('facets','跨数据集比较：共享尺度，保留身份',datasets,False)
    }
    content = [axis(cost,140,420), text(32,114,metric_label(primary),16,color=muted)]
    lower, upper = config['domains'][primary]
    for tick in range(6):
        value = lower + (upper - lower) * tick / 5
        vertical = 420 - (value - lower) / (upper - lower) * 280
        content += [line(left,vertical,width-right,vertical),text(left-18,vertical+5,number(value),15,'end',muted)]
    for index, method in enumerate(methods):
        value_y = indexed[(method,config['focus_dataset'],primary)]
        value_x = indexed[(method,config['focus_dataset'],cost)]
        legend_y = 165 + index * 72
        content.append(text(width-right+20,legend_y,method,17))
        if value_x['status'] == value_y['status'] == 'ok':
            horizontal = coordinate(value_x['value'],cost)
            vertical = 420 - (value_y['value'] - lower) / (upper - lower) * 280
            content.append(f'<circle data-method="{xml(method)}" data-x="{value_x["value"]}" data-y="{value_y["value"]}" cx="{horizontal:.3f}" cy="{vertical:.3f}" r="9" fill="{config["method_colors"][method]}" stroke="{ink}"/>')
            content.append(text(horizontal,vertical-15,index+1,16,'middle'))
            content.append(text(width-right+20,legend_y+27,f"{index+1}: {number(value_x['value'])} {value_x['unit']} / {number(value_y['value'])} {value_y['unit']}",15,color=muted))
        else:
            content.append(text(width-right+20,legend_y+27,'缺少配对值，未绘点',15,color=muted))
    files['chart-tradeoff.svg'] = frame('tradeoff','成本与质量：同配置下的观测点',f"{config['focus_dataset']} / {config['config']}；仅比较均值，不作显著性或全局最优声明",''.join(content),570)
    content, cell_width = [], plot_width / len(datasets)
    ramp = theme['sequential'] or ['#edf2f7','#d9e5ef','#a9c5df','#6a9bc2','#356891','#163b5a']
    from build_theme_assets import contrast
    for column, dataset in enumerate(datasets):
        content.append(text(left+cell_width*(column+.5),128,dataset,18,'middle'))
    for row, method in enumerate(methods):
        vertical = 154 + row*74
        content.append(text(left-18,vertical+39,method,18,'end'))
        for column, dataset in enumerate(datasets):
            record = indexed[(method,dataset,primary)]
            horizontal = left + column*cell_width
            value = record['value']
            ratio = (value-lower)/(upper-lower) if value is not None else None
            fill = ramp[min(len(ramp)-1,int(ratio*len(ramp)))] if ratio is not None else surface
            foreground = '#ffffff' if contrast('#ffffff',fill) > contrast('#172b42',fill) else '#172b42'
            content.append(f'<rect data-method="{xml(method)}" data-dataset="{xml(dataset)}" data-value="{xml(value)}" x="{horizontal:.3f}" y="{vertical}" width="{cell_width-6:.3f}" height="66" fill="{fill}" stroke="{grid}"/>')
            content.append(text(horizontal+(cell_width-6)/2,vertical+39,number(value) if value is not None else 'NA',18,'middle',foreground))
    bottom = 168 + len(methods)*74
    for index,color in enumerate(ramp):
        content.append(f'<rect x="{left+index*42}" y="{bottom}" width="42" height="16" fill="{color}"/>')
    content += [text(left,bottom+42,f'{lower:g} → {upper:g}；六级等宽数值区间',15,color=muted),text(left,bottom+71,metric_label(primary),16,color=muted)]
    files['chart-heatmap.svg'] = frame('heatmap','结果矩阵：颜色编码值，不编码方法排名','同指标同范围；数字保留精确读数，NA 不当零',''.join(content),bottom+125)
    width, left, right, plot_width = 560, 90, 150, 320
    files['chart-dot-compact.svg'] = row_chart('dot-compact','方法位置：同尺度比较',[config['focus_dataset']],False,True)
    files['chart-interval-compact.svg'] = row_chart('interval-compact','区间信息：不补造误差',datasets,True,True)
    rows = []
    for record in data['records']:
        uncertainty=record.get('uncertainty')
        interval=f"{uncertainty['kind']} [{uncertainty['low']}, {uncertainty['high']}]" if uncertainty else '未提供'
        values=[record['dataset'],record['method'],record['config'],data['metrics'][record['metric']].get('label',record['metric']),record['value'] if record['value'] is not None else '—',record['unit'],record['status'],record.get('n','未知'),interval,record['source']]
        rows.append('<tr>'+''.join(f'<td>{xml(value)}</td>' for value in values)+'</tr>')
    figures=''.join(f'<figure class="panel"><h2>{xml(name)}</h2><p class="scroll-hint">窄屏可横向滚动；完整值见下表。</p><div class="scroll" tabindex="0" role="region" aria-label="{xml(name)}"><img class="chart" src="{name}" alt="{xml(name)}，均值摘要图"></div><figcaption>图形与表格来自同一输入；不代表显著性检验。</figcaption></figure>' for name in files if '-compact' not in name)
    warnings=''.join(f'<li>{xml(warning)}</li>' for warning in report['warnings'])
    files['experiment-panel.html']=f'''<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{xml(data.get('title','实验结果'))}</title><link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="themes.css"></head><body data-theme="{xml(config['theme'])}"><main class="wrap"><header class="hero"><p class="eyebrow">EXPERIMENTS / EDITABLE STARTER</p><h1>{xml(data.get('title','实验结果'))}</h1><p class="notice">{xml(data['notice'])}</p><p><a href="gallery.html">资产库</a> · <a href="experiment-data.json">数据 JSON</a></p></header><div>{figures}</div><section class="section" id="table"><h2>完整记录</h2><p class="scroll-hint">表格可横向滚动；缺失、配置和来源不省略。</p><div class="scroll" tabindex="0" role="region" aria-label="完整实验数据"><table><caption>{len(rows)} 条摘要记录；成功观测数不等于测试样本数。</caption><thead><tr>{''.join(f'<th scope="col">{heading}</th>' for heading in ['数据集','方法','配置','指标','原值','单位','状态','n','区间','来源'])}</tr></thead><tbody>{''.join(rows)}</tbody></table></div><h3>保留的复核提示</h3><ul>{warnings}</ul></section><footer>数据＋配置＋主题 SHA-256：<code>{digest}</code>。这是生成快照，不自动同步。</footer></main></body></html>'''
    return files, report


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--data',required=True,type=Path)
    parser.add_argument('--config',required=True,type=Path)
    parser.add_argument('--themes',required=True,type=Path)
    parser.add_argument('--out',required=True,type=Path)
    parser.add_argument('--force',action='store_true')
    args=parser.parse_args()
    inputs=[args.data,args.config,args.themes]
    digest=hashlib.sha256(b'\0'.join(path.read_bytes() for path in inputs)).hexdigest()
    files,report=build(*(load(path) for path in inputs),digest)
    targets=[args.out/name for name in files]
    if any(target.resolve() in {path.resolve() for path in inputs} for target in targets):
        raise ValueError('Refusing to overwrite input')
    if not args.force and any(target.exists() for target in targets):
        raise ValueError('Output exists; use another directory or --force')
    args.out.mkdir(parents=True,exist_ok=True)
    for name,content in files.items():
        (args.out/name).write_text(content,encoding='utf-8')
    print(json.dumps({'written':list(files),'sha256':digest,'warnings':report['warnings']},ensure_ascii=False))


if __name__=='__main__':
    main()
