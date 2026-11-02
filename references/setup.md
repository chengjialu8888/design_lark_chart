# 安装、依赖与预检

## 安装 skill

`npx skills add https://github.com/chengjialu8888/design_lark_chart --skill design-lark-chart`

或克隆完整仓库到当前 Agent 的 skills/design-lark-chart。SKILL.md 与 references、scripts、assets 必须一起保留。使用 skills CLI 时会按宿主设置目录，无需绑定作者本机路径。

## 最小环境

| 能力 | 依赖与安装入口 | 验证 |
|---|---|---|
| 运行脚本 | [Python ≥3.10](https://www.python.org/downloads/)，标准库即可 | python3 --version |
| 画板转换 | [Node ≥20](https://nodejs.org/en/download)，npm/npx | node --version |
| 云文档读写 | [lark-cli](https://github.com/larksuite/cli#installation--quick-start)，按官方安装与配置 | lark-cli --version |
| 画板 CLI | [whiteboard-cli](https://www.npmjs.com/package/@larksuite/whiteboard-cli)；默认 @^0.2.13，试验后记录确切版本 | npx -y @larksuite/whiteboard-cli@^0.2.13 -v |
| 身份与权限 | 使用者自己的飞书登录、源文档读权限、目标文档编辑/创建权限 | 官方 config init、auth login；最小读取 |
| 图像复核 | Agent 图像工具；或已有浏览器／[Playwright](https://playwright.dev/docs/intro) | 真正打开PNG并检查中文、线条 |
| 历史包装器 | Bash，用于 scripts/*.sh | bash --version；Windows 可用 WSL |

安装飞书 CLI 和可选官方 skills，执行官方 README 当前推荐命令。初次安装需要访问 npm/GitHub；首次授权需要用户自己的交互，不复制作者配置。Python 不依赖 pip 包；不需要单独安装 Beautiful/Mck 或独立数据库。

## 预检与锁版本

`python3 scripts/preflight.py` 只查本地工具与核心资源。`--online` 额外调用已安装 CLI 的授权状态和 npx 画板版本；不会自动安装 CLI、登录、写入飞书。npx 首次运行可能下载画板包；由使用者的网络和 npm 配置决定。

输出能力检查和失败原因；`--output FILE` 保存 JSON。在线渲染命令可通过 WHITEBOARD_CLI_VERSION 选择已验证版本；用 `npx` 返回的版本写入任务 manifest，后续复刻尽量沿用。不能仅凭二进制存在就宣称有文档权限。

## 降级

- 缺云端权限：先交付图源/本地预览，明确待写入。
- 缺图像查看能力：不能声称视觉验收完成。
- 指令随工具升级变化：先查 `lark-cli docs +update --help` 和 `lark-cli whiteboard +update --help`，不要反复猜参数。
- 不把 Token、登录配置、访谈原文放进公共代码仓库。任务产物默认放 data/<session>/，不提交到本仓库。
