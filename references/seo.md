# 外贸网站 SEO 实施与验收

吸收 Claude SEO 的 seo-page / seo-technical / seo-images / seo-schema / hreflang / sitemap 检查项，结合 Astro SEO 的代码检查方式；按目标站证据决定修改，不照搬评分权重、字数门槛或推广指令。本 skill 负责站内技术 SEO；关键词研究、外链建设和持续内容运营不在范围内。

## 建站前

把采购意图映射到产品、分类、应用、能力和指南页面。每个页面有独立价值，避免仅替换关键词的重复页。关键词量、排名和竞品结论必须标注真实来源；资料不足时提出假设与核实方法。各类页面的模块、title 写法与结构化数据见 [页面蓝图](page-blueprints.md)。

## 页面级检查（每页）

数字是常用参考区间，不是硬性门槛；以完整表达、不被截断、对采购商有用为准。

- **title**：每页唯一；英文约 50–60 个字符，核心产品词靠前，结尾 “| 公司名”；其他语言按实际显示宽度控制。不同页面不用同一套模板化标题。
- **meta description**：每页唯一；英文约 120–160 个字符，概括这页能解决的采购问题并给出下一步；不要重复 title，也不要每页都用同一句结尾套话。
- **H1**：每页一个，与页面主题一致；H2–H4 按层级使用，不跳级，标题文字有信息量。
- **网址**：小写、连字符、简短可读，约 100 个字符以内；不用查询参数承载内容；全站末尾斜杠一致；跳转只跳一次，永久迁移用 301。
- **内部链接**：每页至少一个站内入链，无孤立页；重要页面离首页 3 次点击以内；锚文字描述目标页内容。
- **社交分享**：og:title、og:description、og:url、og:site_name 由模板输出；有分享图时再输出 og:image 和 twitter:card。
- **内容**：主要内容在初始 HTML 中可见，不藏在需要点击才加载的脚本里；产品页有足够的真实参数和应用说明，不为凑字数堆砌；关键词自然出现，不追求密度。
- **可信度（E-E-A-T）**：关于、工厂、质检、认证、联系方式等页面真实完整；文章有真实作者和日期才显示。

## 技术检查（全站）

- robots.txt 存在于根目录、语法正确、不屏蔽 CSS/JS 等必要资源；sitemap 可访问且只含可索引页面。
- 每个可索引页面有自引用 canonical，且与 noindex 不冲突；title、description、canonical、robots、结构化数据都在服务器输出的 HTML 里（模板默认 static 已满足）。
- 全站 HTTPS，无混合内容（页面里不引用 http:// 的图片或脚本）。
- 手机端：有 viewport、无横向滚动、按钮和链接便于点击（约 24×24 像素以上，44–48 像素更舒适）；手机和电脑显示同样的主要内容；Cookie 弹窗等不要整屏遮住内容。
- 分页使用可抓取的 `<a href>` 链接，每页自引用 canonical。
- AI 爬虫（如 GPTBot、ClaudeBot 等）是否允许抓取是商业选择：默认不额外屏蔽；用户明确要求时再在 robots.txt 中设置，并说明这只影响遵守规则的爬虫。
- 网页速度目标（上线后用真实数据衡量，手机单独看）：LCP ≤ 2.5 秒、INP ≤ 200 毫秒、CLS ≤ 0.1。构建阶段只能检查风险点：首屏大图过大、图片没写尺寸、不必要的脚本。

## HTML 与索引

- 主要内容在初始 HTML 可见；每页有清楚的主标题、独立 title / description、语义链接及合理标题层级。不要把固定字数当合格条件。
- canonical 来自配置的生产域名和规范路径，而不是预览请求 Host；不携带追踪参数或 fragment。分页通常保留自己的 canonical，不一律指向第 1 页。
- sitemap 只含希望索引的规范成功页面，排除 noindex、错误页、重定向和重复 URL；lastmod 使用真实修改时间或省略。
- 上线并开启收录后，引导用户验证 Google Search Console 并提交 sitemap；没有 Search Console 数据就不报告收录结论。
- robots.txt 控制抓取，不保证 URL 不被索引。需要爬虫读取 noindex 的公开页面不要同时 Disallow。私有预览优先用平台访问控制；robots 与 noindex 不是保密措施。
- 不继承 Kingnod 的临时 Disallow 或“所有标签页 noindex”作为通用政策。分类/标签是否索引取决于独立价值和用户选择。
- 旧 URL 迁移要映射到实际对应页面，永久迁移用合适状态码；不存在页面返回真实 404/410，不能把错误页用 200 输出。静态平台的状态码与重定向另行验证。

