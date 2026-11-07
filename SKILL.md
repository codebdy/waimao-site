---
name: export-site
description: 创建或改造面向海外采购商的 B2B 外贸网站，使用 Astro + Tailwind，内容来源可选本地文件、RXCMS API 或 WordPress REST API（实验，仅标准文章），覆盖页面规划、B2B 视觉设计、询盘内容和完整的站内技术 SEO（元信息、canonical、sitemap、结构化数据、多语言 hreflang）。新建站默认 static，可按需求选择 server，并支持 Vercel / Cloudflare 部署配置与迁移。用于外贸建站和相关实现，不代替独立的营销运营或通用 CMS 管理。
license: MIT; adapted third-party portions retain their licenses (see THIRD_PARTY_NOTICES.md)
metadata:
  version: "0.1.0"
---

# Export Site · 外贸建站

交付能被采购商理解、能维护内容、具备真实询盘路径的网站。根据现有项目和用户资料实施，不将示例企业当成真实客户。

## 面向零基础用户

- 账号注册、安装、GitHub 上传与自动部署需要详细引导时，按主题使用 `docs/` 下的新手文档：[安装](docs/01-install.md)、[开始建站](docs/02-start.md)、[风格](docs/03-style.md)、[预览](docs/04-preview.md)、[GitHub](docs/05-github.md)、[Vercel](docs/07-vercel.md)、[Cloudflare](docs/06-cloudflare.md)、[更新](docs/08-update.md)、[域名](docs/09-domain.md)、[SEO](docs/seo.md)、[Cookie](docs/cookie.md)、[询盘](docs/inquiry.md)、[常见问题](docs/faq.md)、[功能一览](docs/features.md)。用户提问时引导到对应那一篇，不整篇复述。README 只做入口；生成网站仍须提供符合本项目实际配置的说明，不能只引用 skill 文档。
- 默认用户不懂终端、框架、API、环境变量、构建或部署。先用业务语言说明当前阶段和下一步，技术细节留给实施。需要用户操作时再解释术语，例如构建就是把内容生成网站文件，部署就是把网站放到可访问的平台。
- 每轮只询问当前必要的少量信息，通常 1–3 个问题；已有资料先读取。不给用户整张技术配置问卷，不让其决定无关的底层实现。
- 用户操作步骤必须说明：在哪个应用/页面或文件夹操作、输入/选择什么、成功后会看到什么。区分 AI 对话与终端命令；命令依据实际系统给出，路径使用本次真实目录，不让小白原样执行带占位符的命令。
- 新建且用户没有指定输出位置时，网站放在当前项目的 `website/` 子目录；若该目录非空先识别已有内容再决定，不覆盖。安装 skill 的目录与生成网站目录分开，不在 skill 的 assets 模板里制作客户站。
- 生成项目 README 除当前配置外，还须给出小白可跟随的预览、修改、发布和更新步骤；不能只留下命令清单。已有 Node 或依赖就不要求重复安装。
- 未经用户要求不启动预览/服务；告知用户如何在网站目录启动、访问实际输出的网址及停止。需要用户扫码登录、填密钥或点击平台设置时说明完成标志，不代用户捏造完成结果。
- 明确区分“已生成文件”“本地预览可见”“网站已发布”“询盘已送达”。CMS 连接、自动更新、平台部署和表单尚未实现/验证时如实列出，不用“支持”掩盖剩余工作。

## 建站方式选择

首次新建站时，先用简短说明向用户展示三种选择，不要求用户理解框架术语：

| 对用户的名称 | 内容从哪里来 | 如何更新 |
| --- | --- | --- |
| 纯静态站（默认） | 项目内的本地内容文件，不接 CMS | 修改文件后重新构建发布 |
| RXCMS 站 | rxcms-server API，在 RXCMS 后台管理内容 | 默认取数后构建；后台改动后手动重建或通过已配置钩子触发 |
| WordPress 站 | WordPress REST API，在 WordPress 后台管理内容 | 默认取数后构建；后台改动后手动重建或通过已配置钩子触发 |

- 用户已明确选过或现有项目已有内容来源时，直接沿用并简述，不重复提问；仅当用户要求迁移时更换。
- 新建站未指定内容来源且未要求后台管理时，明确告知采用默认「纯静态站 + 本地内容 + static」，即可开始，不强制等待选择，也不索要 CMS 凭证。
- 用户要求后台管理但未选 CMS 时，询问 RXCMS 或 WordPress；等待期间可做共用页面和设计，不擅自选择平台或把它降级成本地内容。
- 已选 CMS 但缺地址/凭证时，说明环境变量配置方式并继续不依赖接口的工作；不能静默回退成本地示例并声称 CMS 已接通。
- 三种选择区分的是内容来源，全部默认 static。server 是按需单独选择的渲染模式，Vercel / Cloudflare 是独立的发布平台。建站提示和交付说明须分别说清这三项。
- 在生成项目 README 顶部记录实际选择：建站方式、内容来源、渲染模式、发布平台（未决定则标明待选）、询盘处理方式、Cookie 同意配置和内容更新方法。发生切换时同步修改记录与实际实现。

