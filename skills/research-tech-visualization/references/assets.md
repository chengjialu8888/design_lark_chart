# 资产选用与修改

先看 `assets/gallery.html`，再只读选中的源文件。规则在 references，颜色数据和可复制源码在 assets；不用每次加载整个目录。

## 实装内容与依赖

| 需要 | 起点 | 一起保留 |
| --- | --- | --- |
| 独立结构/数据关系 | architecture.svg | 自包含，无外部依赖 |
| 条件与回路 | flow.svg | 自包含 |
| 并行与合流 | parallel-flow.svg | 自包含 |
| 跨主体消息时序 | sequence.svg | 自包含 |
| 分层职责 | layered-architecture.svg | 自包含 |
| 原子图形组件 | diagram-primitives.svg | 复制所需元素及 defs/style，重命名 ID |
| 学术项目页 | paper-page.html | tokens.css、themes.css、引用的 SVG；保留/更新链接目标 |
| 长方法说明 | method-page.html | tokens.css、themes.css、引用的图与链接目标 |
| 多实验页面 | results-page.html / experiment-panel.html | 样式、chart-*.svg、数据/配置、全量表入口 |
| 配色 | themes.json / themes.css | 前者为真源，后者为生成 CSS；theme-gallery.html 用于选型 |
| 字节蓝青主题实景 | bytedance-theme.html | tokens.css、themes.css；图为内联 SVG，指标为明确标注的合成示意 |
| 动态机制讲解 | motion-demo.html | tokens.css、themes.css、motion.css、motion.js |
| HTMLBox 单模块或单文件分享准备 | sharing-module.html | 自包含 HTML/SVG/JS，合成示例；不是已发布链接 |
| 飞书原生指标数据起点 | feishu-native-data.json | 标准 categories/series payload，合成有限数值；口径与来源在相邻说明 |
| 视觉预览 | previews/*.png | 仅用于选型，不冒充节点可编辑源 |

页面示例之间的导航可删除或改为本次实际目标。若只需一张图，不复制 gallery、所有页面和截图。为了方便完整试用可以复制整个 assets 目录；正式交付再按实际消费者精简。

## 实验资产重建

`experiment-data.json` 是按实验契约整理的**合成均值摘要**；`chart-config.json` 指定方法顺序、颜色、数据集、指标、配置与显式坐标范围。修改数据后同时重建图表和完整表，不能仅改 SVG 数字标签。

```bash
python3 "$SKILL_DIR/scripts/check_experiments.py" "$ASSET_COPY/experiment-data.json"
python3 "$SKILL_DIR/scripts/render_chart_assets.py" \
  --data "$ASSET_COPY/experiment-data.json" \
  --config "$ASSET_COPY/chart-config.json" \
  --themes "$ASSET_COPY/themes.json" --out "$ASSET_COPY" --force
```

这里 `ASSET_COPY` 是本次获准修改的资产副本。生成器依赖同目录的 `check_experiments.py` 和 `build_theme_assets.py`，从 skill 的 scripts 目录运行，不只拷贝单个脚本。

生成器只接受一个明确 config、两个指定指标、显式方法/数据集组合的 mean 摘要。组合缺失要提供 status 与 null；未选中的维度/配置、raw、重复身份、越界坐标会拒绝，不自动聚合或丢掉。存在其他比较维度时选合适工具或明确拆视图，不删维度来满足生成器。

五种图型为 `chart-dot.svg`、`chart-interval.svg`、`chart-small-multiples.svg`、`chart-tradeoff.svg`、`chart-heatmap.svg`；点图与区间图另有 `-compact.svg` 双栏版，还有含全量表的 `experiment-panel.html`。区间沿用已提供类型，不计算 CI/显著性；颜色没有专属顺序色时使用明确的六级蓝色备用阶梯。标签过长时调整 config 的 labels 边距或布局，不改原值。

## 主题和页面

主题操作见 [themes.md](themes.md)。新任务无其他约束时默认字节蓝青；复用其他主题示例时设置 `data-theme="bytedance"`，并核对外部 SVG。`data-theme` 只改变页面角色，外部 SVG 需要单独同步；method_colors 是稳定身份映射，不随着页面换肤自动重排。图表配置未写 theme 时采用 `themes.json` 的 default_theme，显式 theme 优先。

三个页面有不同区域关系：学术页跨栏讲述、方法页侧栏导读、实验页矩阵比较。替换示例文字、模块和数据后，保留有价值的构图关系；无内容的槽位可删除。源页不含真实作者/DOI，不要把模板用语当成最终研究文案。

## 动效和验证

动态示例默认静态，点击后播放；按 [motion.md](motion.md) 选择效果。它只提供 HTML 播放，不提供 GIF/视频导出。复制控制器时保留无脚本、减少动态效果与静态打印状态。

每次修改都核对数据/关系，检查生成源与最终图面。通用检查见 [delivery-validation.md](delivery-validation.md)。随包截图只验证打包时的示例，不能替代用户数据的验收；修改源以后需更新真正受影响的截图。

## 飞书分享资产

`sharing-module.html` 演示一个自包含比较模块：内联样式和脚本、原生 SVG、指标切换、缺失显示、同页完整表以及 Blob CSV 下载。可作为 HTMLBox 完整文档的本地起点，或妙搭内容迁入前的表达参考；脚本交互在新版平台可能要求 `frontend` 类型，按 [妙搭分享](miaoda-sharing.md) 判定，不能直接套静态 `html` 发布。

`feishu-native-data.json` 是同一合成模块中 R@P95 的标准有限数值输入，可用于原生数据适配验证。另一个指标含缺失，不能把 null 改零塞入原生条形图。以 [飞书原生](feishu-native.md) 的缺失处理为准。

这两份资产只验证本地表达与适配，不证明已写入飞书、宿主支持下载、已发布或权限生效。没有指定远端目标和写入授权时，打开资产不会调用平台 API。