## 多语言

本地 static 模板已支持多语言；RXCMS / WordPress 内容源的多语言需要单独接入，不能仅增加配置就声称完成。只将页面清单中真实存在、可索引的对应译文加入 hreflang，包含自引用和互相回链；缺译文不生成详情页、不进 sitemap，也不以英文填充。x-default 指向默认语言对应页；该版本不存在时指向默认语言首页。单语言不输出 hreflang。

每页 html lang、dir 和 WebPage / Article 的 inLanguage 使用实际语言；canonical 统一用 site 域名和当前语言路径。Organization / WebSite 的 @id 在各语言间保持稳定，面包屑使用本语言名称和路径。sitemap 汇总实际可索引页面；空文章列表和 404 仍排除，indexable=false 时保持 noindex 和空 sitemap。检查语言代码、自引用、回链和规范网址一致，不将单个缺项夸大成未经证实的全站信号失效。

## 结构化数据

按页面可见事实输出 Organization / WebSite / WebPage，并按内容增加 Product / Article / BreadcrumbList 等。Schema.org 有效性、Google 特定富结果资格和实际搜索展示是三件事，不承诺排名或展示。

复用稳定 @id，合并同一主体，保留真实作者、日期、图片和生产域名。询盘产品没有公开价格或评价时不编造 Offer / AggregateRating。CMS JSON-LD 序列化后转义 `<`，避免 script 结束标签注入；富文本清理另行处理。

FAQ 等类型是否有搜索展示资格随时间变化，实施时核对官方文档，不复制上游日期断言为永久规则。也不把 llms.txt、GEO 分数或 AI 引用当作必须实现或已证实的排名因素。

页面类型与结构化数据的常用对应（只输出页面上真实可见的事实）：

| 页面 | 类型 | 常用属性 |
| --- | --- | --- |
| 首页 / 全站 | Organization、WebSite、WebPage | name、url、logo、contactPoint、sameAs（真实社媒） |
| 产品详情 | Product、BreadcrumbList | name、description、image、url；有公开价格才加 Offer，有真实评价才加 Review / AggregateRating |
| 文章 | Article 或 BlogPosting、BreadcrumbList | headline、datePublished、dateModified、author、image、publisher |
| OEM / 服务 | Service | name、description、provider |
| 联系 | ContactPage | — |

校验要点：JSON-LD 有有效的 `@context`，每个实体节点声明 `@type`（模板使用的 `@context` + `@graph` 结构是合规写法）；只用绝对网址；日期用 ISO 格式；不留占位文字；不用已停止支持的类型（如 HowTo），具体以 Google 官方文档为准；不做假评价或未披露的激励评价。

## 图片、性能和内容

- **替代文本**：描述图片内容（约 10–125 个字符），产品图写产品名和关键特征；不用文件名或 “image / photo”；装饰图用空 alt。
- **文件名**：小写、连字符、描述内容，如 `stainless-centrifugal-pump-cp200.webp`，不用 `IMG_1234.jpg`。
- **格式与大小**：照片优先 WebP（可加 AVIF），需要透明用 PNG，图标和 Logo 用 SVG。参考目标：缩略图 50KB 以内、正文图 100KB 以内、首屏大图 200KB 以内；超过 200KB 应压缩，超过 500KB 视为过大。
- **尺寸与加载**：每张图写明宽高或宽高比，避免页面跳动；首屏主图不懒加载，可加 `fetchpriority="high"`；首屏以下的图片 `loading="lazy"`；提供多种宽度（如 400w / 800w / 1200w）供不同屏幕选择，优先用项目已有的图片优化工具。
- 减少无用客户端 JS。编译结果不能代替真实 CWV 数据，未做测量就不报告性能得分。

产品参数、认证、案例和作者身份以真实资料为准，引用指向支持具体主张的来源。内部链接帮助完成采购任务；不为满足链接数添加无关入口。

## 权威资料

- [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Robots meta / noindex](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

输出发现时给出具体 URL / 文件、证据、影响、修改和验证方式。没有抓取、Search Console 或运行时数据就说明限制，不以估算分数冒充审计结果。
