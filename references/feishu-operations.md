# 飞书操作：最小读写与回查

命令示例需按安装版本 `--help` 核对。所有真实 token 从工具返回读取，不从URL猜；CLI内容参数用参数数组或文件，防止shell把文案解释成代码。写入必须在用户授权的目标内。

## 新文档/新画板

用户要求新建时，可以创建包含画板的文档：

```bash
lark-cli docs +create --api-version v2 --content '<title>Diagram</title><whiteboard type="blank"></whiteboard>' --as user
```

从成功响应取doc token和画板block_token。已有文档先 `lark-cli docs +fetch --doc DOC --detail full`；需要增加画板时对最新block原位插入，不重建整篇。对已有画板复用token，回读并备份原图。

## SVG本地检查、转换

```bash
npx -y @larksuite/whiteboard-cli@^0.2.13 -i diagram.svg -f svg --check
npx -y @larksuite/whiteboard-cli@^0.2.13 -i diagram.svg -f svg --to openapi -o board.openapi.json
npx -y @larksuite/whiteboard-cli@^0.2.13 -i diagram.svg -f svg -o preview.png
```

新图内容或已授权替换整图时，可将成功转换的原生节点写入目标画板：

```bash
lark-cli whiteboard +update --whiteboard-token BOARD --source @./board.openapi.json --input_format raw --as user
```

是否需要幂等标识、覆盖参数以及其具体格式以当前CLI帮助为准。不得对未授权替换的既有画板附加 `--overwrite`。适用的代码图可按官方说明使用mermaid/plantuml并回读code；当前版本无法回读时记录，不能虚报。

## 真实回查

```bash
lark-cli whiteboard +query --whiteboard-token BOARD --output_as image --output ./output --as user
lark-cli whiteboard +query --whiteboard-token BOARD --output_as raw --output ./output --as user
```

读取实际响应路径并打开图像。检查前后关键角色、关系、数字、中文与失败分支，回到文档确认布局和链接。若命令不支持当前参数，先读help/官方说明，不轮流猜版本。

来源：[官方CLI](https://github.com/larksuite/cli)、[官方画板skill](https://github.com/larksuite/cli/tree/main/skills/lark-whiteboard)。不需要把整个官方skill包复制到本skill才能理解此最小路径；复杂Docx写作可另装lark-doc。