## 默认值与边界

- 新建 Astro 站默认 `output: 'static'`。内容来源（本地 / RXCMS API / WordPress REST API）、渲染模式（static / server）、部署平台（Vercel / Cloudflare）分别决定。CMS 不自动意味着 server。
- 用户明确选择 server，或确认需要请求时渲染后，才切换模式及适配器。维护已有项目时保留现有模式，除非任务要求迁移。
- 不在建站开始时追问部署平台；上下文已有选择或用户已有 Vercel 账号就沿用。尚未决定时继续生成平台中立的 static 站；到发布阶段默认推荐 Cloudflare（免费版允许商业网站使用），并说明 Vercel 免费版（Hobby）仅限个人非商业用途、公司网站需付费版。切换平台通常只改集中配置；检查平台绑定、运行时 API、环境变量和重定向是否也需要迁移。
- WordPress 作为 API 内容后端，网站前端仍用 Astro；凭证与 RXCMS 一样只放构建/服务端环境变量。默认不生成 WordPress 主题。WordPress 后台仍由已有 PHP / 数据库宿主运行，前端可以部署到 Vercel / Cloudflare。
- 先读取目标项目指令、依赖、页面壳及真实接口。已有页面改动优先复用组件，保留范围外业务行为。SEO 优化不自动授权修改询盘字段和提交流程。
- 不主动启动应用、dev/preview 服务器或后台进程。静态检查与针对性测试可以执行；需要运行页面时由用户启动或明确授权。没有实际验证就不宣称表单、线上响应或视觉效果已通过。
- 创建代码不等于授权上传、推送、发布、写入 CMS 或更改域名。用户已明确授权的部署无需重复询问；否则先准备可审阅的配置，再询问发布授权。

## 工作流程

1. 识别新建还是维护，按上面的选择规则说明建站方式和默认值。读取已有资料，确定企业类型、目标采购商、产品、市场语言、内容来源和主要转化目标。只询问影响当前决策的缺项；未知认证、交期和产能不能编造。
2. 规划页面和内容，读取 [planning](references/planning.md)。新建或视觉改造时读取 [design](references/design.md)，围绕产品展示、采购信息和询盘提出适合客户的视觉方向，再落实到页面。使用者无需另外安装设计 skill；简单修复不强制重新做全站策划或设计。
3. 读取 [astro](references/astro.md) 实现共用前端；内容来源选 RXCMS 时再读 [rxcms](references/rxcms.md)，选 WordPress API 时再读 [wordpress](references/wordpress.md)。只加载相关内容源分支。
4. 生成或修改页面、内容和真实询盘路径。新建 Astro 可使用 [starter](assets/astro-starter/README.md)，默认单语言，本地 static 站已支持多语言；RXCMS / WordPress 内容源的多语言需要单独接入。模板不是完成的客户网站；不要覆盖已有项目。
   - 启用 RXCMS 询盘时读取 [inquiry](references/inquiry.md)。static 可以独立配置询盘函数，不因此切换 server；配置后先生成对应平台入口并提交，再部署。保存、垃圾判定和通知结果分别表达，旧后端通知结果未提供就标未知。客户建站到联调阶段再取得测试站点与收件人，不能要求 skill 使用者在尚未建站时提供这些信息。
   - 涉及 Cookie 弹窗、Google 统计或广告时读取 [consent](references/consent.md)。新模板有默认开启但无 Google ID 的同意框；解释用途和开关，沿用用户已有选择。关闭同时停用随包标签，不注入真实站点的跟踪 ID；交付文档写清配置、数据用途和未验证项。
5. 涉及路由、索引、内容或 SEO 输出时读取 [seo](references/seo.md)。将发现转为代码修复或有依据的待办，不只输出评分。
6. 根据目标平台读取 [deployment](references/deployment.md)。在生成项目 README 中写清当前模式、平台、部署操作、环境变量、CMS 更新和平台切换步骤。不能只链接回本 skill。
   - 新手优先使用 GitHub 仓库连接平台的自动构建路线，说明保存、Commit、Push、部署的区别；不为了这条现成功能额外搭建 GitHub Actions。Cloudflare 注册与连接 GitHub 分开解释。客户网站仓库与开源 skill 仓库分开。
7. 按 [verification](references/verification.md) 检查本次改动，报告已验证、未验证和需要用户提供的事项。

## 交付

交付目标项目源码、项目自己的使用及部署 README、必要配置和验证结果。提示词直接在对话中提供；不要为了交付创建提示词文件。客户资料与密钥不放进 skill 源码仓库。

上游方法与许可见 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)。核心不要求 Claude 专用工具、额外 SEO skills、付费 API 或自动多代理编排；有可用工具时再增强。
