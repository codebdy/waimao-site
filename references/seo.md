# 外贸网站 SEO 实施与验收

吸收 Claude SEO 的 technical / page / schema / hreflang / sitemap / content 检查分类，结合 Astro SEO 的代码检查方式；按目标站证据决定修改，不照搬评分权重、字数门槛或推广指令。

## 建站前

把采购意图映射到产品、分类、应用、能力和指南页面。每个页面有独立价值，避免仅替换关键词的重复页。关键词量、排名和竞品结论必须标注真实来源；资料不足时提出假设与核实方法。

## HTML 与索引

- 主要内容在初始 HTML 可见；每页有清楚的主标题、独立 title / description、语义链接及合理标题层级。不要把固定字数当合格条件。
- canonical 来自配置的生产域名和规范路径，而不是预览请求 Host；不携带追踪参数或 fragment。分页通常保留自己的 canonical，不一律指向第 1 页。
- sitemap 只含希望索引的规范成功页面，排除 noindex、错误页、重定向和重复 URL；lastmod 使用真实修改时间或省略。
- 上线并开启收录后，引导用户验证 Google Search Console 并提交 sitemap；没有 Search Console 数据就不报告收录结论。
- robots.txt 控制抓取，不保证 URL 不被索引。需要爬虫读取 noindex 的公开页面不要同时 Disallow。私有预览优先用平台访问控制；robots 与 noindex 不是保密措施。
- 不继承 Kingnod 的临时 Disallow 或“所有标签页 noindex”作为通用政策。分类/标签是否索引取决于独立价值和用户选择。
- 旧 URL 迁移要映射到实际对应页面，永久迁移用合适状态码；不存在页面返回真实 404/410，不能把错误页用 200 输出。静态平台的状态码与重定向另行验证。

## 多语言

只将已发布、可访问且有真实对应内容的语言页面加入 alternates；检查语言代码、互相引用、canonical 和 sitemap 一致。x-default 在有合适默认入口时使用。正文回退英文时按实际语言处理，不能只改 html lang。自引用和回链检查不应被扩写成未经证实的“单个缺项导致全站信号失效”。

## 结构化数据

按页面可见事实输出 Organization / WebSite / WebPage，并按内容增加 Product / Article / BreadcrumbList 等。Schema.org 有效性、Google 特定富结果资格和实际搜索展示是三件事，不承诺排名或展示。

复用稳定 @id，合并同一主体，保留真实作者、日期、图片和生产域名。询盘产品没有公开价格或评价时不编造 Offer / AggregateRating。CMS JSON-LD 序列化后转义 `<`，避免 script 结束标签注入；富文本清理另行处理。

FAQ 等类型是否有搜索展示资格随时间变化，实施时核对官方文档，不复制上游日期断言为永久规则。也不把 llms.txt、GEO 分数或 AI 引用当作必须实现或已证实的排名因素。

## 图片、性能和内容

图片替代文本描述内容，装饰图使用空 alt；设置尺寸，优化响应式资源，首屏主图不盲目懒加载。减少无用客户端 JS。编译结果不能代替真实 CWV 数据，未做测量就不报告性能得分。

产品参数、认证、案例和作者身份以真实资料为准，引用指向支持具体主张的来源。内部链接帮助完成采购任务；不为满足链接数添加无关入口。

## 权威资料

- [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Robots meta / noindex](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

输出发现时给出具体 URL / 文件、证据、影响、修改和验证方式。没有抓取、Search Console 或运行时数据就说明限制，不以估算分数冒充审计结果。
