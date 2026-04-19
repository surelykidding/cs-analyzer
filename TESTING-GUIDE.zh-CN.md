# CS Analyzer Windows 测试指南

这份指南面向使用 `CS Analyzer 1.0.0-beta.1` Windows 打包版的测试用户。

## 本版本重点

- Team Tactics 战术分析
- FACEIT Scouting 与战术复盘
- 5EPlay 最近比赛下载与 scouting
- Perfect World 账号导入、登录、scouting 与 demo 处理
- `Pistol`、`Eco`、`Semi`、`ForceBuy`、`Full` 经济局筛选
- 更快的 windowed tactics positions

## 你会收到的文件

- `CS Analyzer Setup 1.0.0-beta.1.exe`
  适合标准安装，带开始菜单入口。
- `CS Analyzer Portable 1.0.0-beta.1.exe`
  适合放在单独文件夹里直接运行，不走安装流程。

这两个都是 Windows 测试包。Beta 版本默认关闭应用内自动更新，后续版本请从 GitHub Pre-release 手动下载。

## 前置要求

启动前请先安装：

- Windows 10 或更高版本
- PostgreSQL
- `psql` 可以在系统 `PATH` 中直接调用

快速检查：

```powershell
psql --version
```

如果这个命令失败，请先安装 PostgreSQL 客户端工具并重开终端。

## 推荐的 PostgreSQL 测试参数

应用默认值：

- Host: `127.0.0.1`
- Port: `5432`
- Username: `postgres`
- Password: `password`
- Database: `csdm`

你也可以使用自己的参数，但为了减少排查成本，建议先按默认值测试。

## 首次启动

1. 启动 `CS Analyzer`。
2. 如果出现数据库连接界面，填入你的 PostgreSQL 参数。
3. 在全新环境下，应用会自动建库并执行 migration。
4. 进入主界面后先打开 `Settings`。

## 下载目录

在 `Settings > Downloads` 里设置一个专用下载目录。

这个 beta 默认关闭所有启动时/后台 demo 自动下载开关。

- 只有你想测试轮询或无人值守下载时，才需要手动打开。
- 如果默认是关闭状态，这就是这次测试包的预期行为。

建议：

- 单独新建一个文件夹给这次 beta 使用。
- 应用处理文件时不要手动改名。
- 预留足够磁盘空间给 demo 和解压后的归档文件。

这个目录会影响 scouting 流程和 demo 自动处理。

## FACEIT 设置

### API key

这个 beta 版本不需要你手动粘贴 FACEIT API key。

- 安装包里会内置维护者的 FACEIT API key。
- `Settings > Integrations > FACEIT API key override` 只是可选覆盖项。
- 只有你想换成自己的额度时，才需要手动填写。

### FACEIT 账号

打开 `Settings > Downloads > FACEIT`，添加你的 FACEIT 账号。

建议：

- 使用你 FACEIT 主页里的准确昵称。
- 如果添加了多个账号，确认当前账号切换正确。

## FACEIT Scouting 流程

1. 打开 `Downloads > FACEIT Scouting`。
2. 粘贴 FACEIT 房间链接或 match ID。
3. 开始 scouting。
4. 等应用自动发现同地图的对手样本。
5. 按需要打开应用提供的 match 链接。
6. 下载 demo，并把文件保留在你配置好的下载目录里。
7. 等待应用自动处理并刷新 scouting 会话。

预期表现：

- 能自动检测到 demo 文件。
- 能自动解压支持的归档格式。
- 能自动分析并导入数据库。
- 能生成 tactics positions。
- 不需要手动重新导入也能看到 scouting tactics。

支持的文件格式：

- `.dem`
- `.dem.gz`
- `.dem.bz2`
- `.dem.zip`
- `.dem.zst`

## 5EPlay 设置

打开 `Settings > Downloads > 5EPlay`。

你需要做的事：

- 点击 `Add 5EPlay account`。
- 填写数字形式的 `5EPlay ID`，不是昵称。
- 这个 ID 可以从你的 5EPlay 个人主页 URL 最后那一段拿到。
- 例如 `https://arena.5eplay.com/data/player/111111` 里的 ID 就是 `111111`。
- 如果你加了多个账号，确认当前账号切换正确。

建议检查：

- 这次 beta 的 5EPlay 自动下载相关设置默认是关闭的。
- 如果你想测试启动时/后台自动下载，请手动打开对应开关。
- 重启应用后确认当前账号保持正确。

## 5EPlay 最近比赛流程

1. 打开 `Downloads > 5EPlay`。
2. 为当前账号刷新最近比赛。
3. 在左侧列表中选择一场比赛。
4. 确认比分板和比赛详情能正常加载。
5. 如果 demo 链接可用，测试 `Download`、`Download all`、复制链接和打开比赛页。
6. 确认下载的 demo 出现在配置好的下载目录里。
7. 处理完成后，确认 `See demo`、`Watch demo` 等按钮可用。

预期表现：

- 所选账号的最近比赛能正常加载。
- 切换当前账号后列表会正确刷新。
- 单个下载和批量下载都能正常入队。
- 导入后的 5EPlay demo 可以进入正常的分析和回放流程。

