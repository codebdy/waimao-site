# Export Site · 外贸建站 Skill

让 AI 根据企业资料、产品和图片，制作面向海外采购商的网站。适合不懂代码、希望由 AI 引导建站的使用者。

**第一次使用，请从[零基础使用指南](docs/usage-guide.md)开始。** 指南一步步说明：注册 GitHub、安装并使用 skill、预览网站、上传代码、注册 Vercel / Cloudflare、连接 GitHub 自动部署，以及后续更新和 Cookie 同意框设置。

Skill 是给 AI 使用的建站说明包，需要配合能读写本地文件的 AI 编程工具，如 Claude Code、Codex、WorkBuddy 等。本目录是 skill 源码，网站应生成到独立项目。版本 0.1.0，当前未上传公开 GitHub 仓库，也未部署客户网站。

现在由作者直接分发安装包 `export-site-0.1.0.zip`；公开后，请到项目 GitHub 页面右侧的 **Releases** 下载同名 ZIP，不要用绿色 **Code → Download ZIP**，那样解压后的文件夹会叫 `export-site-main`，还需要改名。解压后把完整 export-site 文件夹按使用指南安装。发布包排除依赖、构建目录及本地密钥文件。

维护者发布新版本时，先把 `SKILL.md` 的 `metadata.version` 改成新版本号并提交，再在 GitHub 网页 **Releases → Draft a new release** 中用 `v版本号` 作为 tag，点击 **Publish release**；Actions 会自动生成并附上 ZIP 和 SHA-256 校验文件。本地 `python -I scripts/package_skill.py` 仅用于本地试打包。

## 默认怎么建站

| 建站方式 | 内容来源 | 当前随包能力 |
| --- | --- | --- |
| **纯静态站，默认** | 项目内本地文件 | 可构建的 Astro + Tailwind 模板，无 CMS 凭证需求 |
| RXCMS 站 | rxcms-server API | 产品/文章内容适配、分页和脱敏测试；客户接口仍需实际联调 |
| WordPress 站（实验） | WordPress REST API | 标准文章最小客户端与脱敏测试；产品插件、多语言等需要继续适配 |

没有指定且没有后台需求时，AI 明确告知采用默认纯静态站；已经选择则沿用。三种内容来源都默认 `static`；需要请求时生成页面才另选 `server`。前端均为 **Astro + Tailwind**，不是 WordPress PHP 主题。

内容来源、static/server、发布平台，以及是否启用询盘函数分别配置。**static + RXCMS 询盘函数**已有示例，可以与本地或 CMS 内容搭配。密钥只放构建/函数环境变量，不进入浏览器。模板测试不代表客户站点已接通或邮件已送达。

## 如何开始

1. 按[使用指南的安装表](docs/usage-guide.md#install)，把解压后的完整 `export-site` 文件夹放进所选工具的对应目录。
2. 用所选 AI 工具打开该项目，按安装表的方式调用 skill，提供公司、产品、目标市场和联系资料。也可按表中的兜底办法，直接请 AI 读取 `SKILL.md`。
3. AI 默认把网站生成到独立的 `website/`，先制作和检查，再引导你自行预览。
4. 按[GitHub 上传步骤](docs/usage-guide.md#github-upload)上传生成的网站，再选择一个托管平台。

新手不必阅读所有技术参考。AI 的执行入口是 [SKILL.md](SKILL.md)；生成的网站也应有自己的 README，记录实际选择和操作步骤。

## 发布网站：Vercel 或 Cloudflare

本项目所说的发布，是把**生成的网站**放到托管平台；公开发布 skill 仓库是另一件事。

| 选择 | 网站发布方式 | 详细操作 |
| --- | --- | --- |
| Vercel + static | GitHub 导入网站仓库，Astro，构建 `npm run build`，输出 `dist` | [注册、导入、自动部署](docs/usage-guide.md#vercel) |
| Cloudflare + static | 注册 Cloudflare 后，在 Pages 连接 GitHub；构建 `npm run build`，输出 `dist` | [注册、连接、自动部署](docs/usage-guide.md#cloudflare) |
| Vercel + server | Vercel 适配器及框架输出配置 | [项目模板说明](assets/astro-starter/README.md) |
| Cloudflare + server | Cloudflare 适配器，部署到 Workers | [部署参考](references/deployment.md) |

网站的 `site.config.mjs` 保存 output、deployTarget；小型配置模块按平台选择适配器。构建环境变量 SITE_OUTPUT / DEPLOY_TARGET 可以覆盖文件值，切换时同步核对。static 询盘通过 `npm run configure:inquiry` 生成目标平台函数入口，先提交源码，再部署。

新手默认只在 site.config.mjs 中选择模式和平台，不再要求在控制台重复填这两个覆盖变量；CMS 密钥等仍使用平台环境变量。静态模板根目录不放 Wrangler 配置，只有选择 Cloudflare server 时才从示例创建。

**自动更新流程：修改 → Commit → Push 到 GitHub → 平台自动构建部署。** CMS 后台更新需手动重建或另配发布钩子。可以切换平台，但环境变量、函数配置、钩子和域名也要迁移；不能只改平台名称就宣称完成。[更新与切换指南](docs/usage-guide.md#updates)

## Cookie / Google 同意框

模板提供 Cookie 隐私同意框及 Google Consent Mode v2 基础集成，参考 kingnod-v2 的需求重新实现。访客可分别决定统计和广告，并从页脚重新设置。

默认开启弹窗、Google ID 留空，不默认发送 Google 统计或广告请求。`cookieConsent.enabled: false` 同时关闭弹窗和随包 Google 集成。用途、开关和上线步骤见[使用指南](docs/usage-guide.md#consent)。它不是 Google 评价框，也不是自动满足法律要求的认证 CMP。

## 基础 SEO 与专业支持

开源 skill 主要提供入门建站和基础优化：标题描述、canonical、robots、sitemap、基础结构化数据及多语言 SEO 注意事项。它不承诺搜索排名。

需要更深入、更专业的 SEO skills，请扫码添加作者微信，咨询专业 SEO skills 及支持服务。

## RXCMS 平台与联系作者

RXCMS 接入后端为 **rxcms-server**。平台可提供图片与视频托管、询盘表单、邮件通知及智能体接入，需要开通服务并完成客户站点配置。网站模板不等于这些服务已经开通。

### 联系作者

需要专业 SEO skills 或 RXCMS 平台，请扫描作者微信二维码说明需求。也可继续使用本地内容或 WordPress，不强制购买 RXCMS。

![扫码添加作者微信](docs/author-wechat.png)

## 给实施者与审核者

- [RXCMS 内容契约及适配范围](references/rxcms.md)
- [static 询盘函数、状态语义和客户验收](references/inquiry.md)
- [WordPress 实验客户端](references/wordpress.md)
- [Consent 实现与验证](references/consent.md)
- [模板 README](assets/astro-starter/README.md)、[验证记录](VALIDATION.md)
- [借鉴来源与许可证](THIRD_PARTY_NOTICES.md)

核心采用 MIT；借鉴了 Claude SEO 等开源项目的方法，保留来源与许可证。WordPress 官方 GPL skills 仅作为参考，没有打包复制。开发默认不启动应用或服务，不执行真实部署、CMS 写入和邮件发送。

客户真实联调留到具体网站阶段：确认后台记录、垃圾分类、通知日志与收件箱；当前 RXCMS 接口不报告邮件发送结果，代理明确返回未知，不能推断送达。Claude Code 的整包审核提示词在对话中提供，不另存提示词文件。
