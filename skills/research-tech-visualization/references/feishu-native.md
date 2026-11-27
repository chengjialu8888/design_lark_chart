# 飞书原生可编辑图表

用于组件内数据编辑和支持的图型切换。不将完整网页、任意 SVG 架构图或定制交互伪装成原生图表。

## 从科研数据到原生 payload

先按 [实验规范](experiments.md) 定好可比组；每张图保留任务、层级、类别、指标定义/单位、摘要类型、覆盖、配置差异和来源。拆成多个原生图不等于允许跨任务平均。

实际可用 `consulting-charts` 的 `references/feishu-mode.md`、`feishu-type-mapping.md` 定义当时支持范围，以其真实 record adapter 为准，不以 UI 菜单或底层 VChart 能力猜可用类型。标准多系列起点为：

```json
{
  "categories": ["风险类别一", "风险类别二"],
  "series": {"方法 A": [0.42, 0.23], "方法 B": [0.51, 0.31]}
}
```

这是合成示意；实际文件可用 `assets/feishu-native-data.json` 作适配起点，不代表任何真实模型。原始数据和这个 payload 分开保存，并为每个值保留回到原业务键的映射；不能把原生产物 sidecar 当作远端实时数据。

### 缺失和统计表达

- 原生条形/分组适配器可能拒绝 `null`；折线等类型的空值契约不同。**不改零、不用未测方法的另一档结果填补、不为了接受空值把无序方法硬改成折线**。
- 某些底层适配器会把 null 转成零；不能只检查转换后的 record。对 `categories/series` 点估计条形输入，先运行本 skill 的 `check_feishu_payload.py`，再逐值比对原值和适配产物。该检查器不适用于所有原生图型，也不验证来源、统计或远端功能。
- 若所选原生图型无法无损表达，说明后建议 HTMLBox；或经用户同意只画已报告子集，并在相邻完整表列出未测/失败及筛选范围。部分分类缺失时不静默删除整方法。
- 固定 selected checkpoint 与均值/最佳单次分开。若原生 record 只保存点估计，SD/CI 不能偷偷省略后仍称“均值与误差图”；在可见表/图注保留，或改路线。
- 原生组件可能改变颜色、精度、轴或布局。明确方法名称/图例作为身份基础，验证颜色映射是否生效；主题配置未消费时不说“字节主题原样保留”。

## 创建与编辑

只有明确授权写入/更新目标 Docx 才调用组件工具。以下命令示意单图，类型/字段需按当前适配器确认：

```bash
python3 "$SKILL_DIR/scripts/check_feishu_payload.py" "$NATIVE_DATA_JSON"
python3.11 "$CHART_SKILL_DIR/scripts/chart_generator.py" --mode feishu \
  --doc "$DOC_URL" -t hgrouped -d "$NATIVE_DATA_JSON" \
  --title "$CHART_TITLE" --load-mode view
```

上方第一条适用于本例标准条形输入，有错误时停止，不执行下一条写入命令。`SKILL_DIR` 是本 skill 目录，其余变量取本轮真实值。

默认 `view` 打开图面不等于关闭数据编辑；要求直接进入编辑器时显式 `--load-mode edit`。`--readonly` 关闭组件内编辑但**不是文档 ACL**，不能阻止有文档编辑权的人删除块。数据口径、样本覆盖、来源等必要文字由相邻正文/表承载；不能因为原生不支持 subtitle 等参数就删掉。

更新已明确指定原生块时使用该工具的 `--update-block-id` 及安全替换流程，保存返回的新 ID。如果用户后来改过远端图，先确认其当前内容；不可从旧 sidecar 覆盖。自动同步、版本冲突策略另行设计，单次写入不称为动态数据连接。

## 降级与核验

某些单图类型或 payload 在当前工具会正常退出但只生成**本地 PNG**，未写 Docx；批量可能在写入前拒绝不支持类型。检查 `status/fallback/write_confirmed/verified/result_unknown` 和产物格式，不能只看 exit 0。

用户要求原生可编辑时，PNG 不满足要求；原生不支持就保留数据并说明可选路线。确需插入 PNG 必须用户同意降级并具备媒体写入授权，由正文/媒体工具插入后单独回读，不能偷偷作为原生交付。

服务端业务 record 定点回读后，核对类目、列序、精度、数值与缺失范围，再在真实客户端测试首帧、编辑数据、支持的类型切换及阅读权限。只验证本地 adapter 不说已写入；只验证 API 不说已渲染；未做远端编辑测试不说已验收原生编辑功能。写结果未知时遵守 [分享](feishu-sharing.md) 和工具的停止规则。
