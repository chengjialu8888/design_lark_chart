# 高密度咨询画板：内容结构与视觉模板分开使用

## 职责与调用顺序

| 层 | 负责什么 | 如何配合 |
| --- | --- | --- |
| `mck-ppt-design` | 内容框架结构化：金字塔原则、结论型标题、论据分组、平行表达及图表选择。 | 需要完整咨询框架时，先读 [上游 skill](https://github.com/likaku/Mck-ppt-design-skill)，整理内容；不把它的默认品牌色当作本视觉模板的配色。 |
| 本视觉模板 | 16:9、严格色号、字体层级、多栏、细线、密度与对齐。 | 在内容结构确定后注入视觉约束，不代替事实核对、逻辑整理或职责分工。 |
| `design-lark-chart` | 按内容选择布局，绘制原生可编辑画板，执行静态检查与飞书回查。 | 仍走既有渲染与验收路线；本任务输出飞书画板，不因关联 Mck 而自动生成 PPTX。 |

本包可独立画图；Mck 是关联的内容组织 skill，需加载它时不能声称未读取的 skill 已执行。若另行交付 PPTX，应遵循上游完整生成及 QA 流程。

## 何时用

用户要求本风格，或画板出现文字一大片、重点不清时选用。不是所有图的强制默认，也不是固定业务模板。先提炼结论、整理层次，再重排视觉；模块数、列数和流程分支由实际内容决定。

## 视觉约束

| 元素 | 规定 |
| --- | --- |
| 画幅 | 16:9；尺寸可按内容等比例计算，长流程拆总览与细图，保留可追溯连接。 |
| 背景 | 白色 `#FFFFFF`。 |
| 标题与强调 | 深海军蓝 `#071F2D`，正文也用可读的深色，本预设使用同色。 |
| 图表主色 | 深青 `#005A78`。 |
| 重点 | 亮青 `#00A9E0`，用于小面积重点或深色文字的背景强调；浅底上的小字不依赖亮青传达信息。 |
| 次级数据 | 浅蓝 `#A9C6F5`。 |
| 分隔线 | 灰 `#D9DDE1`。 |
| 字体 | 粗体衬线标题、紧凑无衬线正文；使用环境与飞书可支持的字体，检查中文及实际导出。不能保证字体时记录替代与显示结果。 |
| 排版 | 结构化多栏、薄分隔线、精确对齐；用图表、表格、矩阵、时间线与短洞见增加信息密度。 |
| 避免 | 过多留白、装饰、圆角卡片、过大图形；不要用极小字或删掉事实来提高密度。 |

同一张图应用本预设时，统一覆盖原有暖底、圆角卡片等视觉风格；不更改既有流程语义、责任、统计口径或事实。读者仍应能解释谁做什么、交给谁、何时过关，以及失败如何处理。

## 样式参数与检查

参数文件：[mck-dense-consulting.json](../assets/style-tokens/mck-dense-consulting.json)。这是用户指定的视觉预设，不是从参考画板统计出来的样式，也没有历史出现次数。

- 把六个允许颜色与本次使用的字号等参数写入任务的 `plan.style_budget`；不要在 Render 时临时加色。
- 保留 `style_budget.allowed_colors`，供现有 `lint_svg_quality.py --plan ... --strict-budget` 校验。也可用 `--style-seed mck-dense-consulting` 读取色集。
- 该 JSON 定义视觉参数，不是严格 Planner schema 下的一份完整 plan；按规划契约选取适用字段，不把整份预设当业务节点或固定坐标。
- 检查数字和单位／区间一起突出、层次清楚、无文字重叠、无穿线，并保留必要的责任、条件和证据。静态色集检查不能替代实际导图验收。
- 本次发布的是模板与参数；没有新增云端图，不宣称已完成该模板的字体和云端往返验证。

## 原始可复制视觉提示词

以下是用户原始输入。文字中的 Pyramid Principle 与 conclusion-driven headlines 属于内容结构要求，可由 Mck 协助完成；其余指定色号与版式由本预设承接。

```text
Create a high-density McKinsey-style consulting presentation in 16:9 format（lark-whiteboard）. Use a strict color palette: white backgrounds, deep navy (071F2D) for headings and emphasis, dark teal (005A78) for charts, bright cyan (00A9E0) for highlights, light blue (A9C6F5) for secondary data, and gray (D9DDE1) for dividers. Apply bold serif headlines, compact sans-serif body text, structured multi-column layouts, thin rules, and precise alignment. Maximize information density with charts, tables, matrices, timelines, and concise insights. Follow the Pyramid Principle with conclusion-driven headlines. Avoid excessive whitespace, decorative elements, rounded cards, and oversized graphics.
```

## 组合调用示例

> 先用 mck-ppt-design 的内容框架整理材料：一句结论统领一图，按论据和关系分组；再应用 mck-dense-consulting 的视觉预设，采用指定 16:9、白底和六色色板，在 lark-whiteboard 交付可编辑画板。内容、布局及节点由本次材料决定，保留所有独有事实和限定，完成静态检查与真实导图回查。此任务不生成 PPTX。