## 5EPlay Scouting 流程

1. 打开 `Downloads > 5EPlay Scouting`。
2. 粘贴 5EPlay 房间 URL 或 match ID。
3. 开始 scouting session。
4. 等应用自动发现同地图对手样本，并自动下载、导入、分析相关 demo。
5. 使用 side、economy、radar level 和时间窗口筛选查看 heatmap。
6. 如果提示有导入的 demo 缺少 positions，运行 `Generate tactics positions for imported demos`。
7. 删除 scouting session，并确认临时 scouting 数据被清理。

预期表现：

- 需要且会显示当前 5EPlay 账号。
- targets 会从 waiting/downloading/processing 自动推进到 ready。
- ready 的 targets 会在 demo 处理完成后自动进入 tactics 视图。
- scouting session 可以正常刷新和删除。

## Team Tactics 流程

1. 打开一场已经处理完成的比赛。
2. 进入 tactics 页面。
3. 在 `Pistol`、`Eco`、`Semi`、`ForceBuy`、`Full` 之间切换。
4. 确认 team tactics 和 scouting tactics 都能正常显示。

重点观察：

- 热力图是否会按阵营和经济局筛选正确刷新。
- Windowed tactics positions 是否明显更快。
- 缺失 positions 时是否能补算，而不是一直空白。

## Perfect World 设置

从下载页和账号设置页进入 Perfect World 相关流程。

可以测试两种方式：

- 从本机 Perfect World 客户端导入账号。
- 使用手机号 + 短信验证码登录。

完成账号设置后，请确认：

- 账号校验成功。
- 最近比赛可以正常加载。
- 当前账号切换正确。

## Perfect World Scouting 流程

1. 打开 Perfect World scouting 流程。
2. 选择或加载一场最近比赛。
3. 开始 scouting session。
4. 等应用拉取目标、处理 demo、生成 tactics。
5. 检查最终战术页面是否正常显示。
6. 删除 scouting session，并确认临时导入数据被清理。

预期表现：

- 导入的账号在重启后仍然可用。
- 最近比赛列表能正常刷新。
- 不需要手动改数据库就能开始 scouting。
- demo 处理完成后会自动驱动 tactics 页面。

## 常见问题

### 应用提示 PostgreSQL 或 `psql` 缺失

- 确认 PostgreSQL 已安装。
- 在新的终端窗口里执行 `psql --version`。
- 如果刚安装完 PostgreSQL，先重开终端再试。

### 数据库一直连接失败

- 确认 PostgreSQL 服务已经启动。
- 确认用户名、密码、主机、端口、数据库名填写正确。
- 如果你没有使用默认值，请按实际参数填写。

### FACEIT 账号能加上，但 scouting 没有结果

- 确认当前 FACEIT 账号选择正确。
- 确认源比赛确实有足够的同地图样本。
- 换一个房间链接或 match ID 再试。

### FACEIT demo 下载后没有自动导入

- 确认下载目录设置正确。
- 确认浏览器或下载流程把文件保存到了这个目录。
- 下载过程中保持应用打开，直到处理完成。

### 5EPlay 账号添加失败

- 确认你填写的是数字形式的 `5EPlay ID`，不是昵称。
- 打开 5EPlay 个人主页，复制 URL 的最后一段。
- 如果账号已经存在，请直接切换当前账号，不要重复添加。

### 5EPlay 最近比赛列表为空

- 确认当前 5EPlay 账号选择正确。
- 切换账号后重新点一次刷新。
- 有些比赛可能没有 demo 下载链接，可以换另一场最近比赛测试。

### 5EPlay scouting 长时间停在 waiting 或 processing

- 在 scouting 下载和分析期间保持应用打开。
- 确认当前下载目录可写，而且仍然是选中的目录。
- 如果当前房间没有足够可用的同地图样本，换一个 5EPlay 房间 URL 或 match ID 再试。

### Perfect World 导入或短信登录失败

- 重新确认当前账号选择。
- 如果走客户端导入，确认本机已安装 Perfect World 客户端。
- 如果短信验证码过期，重新获取后再试。

### Tactics 页面一直是空的

- 等 demo 分析和 position 生成完成。
- 处理完成后重新打开 scouting 页面或比赛页面。
- 切换不同经济局筛选，确认是不是当前筛选下本来就没有数据。

## 反馈模板

提交反馈时请尽量带上：

- Windows 版本
- 你使用的是 `Setup` 还是 `Portable`
- PostgreSQL 版本
- 启动前 `psql --version` 是否正常
- 你测试的是 `FACEIT`、`5EPlay`、`5EPlay Scouting`、`Team Tactics` 还是 `Perfect World`
- 可复现问题对应的 match URL / match ID
- 你的预期结果
- 实际发生了什么
- 如果有的话，附上截图或日志

## GitHub 链接

- Releases: <https://github.com/surelykidding/cs-analyzer/releases>
- Issues / 反馈: <https://github.com/surelykidding/cs-analyzer/issues>
