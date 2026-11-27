# 多实验与指标

具体图型与字段需求见 [chart-recipes.md](chart-recipes.md)，现有起手资产与生成器边界见 [assets.md](assets.md)。

## 先定可比组

识别方法/实验、数据集/任务、划分、配置、重复运行、指标、数值、单位、统计类型与来源。字段按任务适用，不要求用户先制作固定格式。

对照指标定义、单位、分母、数据划分和测量窗口。性能尤其核对 GPU/CPU、batch size、精度、序列长度、并发、预热和端到端/局部测量。条件不同可以展示，但不能直接归因为方法优劣；按条件分组并明确限制。

原始逐次运行、论文均值、最佳单次和跨任务摘要分开。测试样本数不当独立运行次数；同 seed 不自动证明实验配对；同指标名字不自动证明定义相同。

## 问题决定图型

| 目的 | 推荐起点 | 保护项 |
| --- | --- | --- |
| 方法比较 | 点图、条形图、表格 | 口径与方向，完整方法身份 |
| 多数据集 | 分面、小多图、热力图加数值表 | 不跨不同单位或定义强行平均 |
| 消融 | 基线与变体表、配对点、差值图 | 控制条件与变化项，不能无证据声称因果 |
| 收敛 | 折线及必要的运行区间 | step/epoch/wall time，平滑与观测点 |
| 参数敏感性 | 曲线、分面、热力图 | 参数取值与控制条件，插值标明 |
| 稳定性 | 原始点、分布、箱线、误差线 | 重复次数、摘要类型、缺失与筛选 |
| 质量/成本 | 散点，适用时 Pareto 前沿 | 优化方向，前沿只针对观测点 |
| 全量精确值 | 结果表配重点图 | 原值与精度，不能静默 Top N |

条形长度比较通常从零起；截断轴、对数轴、归一化等有明确用途与标识。折线可以使用适合变化的范围，但不能隐藏范围制造巨大提升。双轴、雷达和综合分不默认使用；需要时声明单位、尺度、权重和局限。

## 数据与统计底线

- 保留原值与空值，不补零，不静默去掉失败、未测或异常运行；过滤、聚合和排序可追溯。
- 每指标声明 higher/lower/target 或保持未知；没有方向时不标“最佳”。
- `后值−前值`、正基数上的 `(后值−前值)/前值` 与百分点差分开。20%→30% 是 +10 个百分点、相对 +50%；零基数只报绝对差，负基数先确认解释。
- 只有原始重复结果或已给出的可靠摘要才能展示不确定性。误差线标明 SD、SE、CI 或范围及样本/运行单位；不从均值补造。
- CI 方法须适合独立性、样本量和数据分布；不要把正态近似当普适默认。无检验依据不称“显著”，误差线重叠也不替代检验。
- 宏平均、微平均、样本加权与运行均值不能混同；跨任务综合需要可比尺度和明确权重。
- 标注只补充必要比较，允许零条。标题与正文遵守同一证据门槛，不能把图上不成立的结论转写进文案。

## 检查脚本的数据契约

`check_experiments.py` 是只读前置检查，不是绘图/统计引擎。需要自动检查时由 agent 将已核对材料整理为 JSON；保留原始文件，不让用户手工改格式。最小示意：

```json
{
  "schema_version": 1,
  "metrics": {
    "accuracy": {"unit": "%", "direction": "higher", "minimum": 0, "maximum": 100}
  },
  "records": [
    {"method": "方法A", "dataset": "数据集X", "config": "配置1", "run": "种子1",
     "metric": "accuracy", "value": 80, "unit": "%", "statistic": "raw",
     "status": "ok", "source": "演示数据，不是真实实验"}
  ],
  "comparison_keys": ["dataset", "config", "metric", "statistic"],
  "condition_keys": ["config"]
}
```

示例只解释格式，禁止直接作为真实结果。

- `metrics` 声明单位、方向（`higher/lower/target/unknown`），可选 `minimum/maximum` 与 `target`；方向为 target 时须给目标值。边界来自指标定义，不由数值猜测。
- 每条记录含 `method/dataset/config/metric/unit/statistic/status/source/value`。`statistic` 为 `raw/mean/median/best`；`status` 为 `ok/missing/failed/not_measured/not_applicable`。
- `raw` 记录另需 `run`；汇总记录不带 `run`，可带真实的 `n`、`uncertainty`（字段 `kind/low/high`，可选 `level/method`）。`n` 指摘要的观测单位数量，单位另以 `sample_unit` 说明。脚本不生成区间。
- 非 ok 记录保留 `value: null`。真实失败日志中的部分数值另存原始材料，不冒充成功观测。
- 多 step、split、task 等维度可扩展字段；通过 `identity_keys` 声明唯一键，不能漏掉区分观测所需的维度。默认键为 `method,dataset,config,metric,statistic,run`，其中汇总 run 缺省视作空。
- `comparison_keys` 显式定义本次比较组，不含 method；`condition_keys` 列出所有影响可比性的条件字段。脚本报告组内条件不同、原始/汇总混杂、空值和不确定性信息不足，交给 agent 决定分组或披露。
- 脚本只验证声明的条件，不能发现未提供的硬件差异；字符串 source 只表明有定位字段，不证明来源真实。

```bash
python3 "$SKILL_DIR/scripts/check_experiments.py" "$DATA_JSON"
```

输出 JSON，0 表示结构检查无错误（仍可能需复核），1 表示数据契约错误，2 表示无法读取/解析。任何 `needs_review` 都要处理或披露，不可仅看退出码。
