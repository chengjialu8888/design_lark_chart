# 四个可独立使用的绘图扩展

主入口只选择与本任务有关的模块。完整源、参考、示例及适用检查随包提供；不是只记录四个安装链接。

| 用户任务 | 加载模块 | 独立可用的部分 | 额外依赖与交付边界 |
| --- | --- | --- | --- |
| 论文、代码或实验数据的技术图／指标比较／科研页面 | [research-tech-visualization](../skills/research-tech-visualization/SKILL.md) | 证据与统计规范、SVG/HTML/主题资产、Python 数据和结构检查 | 浏览器检查需已有 Playwright/Chromium；飞书嵌入、原生图表和网页托管按需连接当前工具。 |
| 系统阶段 × 参与方，表／字段读写与数据血缘 | [system-swimlane-diagram](../skills/system-swimlane-diagram/SKILL.md) | 阶段／泳道／线型语法、字段表、九组正反例和审图规范 | 绘制可选 SVG/HTML/代码图；写入飞书仍使用当前 CLI 和本人权限。 |
| 请求／状态／结果的逐步架构或流程演示 | [architecture-story](../skills/architecture-story/SKILL.md) | 自带 Node 离线 CLI/player、三种风格、JSON 故事、HTML 导出与验证脚本 | Node ≥20；交互 HTML 不是原生飞书画板，也不等于已托管。 |
| 用户明确要求手绘／蜡笔技术博客配图 | [crayon-tech-diagram](../skills/crayon-tech-diagram/SKILL.md) | 中英文风格参考、提示词、图片格式检查与审字方法 | 实际生成需可用图像服务；位图不是原生节点，无图像工具时只交准备材料。 |

## 路由与规则优先级

1. 用户已指定的事实、格式、主题和编辑范围优先。业务事实、证据、数值与责任不能随主题或 renderer 改变。
2. 科研模块解决证据和实验表达；泳道模块解决执行与数据语法；动画模块解决逐步讲解；手绘模块解决插画风格。不要把“动画”当成默认交付，也不要把位图装成可编辑画板。
3. 内容框架继续关联 `mck-ppt-design`，色号与视觉继续选用 [高密度模板](mck-dense-visual.md) 或任务指定主题。模块自带默认主题只在没有用户／项目风格时使用，不全量套用四种风格。
4. 同时涉及多个模块时共享已核对的事实和稳定对象名，只读任务需要的 references。独立 ZIP 不依赖相邻模块或仓库父目录。

## 按需关联，未并入本包的能力

- `lark-style-adaptive`：最终飞书正文、表格、图示的结构与排版。
- `analysis-report-writing-methodology`：报告内容结构、证据与业务解释；不替代 Mck 的本次既定分工。
- `code-smart-reading`：需要先定位源码／变更的实际行为时提供输入证据。
- `project-handoff-readiness`：交接环境、权限与验收。
- `rules-to-knowledge-graph`：需要将经验转成检索规则时使用。
- `skill-static-review`：可选的发布前结构检查；静态通过不能代替实际运行与渲染。

这些名称来自用户给定清单，仅记录关联用途；未捆绑、未安装，也不把第三方服务或其授权当作已提供。电话与消息分拣不属于本绘图扩展范围。

## ZIP 与安装

[Release v1.4.0](https://github.com/chengjialu8888/design_lark_chart/releases/tag/v1.4.0) 提供主包与四个独立 ZIP。主包含上述模块；只需要一种能力时下载对应 ZIP，解压其同名文件夹到宿主 skills 目录。保留已有用户安装，不直接覆盖。

从 Git 安装某个独立模块可显式选择：

```bash
npx skills add https://github.com/chengjialu8888/design_lark_chart --skill architecture-story --full-depth
```

对其余三个模块替换 skill 名。不同宿主的安装目录以宿主规则为准。

开发者从仓库重建同版 ZIP：

```bash
python3 scripts/package_skills.py --output /tmp/design-lark-chart-release
```

ZIP 文件名中的 1.4.0 是本次集成发布版本；模块原版本保留在各自的 SKILL.md／ORIGIN.md 和 `assets/extension-modules.json` 中。输出五个 ZIP 与含 SHA-256、大小和文件数的 `manifest.json`。脚本拒绝覆盖已有目录中的同名产物，拒绝打包符号链接；不装运行时、不登录、不写飞书。
