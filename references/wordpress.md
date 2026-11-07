# WordPress REST API 内容源

**当前为实验支持。** 随包 `src/lib/content/wordpress.mjs` 已有 posts/pages 最小客户端：环境变量认证、分页、公开内容筛选、HTML 清理，以及 `tests/fixtures/wordpress.json` / `tests/content.test.mjs`。选择 content.source=wordpress 后，starter 只把标准 posts 接入 Articles；products 为空，不回退演示内容。pages 客户端尚未接入前端路由；产品插件、多语言、媒体展示和内链改写需按实际站点实现，未经过真实 WordPress 联调。

前端使用共用 Astro + Tailwind 模板，WordPress 管理内容并通过 API 供站点读取。默认 static，在构建时取数；只有明确需要请求时渲染才使用 server。不生成 PHP 主题，也不把 WordPress 模板输出当成整个网站前端。

## 环境变量与认证

统一使用以下网站侧配置，真实值只在本地 .env 或平台环境变量中保存：

| 变量 | 含义 |
| --- | --- |
| WORDPRESS_API_BASE | REST 根地址，例如 https://cms.example.com/wp-json/，不包含 wp/v2/posts |
| WORDPRESS_USERNAME | 用于 API 访问的账号名 |
| WORDPRESS_APPLICATION_PASSWORD | 该账号签发的 Application Password，不是后台登录密码 |

远程认证采用 HTTPS 下的 Basic Auth，由构建或服务端模块根据用户名和 Application Password 创建 Authorization 头。凭证不得进入 PUBLIC_ 变量、site.config.mjs、URL 查询参数、日志或页面 props；禁止跟随未知跨源跳转转发认证头。不要把 WordPress 后台 cookie / nonce 当作远程构建凭据。[官方认证说明](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)

使用满足读取需求的专用账号权限；Application Password 不能被描述为自带独立只读 scope。仅公开内容且接口允许匿名读取时，可不配置认证；需要认证时用户名和应用密码应成对提供，401/403 不静默降级成空内容。不要要求用户在对话里粘贴密码。

static 构建：环境变量 → 服务端 API 请求 → 规范化公开内容 → 静态 HTML。server 模式按平台取得运行时配置；切换 Vercel / Cloudflare 时单独核对 runtime secrets/bindings，不能假定 process.env 在两边行为相同。

## 数据契约与映射

先检查目标站 REST API 实际可用的路由与脱敏响应。标准内容通常从 REST 根地址下的 wp/v2/posts、pages、categories、tags、media 获取。产品可能是自定义文章类型或 WooCommerce 数据，必须核实实际 rest_base、公开字段和认证方案，不能假设存在统一的 products 接口。WooCommerce 采用专属 API 密钥时另建服务端环境变量，不能擅自复用 Application Password。

文章集合以 page / per_page 分页（per_page 上限 100），依据响应头 X-WP-Total / X-WP-TotalPages 完整读取。详情通常用数字 ID；按 slug 查找使用集合过滤并检查结果，而非拼成 `/posts/{slug}`。显式选择公开发布内容，排除草稿、私有及密码保护内容；认证账号能读不代表可以发布。[分页](https://developer.wordpress.org/rest-api/using-the-rest-api/pagination/)、[文章接口](https://developer.wordpress.org/rest-api/reference/posts/)

将 id、slug、title.rendered、excerpt.rendered、content.rendered、日期、分类及媒体引用映射为页面模型。标题/摘要中的 HTML 通过解析器提取或清理，正文使用可靠清理规则；不直接信任 script、事件属性、iframe 或主题短代码。区块/插件依赖的交互需要单独实现，REST 返回 HTML 不等于主题功能可自动搬到 Astro。

媒体解析实际 source_url / 尺寸变体，确保生产站可长期访问。需要下载时只访问已确认的媒体来源，避免把认证头发送到外部图片/CDN 域名。WordPress 内链通过已知文章/页面映射到前端路由；保留外部链接与实际媒体地址，不用全局字符串替换改写所有 URL。

## SEO 与多语言

Astro 统一生成公开前端的 canonical、sitemap 和 JSON-LD，不能沿用 CMS 域名的 link/guid 作为最终 canonical。Yoast / Rank Math 等字段只有目标 API 实际返回时才读取；采用结构化字段映射，不直接注入整段插件 head HTML 导致双份元信息或旧域名引用。

多语言字段与路由依赖目标站使用的插件/扩展，先核实真实关联译文，不假定 WordPress 核心有通用 locale 查询和翻译关系。后台的编辑能力保持原样；若需要新增 REST 字段或内容类型，明确实际后端改动，不自动安装插件或修改生产后台。

## 内容更新与动态功能

static 内容变化后需要手动重建，或另行接入已配置的发布 webhook / 平台构建钩子。没有配置就不能宣称后台发布会自动同步。取数失败中止构建，避免用空列表替换成功站点；server 明确缓存策略并区分 404 与临时故障。

询盘与邮件不是读取文章 API 的附带能力。需要核实目标表单插件实际提供的接口，或连接已有表单服务；不能假定存在通用 WordPress 询盘端点。有凭证的提交通过服务端/函数代理，不能从浏览器传管理员凭据。搜索可用构建期公开索引或明确的后端方案；受保护的草稿预览不能混入生产构建。

## 部署与验证

Astro 前端沿用 [deployment](deployment.md)，可部署到 Vercel 或 Cloudflare；WordPress 后台继续运行在独立 PHP / 数据库宿主。前端平台切换时迁移相应环境变量和钩子，不需要迁移后台数据库。

现有脱敏测试覆盖分页、基础字段映射、HTML 清理、保护内容排除和认证失败。媒体、CMS/前端内链转换、真实 API、插件、多语言、预览和表单需要单独适配联调。仅配置环境变量不代表客户网站的所有内容已接入。不要启动本地 WordPress、Docker 或服务来代替静态检查。

需要改 WordPress API 时，可按需参考 [WordPress/agent-skills](https://github.com/WordPress/agent-skills) 的 wp-rest-api / wp-project-triage / wp-plugin-development；不要求安装整包。本项目没有复制 GPL 技能文件。
