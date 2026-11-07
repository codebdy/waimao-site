# 从零开始：制作并发布你的外贸网站

[返回项目介绍](../README.md)

这份指南写给没有编程经验的使用者。先按步骤做默认纯静态站；需要后台、询盘或统计时再阅读对应章节。Skill 是 AI 的建站说明包，需要配合能读写本地文件的 AI 编程工具使用。账号注册、登录和验证码由你本人完成。

本指南的操作入口依据 2026-11-07 的官方文档核对，安装位置的依据及未实测项见第二步表格。平台可能调整按钮名称。遇到不同界面时，告诉 AI 当前所在页面和看到的文字，让它只解释下一步。

## 路线和目录

**准备资料 → 安装 skill → 生成网站 → 自己预览 → 上传 GitHub → 选择一个发布平台 → 自动部署 → 日后更新。**

| 你要做什么 | 看哪里 |
| --- | --- |
| 注册账号、了解几个工具 | [第一步](#accounts) |
| 安装并使用 skill | [第二步](#install)、[第三步](#generate) |
| 预览和检查页面 | [第四步](#preview) |
| 把网站代码推上 GitHub | [第五步](#github-upload) |
| 通过 GitHub 发布到 Vercel | [第六步 A](#vercel) |
| 注册 Cloudflare 并自动部署 | [第六步 B](#cloudflare) |
| 更新内容、绑定域名、切换平台 | [第七步](#updates) |
| RXCMS、WordPress、静态站询盘 | [进阶功能](#cms) |
| Google / Cookie 同意框是什么、怎么开关 | [隐私设置](#consent) |
| 出错时先查什么 | [常见问题](#troubleshooting) |

<a id="accounts"></a>
## 第一步：准备账号、工具和公司资料

### 1.1 先分清各自负责什么

| 名称 | 用途 | 什么时候需要 |
| --- | --- | --- |
| AI 编程工具（Claude Code、Codex、WorkBuddy 等） | 需要能读写本地文件，才能读取 skill、编写和修改网站代码。普通聊天网页（含 DeepSeek 网页/App）不行 | 开始建站时 |
| Node.js | 在电脑上安装网站依赖、生成和预览网站 | 开始建站时 |
| GitHub | 保存网站源码和修改历史，可理解为代码仓库 | 准备自动发布时 |
| GitHub Desktop | 用按钮把本地代码提交到 GitHub，减少 Git 命令操作 | 上传和更新时 |
| Vercel / Cloudflare | 托管网站，让客户通过网址访问 | 发布时，先选一个即可 |
| 域名 | 你自己的网址，例如公司的品牌网址 | 可等网站预览完成后再买 |

GitHub 和所选 AI 工具的账号按各自要求准备。代码上传 GitHub 也不等于网站已经上线。本指南不使用 GitHub Pages 托管，网站由 Vercel 或 Cloudflare 发布。

Skill 本身开源；AI 工具、域名、托管套餐和可选 CMS 可能收费。外贸企业网站属于商业用途，选择套餐时应匹配用途；不要默认所有服务永久免费。

### 1.2 注册 GitHub

1. 在浏览器打开 [GitHub 注册页](https://github.com/signup)。已有账号则直接登录。
2. 根据页面选择邮箱注册，填写邮箱、密码和用户名，完成验证。也可使用页面提供的 Google / Apple 登录选项；本指南后续只要求你能登录 GitHub。
3. 打开注册邮箱，完成 GitHub 发来的邮箱验证；收不到时查看垃圾邮件和邮箱拼写。
4. 登录后确认右上角能看到自己的头像或账号菜单。记住用户名，以后仓库会归在这个账号下。
5. 按 GitHub 提示设置双重验证并保存恢复码。无需为了开始建站购买 GitHub 企业版。

**完成标志**：你能登录 GitHub，邮箱已验证。此时不用先手动创建空仓库，第五步会通过 Desktop 上传网站。[官方注册说明](https://docs.github.com/en/account-and-profile/how-tos/account-management/creating-an-account-on-github)

### 1.3 安装你选用的工具

1. 按所选 AI 编程工具的官方说明安装、登录，并确认它能读写本地项目文件。例如可参考 [Claude Code 官方入门](https://code.claude.com/docs/en/quickstart)。
2. 从 [Node.js 官网](https://nodejs.org/en/download) 安装 Node.js 24 LTS。安装后重新打开终端，分别输入 `node --version` 和 `npm --version`；能看到版本号即可。当前模板要求 Node >=22.23.4。
3. 准备公司名称、主营产品、目标国家、网站语言、联系邮箱，以及可用的 Logo、照片和参考网站。缺资料可以先做结构，正式上线前必须补齐真实资料。

“终端”就是输入命令的窗口，例如 Windows PowerShell。后文会说明命令在哪个文件夹执行；不要把所有代码块都粘贴到同一个窗口。

<a id="install"></a>
## 第二步：把 skill 安装到建站项目

1. 新建一个文件夹，命名为 `my-export-site`，保存这次建站资料。
2. 现在由作者直接发给你 `export-site-0.1.0.zip` 安装包；公开后，请到项目 GitHub 页面右侧的 **Releases** 下载同名 ZIP。**不要点绿色 Code 按钮里的 Download ZIP**，那样解压后的文件夹会叫 `export-site-main`，还需要改名。下载安装包后解压：Windows 的“全部解压缩”通常会先生成一个 `export-site-0.1.0` 文件夹，**里面那个 `export-site` 文件夹**才是要用的 skill；打开它应能直接看到 `SKILL.md`。
3. 按下表创建对应目录，把解压后的完整 `export-site` 文件夹放进去。项目内路径都以 `my-export-site` 为起点，`~` 表示你的用户主目录。

| 工具 | 放置位置 | 怎么叫出来 | 核实程度 |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/export-site/`（项目内） | 在 AI 工具的对话框中输入 `/export-site` | [官方文档](https://code.claude.com/docs/en/skills) |
| Codex | `.agents/skills/export-site/`（项目内） | 输入 `$export-site`，或 `/skills` 选择 | [官方文档](https://learn.chatgpt.com/docs/build-skills) |
| WorkBuddy | `.workbuddy/skills/export-site/`（项目）或 `~/.workbuddy/skills/export-site/`（全局）。放好后重启或“重新加载技能” | 用自然语言请它使用 export-site | 仅第三方教程，未实测。企业版文档写的是 `.codebuddy/skills/`，以所用版本为准 |
| 其他支持 skill 的工具 | 优先 `.agents/skills/export-site/`（多工具共用） | 按工具说明 | 按工具文档 |
| 任何能读写本地文件的 AI（兜底，无需安装） | 放在项目里任意位置 | 对 AI 说“请先读取 export-site/SKILL.md，按里面的说明帮我建站”，路径按实际位置调整 | 通用 |

下面以 Claude Code 为例。其他工具把 `.claude` 换成表里的文件夹名，里面的 `skills/export-site/` 层级相同。检查 `export-site` 文件夹内能直接找到 `SKILL.md`。

```text
my-export-site/
├── .claude/
│   └── skills/
│       └── export-site/
│           ├── SKILL.md
│           ├── references/
│           ├── assets/
│           └── …说明、文档和许可证
└── website/                 ← 下一步由 AI 生成的网站，初始可以不存在
```

只复制 SKILL.md 不够，也不要放成 `export-site/export-site/SKILL.md` 或 `export-site-0.1.0/export-site/SKILL.md`（多一层文件夹，AI 工具可能找不到）。若拿到作者的开发目录，复制时排除 node_modules、dist、.git、.astro、.vercel、.wrangler、真实 .env；保留模板源码、锁文件、说明和许可证。正式分发包应已清理这些内容。

4. 用所选 AI 工具打开 `my-export-site` 项目。使用命令行工具时，在该文件夹打开终端。Windows 可在文件资源管理器地址栏输入 `powershell` 后回车，其他系统用终端进入该文件夹，再按工具说明启动。例如 Claude Code 在终端输入 `claude`。
5. 在 AI 工具的对话框中，按表里的方式调用 skill。Claude Code 输入 `/export-site`，Codex 输入 `$export-site` 或通过 `/skills` 选择，WorkBuddy 用自然语言请它使用 export-site。这些调用内容应填在 AI 对话框中。

**完成标志**：AI 能读取该 skill，并开始询问建站资料。找不到时按表检查所选工具的放置位置，确认 `export-site/SKILL.md` 的层级正确，必要时重新进入会话或重新加载技能。也可以使用表中兜底办法，直接请 AI 读取实际路径下的 `SKILL.md`。

DeepSeek 是模型，不是安装 skill 的工具。DeepSeek 网页/App 只能聊天，不能读写电脑文件，装不了 skill，也生成不了网站文件。要用 DeepSeek，需要在支持 skill、能读写本地文件的工具中选择 DeepSeek 模型。例如社区工具 DeepSeek Harness 读取 `.agents/skills/`，未实测。

<a id="generate"></a>
## 第三步：选择建站方式，让 AI 制作

告诉 AI 公司的产品、主要客户、目标语言和联系方法。你不需要先决定技术框架。AI 应用简单语言解释这三种方式：

| 方式 | 日后在哪里改内容 | 需要账号或密钥吗 |
| --- | --- | --- |
| **纯静态站，默认** | 继续让 AI 修改项目内的文字、图片 | 不需要 CMS 凭证 |
| RXCMS 站 | 在 RXCMS 后台管理，前端通过 API 获取 | 需要开通站点并配置环境变量 |
| WordPress 站 | 在 WordPress 后台管理，前端通过 REST API 获取 | 需要已有 WordPress；认证凭证放环境变量 |

不知道选什么、也没有后台需求时，AI 会使用默认纯静态站。已选的方式会沿用，缺 CMS 凭证不会擅自改成本地演示数据。

三种方式都使用 **Astro + Tailwind**，默认 `static`，即提前把内容生成网页。`server` 是另一项选择：需要每次访问时由服务器处理页面时才考虑。**内容来源、页面生成模式、发布平台是三个独立选择。** 询盘函数也可单独配给 static 网站。

新项目默认输出到 `my-export-site/website/`。生成后应该有网站源码和网站自己的 README，顶部记录实际选了哪种内容源、static/server、发布平台及更新方法。此时只是文件生成完成，还没上线。WordPress 随包最小客户端为实验功能，当前只接标准文章，不包含产品插件或多语言自动适配。

<a id="preview"></a>
## 第四步：在电脑上查看并修改网站

1. 打开 AI 生成的 `website` 文件夹，确认这里有 `package.json` 和网站 README。不要进入 skill 的 `assets/astro-starter` 目录修改客户网站。
2. 在 `website` 里打开终端。第一次且依赖尚未安装时，输入 `npm ci` 并等待完成。
3. 由你输入 `npm run dev`，打开终端打印的本地网址。保持终端运行；看完后按 `Ctrl+C` 停止。AI 默认不会自行启动服务。
4. 告诉 AI 哪个页面、文字或图片要改，改完再查看。发布前让 AI 执行 `npm test`、`npm run build` 等必要检查。
5. 检查真实公司资料、产品参数、联系方式、图片使用权及隐私说明。联系页的邮件链接是打开访客邮件软件；站内询盘表单则需要另外配置函数服务。

**完成标志**：你看过本地页面，资料符合实际，构建检查通过。静态预览不运行平台询盘函数，表单到 RXCMS 的真实提交要在客户的部署环境另行验收。

<a id="github-upload"></a>
## 第五步：把网站代码上传 GitHub

本指南采用 GitHub Desktop，适合 Windows / macOS。只上传生成的 **website 网站项目**，不要把整个 skill、客户原始资料目录或电脑桌面上传。

### 5.1 连接自己的 GitHub 账号

1. 从 [GitHub Desktop 官网](https://desktop.github.com/) 下载并安装，然后由你打开。
2. 选择登录 GitHub.com，在浏览器登录第一步的 GitHub 账号，按提示授权返回 Desktop。设置提交记录使用的姓名和邮箱。
3. 让 AI 检查 `website/.gitignore` 是否已排除 `.env`、node_modules、dist 等。真实密码只填 .env 或平台环境变量；私有仓库也不能当作存密码的地方。

### 5.2 把已有网站加入本地仓库

1. 在 Desktop 选择 **File → Add local repository**，选实际的 `website` 文件夹。[官方添加步骤](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop)
2. 如果提示该目录还不是 Git 仓库，可使用提示中的创建仓库入口；或让 AI **只在 website 中初始化本地 Git 仓库**，再添加。不要删除已有 .git 或远程连接来重新开始。
3. 若出现创建窗口，名称对应现有文件夹 `website`，Local path 选它的父目录 `my-export-site`。仔细确认最终路径仍是原来的 `my-export-site/website`，没有额外套一层 website。沿用现有 README、.gitignore 和许可证，不用新模板覆盖。[Desktop 创建说明](https://docs.github.com/en/desktop/overview/creating-your-first-repository-using-github-desktop)
4. 看 **Changes** 文件列表：应有 src、package.json、package-lock.json、site.config.mjs 等源码，不应有真实 .env、node_modules 或 dist。拿不准先让 AI 检查；不要直接全选上传未知文件。
5. 在 Summary 写本次修改说明，例如“建立网站初版”，点击 **Commit to main**。如果已经有初始提交且没有改动，可跳过提交。分支名可能不是 main，以顶部 Current branch 的实际名称为准，并记住它。

Commit 只是保存本地版本，下一步才上传。

### 5.3 发布仓库

1. 点击 **Publish repository**，仓库名可以改为容易识别的名称，例如 `company-website`。
2. 普通客户网站建议勾选 **Keep this code private**，代码不对所有人公开。网站上线后仍可供访客访问；代码私有与网页公开不冲突。
3. 确认归属自己的账号，点击发布。用 **Repository → View on GitHub** 打开仓库页面。[官方发布说明](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)

**完成标志**：GitHub 仓库网页能看到 package.json、src 等。采用本指南独立 website 仓库时，它们直接在仓库最外层；平台的 Root Directory 留默认即可。只有实际上传了外层项目、package.json 在 website 里面时，才填 `website`。

不要另建同名空仓库再强行推送。已有远程仓库时沿用 **Push origin**，请 AI 根据现有状态解释；不要用强制推送覆盖历史。

<a id="vercel"></a>
## 第六步 A：通过 GitHub 发布到 Vercel

本节适合默认 static 网站；选 Cloudflare 则跳到下一节，不需要同时部署两边。

1. 打开 [Vercel 注册页](https://vercel.com/signup)，选择 **Continue with GitHub**。在 GitHub 页面确认登录账号、授权并按提示完成 Vercel 账号设置。
2. 选择符合商业网站用途的套餐。Hobby 限个人非商业用途，不应把客户外贸站直接当免费 Hobby 项目发布。[套餐说明](https://vercel.com/docs/plans/hobby)
3. 进入控制台，选择 **Add New → Project** 或 [New Project](https://vercel.com/new)，连接 GitHub。如果要求安装 Vercel GitHub App，选择要发布的网站仓库授权；“用 GitHub 登录”并不等于所有仓库都已授权。
4. 找到第五步的网站仓库，点击 **Import**。确认下面设置；让 AI 按实际仓库结构复核 Root Directory。

| 设置项 | 默认 static 项目填写 |
| --- | --- |
| Framework Preset | Astro |
| Root Directory | package.json 所在目录；独立网站仓库留默认 |
| Install Command | npm ci |
| Build Command | npm run build |
| Output Directory | dist |
| Node.js Version | 项目要求支持的版本，本模板可选 24.x |

AI 应先在网站 site.config.mjs 中设置 output 为 static、deployTarget 为 vercel，并提交到 GitHub。默认不需要在平台再填 SITE_OUTPUT / DEPLOY_TARGET；如果以前填过，让 AI 检查并清除不再需要的覆盖，避免两处配置不一致。

5. 默认本地内容不需要 CMS 密钥；选 CMS 才添加对应环境变量。已有询盘函数时还需要运行时配置，见进阶章节。Preview 和 Production 按需分别设置，保存后重新部署才生效。
6. 点击 **Deploy**。构建完成后进入成功的部署详情，打开平台提供的网站链接。若失败，查看 Build Logs 中第一条实际错误，交给 AI 排查，不重复乱改配置。
7. 确认项目的 Production Branch 对应已上传的分支。本指南使用 main 时即为 main。以后 Push origin 到这个分支，会触发新的生产部署；其他分支按平台规则用于预览。

**完成标志**：控制台显示部署成功，实际网址可以访问，页面和联系方式正确。初次使用平台网址也要让 AI 将 site.config.mjs 的 `site` 改成实际正式地址再提交；演示内容尚未替换时保持不收录。[Vercel Git 部署说明](https://vercel.com/docs/getting-started-with-vercel)

<a id="cloudflare"></a>
## 第六步 B：注册 Cloudflare 并自动部署

### 6.1 注册 Cloudflare 账号

1. 打开 [Cloudflare 注册页](https://dash.cloudflare.com/sign-up)。按页面输入邮箱和密码，创建账号。
2. 去邮箱打开 Cloudflare 发来的验证邮件，完成验证后登录控制台。[官方注册说明](https://developers.cloudflare.com/fundamentals/account/create-account/)
3. 先找到 **Workers & Pages**。使用平台提供的网址可以先做网站，不需要在这一步转入域名或改公司的 DNS。

**这里是先注册 Cloudflare，再连接 GitHub 仓库。** 不需要先寻找“GitHub 注册 Cloudflare”按钮，也不需要把 GitHub 密码填到 Cloudflare 项目配置里。

### 6.2 连接仓库并创建 Pages 项目

1. 在 **Workers & Pages → Create application** 中选择 **Pages → Connect to Git**。本指南 static 使用 Pages；不要误选创建 server Worker 的流程。
2. 选择 GitHub，按提示授权 Cloudflare 访问本次网站仓库，再返回 Cloudflare 选择仓库。看不到私有仓库时检查 GitHub App 是否获准访问该仓库。
3. 开始设置构建，Production branch 选择已有代码的分支（本指南通常 main）。

| 设置项 | 默认 static 项目填写 |
| --- | --- |
| Framework preset | Astro；若没有此选项，按下面命令手动配置 |
| Root directory | package.json 所在目录；独立网站仓库留默认 |
| Build command | npm run build |
| Build output directory | dist |
| 环境变量 NODE_VERSION | 24.18.1，或满足项目要求且平台支持的 Node 24 版本 |

AI 应先在网站 site.config.mjs 中设置 output 为 static、deployTarget 为 cloudflare，并提交。默认不需要再填 SITE_OUTPUT / DEPLOY_TARGET；旧项目若已有这些变量，应检查是否覆盖了文件选择。静态 Pages 不需要复制 server 专用的 Wrangler 示例。

4. 添加必要的 CMS 构建环境变量，默认本地内容可跳过。提交 package-lock.json，保留平台的依赖安装步骤；不要关闭安装后直接运行构建。
5. 点击 **Save and Deploy**，查看构建记录。成功后打开平台分配的 `pages.dev` 网站地址；让 AI 更新网站 `site` 配置为实际正式网址，再提交构建。

**完成标志**：Pages 显示成功部署，网页能打开。Git 连接会在推送代码时自动构建；为了使用这条自动化路线，从一开始就选择 Connect to Git。[Cloudflare Git 集成](https://developers.cloudflare.com/pages/get-started/git-integration/)

这里上传 GitHub 的是源码，Cloudflare 会自行生成 dist。控制台拖拽 dist 是另一种手动发布路线，不能代替本文的 Git 自动化；**含 Pages Functions 的项目也不能只在控制台拖入 dist**，应使用 Git 集成或受支持的 Wrangler 部署。[Functions 部署说明](https://developers.cloudflare.com/pages/functions/get-started/)

<a id="updates"></a>
## 第七步：验证自动更新、绑定域名和切换平台

### 7.1 亲手走一次自动更新

1. 让 AI 修改网站里一处你能认出的文字，自己预览确认。
2. 打开 GitHub Desktop，确认当前仓库是网站仓库，分支是部署用的分支。
3. 在 Changes 查看修改，写 Summary，点击 **Commit to main**，再点击 **Push origin**。
4. 去 Vercel / Cloudflare 查看是否出现这次提交的构建记录。等待成功后，刷新实际网站，核对新文字。[Desktop 提交与推送](https://docs.github.com/en/desktop/overview/creating-your-first-repository-using-github-desktop)

**自动化是：推送到 GitHub → 平台构建 → 成功后更新网站。** 本地保存文件、仅 Commit 未 Push，都不会更新远程网站。一般不需要另写 GitHub Actions 工作流。

static + RXCMS / WordPress 有一个额外区别：**只在 CMS 后台改内容，不会产生 Git 提交。** 需要在平台手动触发重建，或另行配置“CMS 发布事件 → 保密的 Deploy Hook”。本 skill 不会凭空替客户配好钩子，也不把钩子地址放到浏览器或公开仓库。

### 7.2 使用自己的域名

等平台网址验证正常后，再在项目的 Domains / Custom domains 中添加自己的域名，按平台给出的 DNS 记录操作。只修改此次网站需要的记录，保留公司邮件等已有解析。域名验证成功后，让 AI 同步 site、canonical 和 sitemap，再重新部署并检查 HTTPS、图片、404、询盘。

演示模板默认 `indexable: false`，不让示例内容进入搜索结果。补齐真实资料、隐私说明、联系功能并确认正式地址后，再让 AI 开启收录；开启不保证立即被 Google 收录。

### 7.3 Vercel 与 Cloudflare 之间切换

告诉 AI 目标平台，它会保持原内容来源和 static/server，修改集中配置 `deployTarget`，核对平台的 DEPLOY_TARGET 环境变量。static 页面两边都构建为 dist；启用了询盘则运行 `npm run configure:inquiry` 切换函数入口并提交更改。

在新平台重新连接同一个 GitHub 仓库，迁移环境变量、表单允许域名、构建钩子等，先验证新平台网址，再迁移正式域名。保留原部署以便回退。生产域名没变时，site 不改成新平台的临时网址。

server 的函数产物不能直接从一个平台搬到另一个平台，需要相应适配器。Cloudflare 的 server 使用 Workers，不能照搬本指南 Pages 表格；让 AI 参照生成网站 README 和 [部署参考](../references/deployment.md) 给出本项目步骤。

<a id="cms"></a>
## 按需使用：后台内容、环境变量和询盘

### RXCMS 内容

需要时再向客户取得 RXCMS 服务地址和站点 key。生成网站的 `content.source` 设为 `rxcms`，`content.locale` 对应后台已配置语言。当前适配层会分页读取产品和文章，用正文、媒体、SEO 字段生成静态页面；认证或取数失败会中止构建，不换成演示产品。

本地从 `.env.example` 复制出 `.env`，填 `RXCMS_API_BASE`、`RXCMS_SITE_KEY`；线上到托管项目的环境变量设置填同名项。**环境变量就是由本机或托管平台保存、运行时交给程序的配置。** 密钥不发聊天，不进 site.config.mjs，不加 PUBLIC_ 前缀。static 内容只在构建时带 key 请求，访客拿不到 key。

已提供脱敏数据和本地测试；还未连接客户站点。媒体要用稳定投递地址；临时签名链接不能作为长期静态图片。完整契约及当前适配限制见 [RXCMS 说明](../references/rxcms.md)。

### WordPress 内容（实验）

WordPress 后台继续运行在自己的 PHP / 数据库主机，Astro 通过 REST API 读取。配置 `content.source: 'wordpress'` 后，当前最小客户端读取标准文章到 Articles；产品列表为空，不用示例产品冒充 WordPress 产品。

`WORDPRESS_API_BASE` 以 `/wp-json/` 结尾；需认证时配置 `WORDPRESS_USERNAME` 和 `WORDPRESS_APPLICATION_PASSWORD`，使用应用密码，不用后台登录密码。凭证同样只在构建/服务端环境中。产品插件、页面模板、插件交互、多语言及内链重写需要按客户站点继续适配，不能宣称填完密码就全部完成。[WordPress 接入范围](../references/wordpress.md)

### static + RXCMS 询盘函数

这个功能让网页仍是静态的，提交表单时由一个小型函数转发到 RXCMS。它可以搭配本地、RXCMS 或 WordPress 内容来源。默认关闭；没有询盘服务时用真实联系邮箱即可。

AI 需要修改网站的 `inquiry.provider` 为 `rxcms`，选择发布平台，配置公开的 Turnstile site key，并运行 `npm run configure:inquiry`。Vercel 生成 api/inquiry.js；Cloudflare Pages 生成 functions/api/inquiry.js 和只匹配询盘接口的路由配置。**先在本地生成并提交这些文件，再推送部署。** 改配置但漏生成时，构建会报错提醒。

客户开通服务后，在函数运行环境填写 RXCMS_API_BASE、RXCMS_FORM_KEY（forms:write key）、RXCMS_FORM_NAME、INQUIRY_ALLOWED_ORIGINS、TURNSTILE_SECRET_KEY。内容读取 key 和询盘 key 可以分别管理。Turnstile 是反垃圾验证；site key 公开放配置，secret key 只放函数环境。还需按流量配置平台限流。

| 提交结果 | 程序如何区分 | 可以对客户说什么 |
| --- | --- | --- |
| 保存成功 | saved=true，带询盘 id | RXCMS 已记录 |
| 判为垃圾 | saved=true 且 spam=true | 已存入待审/垃圾询盘，不触发通知 |
| 普通询盘通知 | notification.status=not_reported | 当前后端没有报告邮件发送结果，不能说已送达 |
| 明确未保存 | saved=false | 本次未保存，需要处理错误 |
| 超时或响应不确定 | saved=null | 需核对后台，避免自动重试造成重复询盘 |

客户网站验收时，分别查看询盘后台、垃圾分类、邮件发送日志和收件箱。**保存成功、邮件服务接受、收件箱实际收到是不同证据。** 当前 skill 开发不索取客户账号、不发送真实邮件；这一步交付网站时再做。详细配置及验收见 [询盘函数说明](../references/inquiry.md)。

<a id="consent"></a>
## Google / Cookie 同意框：作用、开启和关闭

这里所说的“谷歌意见征求框”，是访客打开网站时看到的 **Cookie / 隐私同意框**，不是征求 Google 评价或填写反馈。它让访客决定是否允许统计访问和广告相关存储，并把选择传递给 Google Consent Mode v2。

模板默认开启同意框，但 Google Analytics 和 Ads ID 为空，**不会默认发送 Google 统计或广告请求**。未配置服务时只有保存偏好的必要存储；正式网站没有统计需求时，也可以关闭它。

在生成的网站 `site.config.mjs` 中找到这些现有字段，只修改对应值，不要把片段粘贴到文件末尾：

```js
cookieConsent: {
  enabled: true,
  cookieName: 'cc_export_site',
  revision: 1,
},
google: {
  analyticsId: '',
  adsId: '',
},
```

- **开启**：将 enabled 设为 true。只有你确实使用这些服务，才填写自己的 GA4 `G-…` 和 Google Ads `AW-…` 标识。它们是公开标签 ID，不是 CMS 密钥。没有 Ads 就保持 adsId 为空。
- **关闭**：将 enabled 设为 false。模板同时停用同意框和这套 Google 标签集成，避免关了弹窗却继续跟踪。
- **让访客改选择**：开启时，网页页脚有 Cookie settings，点击可重新设置。统计和广告分开选择；撤回已同意的项目会刷新页面，让新选择生效。
- **修改后上线**：自己预览，再 Commit、Push，等待平台部署成功。已经保存选择的浏览器可能不再自动弹窗，可用页脚重新打开；测试首次访问可用无痕窗口。
- **用途有实质变化**：让 AI 更新说明，并将 revision 增加，使旧选择重新征求。不要为让弹窗反复出现而每次随意改版本。

你不懂配置时可以直接让 AI 开启、关闭或填写已取得的公开 ID。真实公司隐私页需要按实际数据处理补充；模板的 `/privacy-policy/` 仍是待完善内容。

当前是基础同意模式：访客接受对应类别后才加载相关 Google 标签。关闭功能不会删除 Google 已收到的数据，也不管理另外手工加入的 GTM、Meta、聊天插件或 Turnstile。Ads 标签加载不等于已配置广告转化事件。这不是 Google 认证 CMP，也不自动保证任何地区的法律合规。[Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)、[实现与验收](../references/consent.md)

<a id="troubleshooting"></a>
## 常见问题和交付核对

| 现象 | 先检查什么 |
| --- | --- |
| 找不到或无法调用 export-site | 按[安装表](#install)检查所选工具的放置位置及 `export-site/SKILL.md` 层级，并在 AI 工具的对话框中使用对应调用方式。必要时重新加载技能，或直接请 AI 读取该文件 |
| PowerShell 提示“禁止运行脚本”或 npm.ps1 无法加载 | Windows 默认安全设置拦截了 npm 的 PowerShell 脚本。把命令里的 `npm` 换成 `npm.cmd`（如 `npm.cmd ci`、`npm.cmd run dev`），或在地址栏输入 `cmd` 打开命令提示符再执行；不必为此修改系统安全策略 |
| npm 提示找不到 package.json | 是否进入了生成的 website 目录 |
| 平台看不到 GitHub 仓库 | 登录账号和 GitHub App 的仓库授权；私有仓库也要授权 |
| 构建提示配置或依赖错误 | 第一条实际错误、Root Directory、Node 版本、锁文件和环境变量 |
| inquiry configuration changed | 让 AI 核对目标平台，在网站目录运行 configure:inquiry 并提交生成文件 |
| 代码改了网站没更新 | 是否 Commit 后 Push；部署分支是否正确；新构建是否成功 |
| 后台改了产品网页没变化 | static 需要重建；CMS 更新不会自动产生 Git 提交 |
| 询盘没反应或邮件没收到 | 函数是否随源码部署、运行时变量、Turnstile 域名、后台保存和通知分别检查 |
| 没再看到 Cookie 弹窗 | 已保存选择时从页脚重开；检查 enabled 和部署版本 |
| 搜索引擎没有收录 | 示例站默认 noindex，正式资料及域名确认后再开启；上线不等于立即收录 |

交付完成时，你应该拿到实际可访问的网址、对应源码仓库、项目自己的 README，并知道如何预览、更新和重新发布。有询盘时还要有真实验收记录；未验证项应明确列出。遇到问题把错误文字交给 AI，先遮住密码、密钥和客户个人信息。

作者拥有 18 年外贸经验、25 年软件开发经验。欢迎通过 [作者微信二维码](../README.md#联系作者) 交流独立站、SEO、AI 工具与海外营销；想加入外贸营销群，也可以联系作者，和同行一起分享经验、讨论问题。
