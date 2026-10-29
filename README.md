# dsh-blockbench-live

让 Blockbench 出现在 DeepSeek Harness 里：**你在对话界面就能实时看到我在 Blockbench 里做什么**，同时我用语义工具建模、贴图、自检渲染、导出。

- **实时预览**：对话右下角的状态胶囊 + 预览窗，每 1.5 秒刷新后台 Blockbench 的真实画面。
- **语义工具**：`bb_*` 工具按“加一根骨 / 给这个方块上色 / 渲染四视图看看”的粒度操作，不用手搓 JSON。
- **渲染自检**：改完自动截图对比，给出 `ok` / `regressed` / `no_change_expected`。
- **随手截图**：`bb_snapshot` 把当前画面作为图片直接发进对话。

![dock](docs/preview.png)

## 快速开始

```bash
git clone https://github.com/MKUXQQ/dsh-blockbench-live.git
cd dsh-blockbench-live

# 运行时体积大，不进仓库，首次自己组装（需要 Node 22+ 与 pnpm）
cd apps/bb-agent-runtime && npm run assemble && cd ../..

# 安装插件到 Harness（本地目录安装）
dsh plugin install ./packages/dsh-blockbench-live
```

重启 Harness 后，对话右下角出现 `Blockbench 实时` 胶囊，点开就是实时画面。

不想组装运行时？把 `packages/dsh-blockbench-live/cordis.patch.yml` 的 `useBundledRuntime` 设为 `false`，
并把 `executable` / `appPath` 指向你系统里已有的 Electron + Blockbench 应用目录即可。

## 配置

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `workspaceRoot` | `~/.dsh/blockbench-workspace` | 工程与日志根目录 |
| `project` | `default` | 当前工程名 |
| `autoStart` | `true` | Harness 启动时拉起后台 Blockbench |
| `useBundledRuntime` | `true` | 使用 `apps/bb-agent-app` 里的自带运行时 |
| `executable` / `appPath` / `pluginPath` | 空 | 留空即自动解析 |
| `provider` / `model` | `deepseek` / `deepseek-chat` | 运行时自用的模型配置 |
| `imageMaxDimension` | `512` | 回传图片最长边 |
| `exposeGuiTools` | `false` | 是否暴露底层 `gui.*` 工具 |

## 工具

`bb_session_start` `bb_session_status` `bb_scene` `bb_apply_model_patch` `bb_texture_create` `bb_texture_patch`
`bb_render_views` `bb_snapshot` `bb_checkpoint` `bb_save_project` `bb_export_ysm` `bb_batch` `bb_diagnostics`

命令：`/show` `/hide` `/bb-status` `/bb-start`。

## 仓库结构

```
packages/dsh-blockbench-live/   Harness 插件（Host 工具 + Web UI 预览 + WS-RPC 客户端）
apps/bb-agent-runtime/          后台 Blockbench 运行时源码（GPL-3.0），assemble 后产出 apps/bb-agent-app
```

插件侧关键文件：

```
index.js         Host 插件：bb_* 工具、命令、/bb-agent/status 与 /bb-agent/live 端点
client.js        Web UI 插件：状态胶囊 + 实时预览窗（conversation.composer.dock）
lib/ws-server.js 插件侧 JSON-RPC WS 服务（token、超时、批量）
skills/          给模型的 bb_* 工作流说明
```

## 安全

- WS-RPC 只监听 `127.0.0.1`，带一次性 token。
- `/bb-agent/*` 与 Harness Web UI 同源，没有额外跨域暴露面。
- 入参有上限：单条消息 8 MB、批量 64、补丁 4096 条操作。

## 许可

插件本体 MIT（见 `LICENSE`）。部分代码派生自 [yan-mc/blockbench-ysm-agent](https://github.com/yan-mc/blockbench-ysm-agent)。
`apps/bb-agent-runtime` 派生自 [Blockbench](https://github.com/JannisX11/blockbench)，遵循 GPL-3.0。详见 `NOTICE`。
