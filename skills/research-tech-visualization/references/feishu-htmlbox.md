# HTMLBox 文档嵌入

适合自定义 SVG、架构/流程、指标切换和复合图解。图体是完整 HTML 文本，不是一个公开网页 URL；飞书原生数据编辑另走 [原生图表](feishu-native.md)。

## 从已有页面准备模块

1. 依据用户选择保留整页或拆成章节。长报告通常以正文交代口径、HTMLBox 承载相关图及交互，避免整页塞入一个难读的小窗口；不强制固定模块数。
2. 在任务副本中内联 CSS、必要 JS、SVG 和固定数据。相对 `style.css`、`app.js`、本地 JSON `fetch` 或 `file://` 路径不能作为远端依赖。外部媒体只用已获准且目标宿主可访问的资源；不要为嵌入擅自上传。
3. 处理所有导航/下载：本地 `figures/*.svg`、`data.json` 链接改为实际可访问的授权附件，或显式用户点击的 Blob 导出。不能只内联图体却保留失效下载。Blob、storage、cookie、跨 frame、脚本与外部资源受宿主 CSP/客户端限制，需真实验证。
4. 将带 `defer` 的外部脚本改为内联时核对初始化时序；不要因内联去掉 defer 就让脚本在 DOM 之前执行。原 DOM ID、语义、方法色、指标原值、空值与全部表保留。
5. 无脚本时保留完整静态图和数据；减少动态效果与打印可读。移动端不能把长图缩到看不清，使用纵向指标卡或标明局部滚动。

可参考 `assets/sharing-module.html`。它是合成示例和本地起点，不是用户结果或宿主验收证明。已有完整页面只做必要的依赖/导航转换，不自动重设计。

## 写入与更新

获得目标 Docx 的插入授权后，读取实际 `consulting-charts` 的 `references/htmlbox-mode.md`；定位章节或旧块时按需读它的编辑与批量规则。脚本内部负责 user 身份、Wiki 路由、Block API 和回读，勿让另一个工具重复写同一组件。

```bash
python3.11 "$CHART_SKILL_DIR/scripts/chart_generator.py" --mode htmlbox \
  --doc "$DOC_URL" --html-document "$MODULE_HTML" -o "$LOCAL_OUTPUT_HTML"
```

变量取本轮已确认路径/目标。`--html-document` 原样透传完整文档，不注入高度、标题或 runtime；展示参数直接写进模块，不能再传 `--title/--height` 等 presentation 参数。默认追加；需要落在指定章节时使用该工具当前支持的定位契约，不能以内容相同猜幂等键。

先生成而不写文档时使用 `--no-doc` 并省略 `--doc`，两者不能混用。更新已明确指定的 HTMLBox 时加 `--update-block-id "$OLD_BLOCK_ID"`；当前工具按新块插入、回读核验、原位置旧块删除的方式替换，成功后保存**新 block_id**。批量需要显式占位符/placement map，不能删改相似正文来匹配。

目标文档不存在且用户明确要求新建时，通过可用正文工具创建，再向返回的新 Docx 插入模块；HTMLBox 脚本本身不负责创建整份文档。不把来源 URL 当目的地默认覆盖。

## 验收与失败边界

- 本地：用本 skill 的结构和渲染检查，测试指标切换、静态回退、模块宽度、下载内容以及零/缺失；本地成功不能标为“已写入”。
- 保存：要求 `write_confirmed/verified/result_unknown`，定点回读 AddOns `record.html` 与本轮 HTML 精确一致。`docs +fetch` 只显示 ISV 占位符时不判为空；由组件工具读 raw Block API，不下载或打印完整运行态 record。
- 宿主：在真实飞书文档检查静态首帧、文字裁切、滚动、按钮、完整表和下载。移动端未测就明说；API 成功不代替客户端渲染。
- 权限：跟随目标文档访问能力，但目标副本的 ACL 可能不同于源文档；不因嵌入成功自动开放外部访问。

`result_unknown=true` 或明确写入但回读未通过时，不再次 POST、不切换工具或手工插入来“补救”。保留 block/phase，按工具执行安全回读并停止，候选仅供人工判断。不支持交互或首帧空白时先诊断真实问题；静态图片、原生图表或妙搭都是改变交付方式，先说明损失并征得用户同意。
