# 妙搭托管与网页分享

用于保留独立网页体验和可分享入口。先读取实际安装的 `lark-apps/SKILL.md`，根据**当前版本**判定 app 类型、开发路径、资源和发布合同；这里约束科研成果迁入与证据边界，不替代平台手册。

## 先分类型，不无谓重建

- 当前新版规则区分：纯静态展示 `html`、有 JS 交互但无持久化 `frontend`、需要后端/数据库 `full_stack`。指标按钮也属于 JS 交互，不能所有图解都套成 `html`。
- 各版本对创意 HTML、交互与初始化链路有差异，按本轮安装的规则与服务端合同执行；不硬编码最低版本，不以旧附件的 `+deploy` 或 legacy `+html-publish` 作 fallback。
- 发布已有网页是迁移其表达，不是重新生成内容。先保留原数据、SVG、HTML/CSS/JS 和哈希；以平台脚手架承载必要变更，不自动引入数据库、模型 API 或实时同步。
- 用户明确选择本地代码迁入时用本地路径；明确要妙搭云端生成时用云端路径。没有表达开发方式且当前工具要求选择时问一次，不自动新建另一份应用。

已有应用从 `.spark/meta.json`、用户链接或 `+list` 解析 app_id；更新其他任务/他人应用前确认目标。`/page/<meta_token>` 是创意应用，不当作 Docx；`cli_...` 鉴权应用 ID 不传给 `apps`。复用已确认 app_id，避免搬目录或重复创建造成多个资产。

## 迁入科研页面

1. 在用户授权的应用仓库内工作，保留无关代码与手工编辑。首次初始化在新空目录，不向原成果目录强行 `+init`；随后读取仓库的 AGENTS、领域 skills 和可用 plugin guide。
2. 固定数据可随源码保留，真实来源与空值保持；敏感原文、私钥、认证文件、个人排障日志、工作缓存不进入提交范围。不将全部 skill 资产或原始工作目录打包发布。
3. 图片/字体/音视频等资源按当前平台规则上传，URL 与 app 隔离，不拿其它应用的 URL 或临时 CDN 作为长期资源。由代码生成的原生 SVG 和数据是否作为源码/下载内容按当前规则核对，不把截图替代可编辑图元。
4. 相对下载、路由 base、模块初始化、CSP、外链、新窗口、移动端和打印逐项处理。部署 bundle 不保证自动包含 `a[href]` 或 JS 运行时构造的下载路径；可用显式打包资产或用户点击的 Blob 导出并验证。源文档权限不保护页面内联的数据副本。
5. 迁入后先核对数据和语义不变，再按已有项目测试/build/typecheck；对共享样式、脚手架的必要修改同步验收所有消费者。构建成功不等于上线或受众可访问。

## 发布及审批

本地链路按当前 `lark-apps` 的 local-dev 与 release references 执行。本 skill 不默认 git commit/push；只有用户明确要求并授权该发布流程、且宿主允许时才提交**本次文件**和推送，不能把平台要求当成免审批授权。

典型当前流程：解析/创建 app → 初始化并迁入 → 核对本次 diff → commit/push 到平台工作分支 → 发起 release → 查询同一 release。以下只示意发布状态命令，不是可直接执行的脚本：

```bash
lark-cli apps +release-create --app-id "$APP_ID" --as user
lark-cli apps +release-get --app-id "$APP_ID" --release-id "$RELEASE_ID" --as user
```

`html` 按当前规则不传发布理由；`frontend/full_stack` 需传已确认的 `--apply-reason`，理由仅说明本次发布目的，不含内部凭据或大段源码。按实际类型补齐命令，不照抄省略理由的例子。

- `finished` 是本轮部署完成证据，绑定实际 commit/release；`+list is_published=true` 或云端生成完成不是本轮上线证据。
- 非终态且节点 `current_status=PENDING`：停止轮询，等待审批负责人；不从申请人推断审批人，不自行批准，不创建新 release 绕过。若终态与残留 PENDING 同时存在，终态优先。
- 普通 publishing 按工具当前间隔和总时限查询同一 ID；超时/未知状态报告，不无限轮询。审批处理后继续查原 release，不重新发布。
- 参数/认证失败按当前工具的错误和授权合同处理，不手工复制 token；写入或创建结果未知不原样重试。

## 分享权限与链接

发布链接默认可能仅创建者可见，**拿到 URL 不等于分享完成**。先核对当前可见范围，再根据用户确认的读者配置 `specific/tenant/public`；内部实验默认建议指定人/群/部门，但不在未授权时自动修改。

```bash
lark-cli apps +access-scope-get --app-id "$APP_ID" --as user
lark-cli apps +access-scope-set --app-id "$APP_ID" --scope specific \
  --targets "$CONFIRMED_TARGETS_JSON" --as user
```

姓名/群名通过相应工具解析为真实 typed ID，不硬编码样本 ID。租户开放会扩大范围；public 即使 require-login 也不等于仅本租户，只在明确授权并符合内容范围时采用。

运行时可见范围、开发协作者、应用内角色是三件事，不混用 `access-scope`、`member` 和 `role` 去绕过不支持能力。原生组件 readonly 也不是这些权限。

交付来自同一轮 `finished` 的 `online_url`，不用开发态链接、localhost 或临时附件 URL 冒充。按宿主允许的卡片或链接方式展示，不把另一产品的 `present_files`/“不得输出链接”规则强套到当前环境。发布回执证明部署；用户未登录的访问失败不反推发布失败。需要实际访问验收时仅用获准账号/客户端，缺读者视角明确记未验，不擅自修改权限来让验证通过。
