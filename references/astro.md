# Astro + Tailwind

## 模式

新建站默认 static；SSR 不是接 CMS 的前提。尊重现有项目版本，不为应用本 skill 自动升级框架。

| 模式 | 内容读取 | 页面更新 | 托管 |
| --- | --- | --- | --- |
| static + 本地内容 | 构建期 | 代码变更后重建 | Vercel / Cloudflare Pages |
| static + RXCMS / WordPress API | 构建期读取全部公开已发布内容 | 已接入的 CMS webhook 或手动重建 | Vercel / Cloudflare Pages |
| server + RXCMS / WordPress API | 请求期或缓存读取 | 由缓存失效策略决定 | Vercel / Cloudflare Workers |

模板配置入口是 `site.config.mjs`，适配器选择封装在 `config/deployment.mjs`；`astro.config.mjs` 只组装框架配置。平台切换见 [deployment](deployment.md)。

## 从 starter 开始

将 `assets/astro-starter/` 中源码复制到新项目目录；排除 node_modules、dist、.astro、.wrangler、.vercel 和本地环境文件。已有站点按需借鉴文件，不覆盖。

模板包含首页、产品列表与详情、文章列表/详情、联系页、隐私页、404、robots、sitemap，以及共用页面壳和 SEO 输出。默认本地演示产品；content.source=rxcms 时使用已提供的构建期产品/文章适配，wordpress 为标准文章实验接入。本地 static 站已支持多语言；RXCMS、WordPress 内容源及 server 的多语言需要单独接入，配置多种语言时会明确报错。可按 [inquiry](inquiry.md) 添加 static 独立询盘函数，按 [consent](consent.md) 配置同意框。模板不等于已连接客户 CMS 或经过真实表单/邮件验收的上线客户站。

本地产品在 `src/content/products/<语言>/<文件>.md`，文章在 `src/content/articles/<语言>/<文件>.md`；由 Astro 内容集合和 `src/data/catalog.ts` 按语言读取。`src/content.config.ts` 使用 glob loader 和 schema，frontmatter 缺必填字段或图片不存在时构建报出文件名，不发布不完整内容。正文通过 `astro:content` 的 `render()` 渲染，不能把本地 Markdown 当 CMS HTML 拼接。在 `site.config.mjs` 设置生产域名、企业名、描述、语言和已确认邮箱。站点默认不可索引，正式开放时显式设 `indexable: true`，并删除演示内容。已有站点不套用这个模板开关。

产品必填 key、slug、title、description、specifications（可为空数组）；文章共用 key、slug、title、description，specifications 可省略，publishedAt 可选。日期没有就不填，写成带引号的 ISO 日期（如 `"2026-01-02"`）或带时区的时间，不带引号会被拒绝，不编造发布日期。images 是可选数组，每项用集合 `image()` 校验 src，并填写非空 alt；seoTitle、seoDescription 可选。添加文章后自动生成详情、文章栏目和导航；没有文章时保留原有空列表 noindex 行为。默认仅有演示产品，文章集合为空，仍生成 7 页；空集合的 Astro 提示不代表构建失败。RXCMS / WordPress 不加载本地集合，继续使用原内容适配流程。

页面本地图片（产品、文章、Logo、插图、小图标）放 `src/assets/`，内容图片在 frontmatter 的 images 中用相对路径引用，详情页用 `astro:assets` 的 `<Image>` 输出。栅格图明确设置 WebP、宽高、widths/sizes，限制输出尺寸不超过源图。详情首图和列表首张产品图 eager + fetchpriority=high，其余 lazy。Logo 和小型 SVG 保留矢量，不为了格式统一栅格化；添加到页面时也使用 Astro 资产导入和图片组件。大型 SVG 插图/背景放 public 按路径引用；favicon.svg、ogImage 留 public，后者需要稳定的绝对地址。远程 CMS 图片保持原有处理，不搬到 assets，也不改变清理规则。详细图片约定见 [页面蓝图](page-blueprints.md)。

## 本地静态站多语言

`site.config.mjs` 的 `i18n: null` 兼容原 `language` 字段；显式配置 `i18n.defaultLocale` 和 `i18n.locales` 后优先使用它们。每个 locale 包含 URL `code`、`htmlLang`、显示 `name` 和可选 `dir`（默认 ltr）。Astro i18n 使用 `prefixDefaultLocale: false`：默认语言无前缀，其他语言为 `/<code>/`，不启用内容回退。

`src/i18n/ui.mjs` 提供完整英语和德语界面字典，包括固定页正文、询盘提示和 Cookie 同意框；新增语言必须补全字典，缺项会在构建时报出完整字段名。CookieConsent 使用自身的多语言 translations，同一域名下各语言共用根路径的同意 Cookie。

本地产品和文章用各语言目录中的独立 Markdown 文件表示译文，同一条内容沿用共享 `key`，各版本可填写不同 slug、标题、描述、正文及参数。每个集合内，同一语言的 key 和 slug 分别唯一，重复时构建报错并指出两个文件。集合 ID 使用文件路径，不使用 frontmatter slug，避免语言之间覆盖。没有译文文件就不生成该语言详情页。`catalog.ts` 的页面清单统一驱动非默认语言路由、sitemap、hreflang 和语言切换链接；有对应译文切到该页面，没有则切到目标语言首页。404 只生成默认语言版本。只启用一种语言时保留原来的无前缀路由，不输出 hreflang 或切换器。

## 路由与内容

- static 下每个动态详情、分类、分页及语言 URL 都要在构建期枚举。`getStaticPaths` 必须覆盖所有已发布条目，不能只取 CMS 第一页。
- starter 使用构建期内容快照，即便切到 server，其产品/文章详情仍预渲染。需要实时 CMS 时再调整详情页的 prerender、数据访问时机、环境读取与缓存，不让模板的 `getStaticPaths` 掩盖更新需求。
- 静态站主要内容取数失败应令构建失败，保留上次成功部署；不要把网络错误当成空产品列表发布。
- SSR 明确不存在才返回 404；临时上游错误返回适当 5xx 并避免缓存错误。重试有上限，非幂等表单提交不盲目重试。
- CMS 富文本使用合适解析器和 HTML 清理规则，不能直接信任外部 script 或事件属性。普通文本用框架转义。
- 静态搜索可在生成的公开内容索引上完成；不把 CMS 访问令牌交给浏览器。未实现搜索时不显示不可用入口。
- 静态询盘连接已确认的外部接口/表单服务；需要同域处理器时单独设计函数，说明这不再是完全无运行时的部署，不擅自改变全站渲染模式。

框架细节发生变动时核对 [Astro rendering](https://docs.astro.build/en/guides/on-demand-rendering/) 和 [Tailwind Astro guide](https://tailwindcss.com/docs/installation/framework-guides/astro)，不要把某个版本的配置当永久接口。
