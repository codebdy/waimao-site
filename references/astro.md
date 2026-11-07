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

模板包含首页、产品列表与详情、文章列表/详情、联系页、隐私页、404、robots、sitemap，以及共用页面壳和 SEO 输出。默认本地演示产品；content.source=rxcms 时使用已提供的构建期产品/文章适配，wordpress 为标准文章实验接入。可按 [inquiry](inquiry.md) 添加 static 独立询盘函数，按 [consent](consent.md) 配置同意框。尚未连接客户 CMS、未实现通用多语言路由或经过真实表单/邮件验收，不能混称为已上线客户站。

在 `src/data/catalog.ts` 替换产品；在 `site.config.mjs` 设置生产域名、企业名、描述、语言和已确认邮箱。站点默认不可索引，正式开放时显式设 `indexable: true`，并删除演示内容。已有站点不套用这个模板开关。

## 路由与内容

- static 下每个动态详情、分类、分页及语言 URL 都要在构建期枚举。`getStaticPaths` 必须覆盖所有已发布条目，不能只取 CMS 第一页。
- starter 使用构建期内容快照，即便切到 server，其产品/文章详情仍预渲染。需要实时 CMS 时再调整详情页的 prerender、数据访问时机、环境读取与缓存，不让模板的 `getStaticPaths` 掩盖更新需求。
- 静态站主要内容取数失败应令构建失败，保留上次成功部署；不要把网络错误当成空产品列表发布。
- SSR 明确不存在才返回 404；临时上游错误返回适当 5xx 并避免缓存错误。重试有上限，非幂等表单提交不盲目重试。
- CMS 富文本使用合适解析器和 HTML 清理规则，不能直接信任外部 script 或事件属性。普通文本用框架转义。
- 静态搜索可在生成的公开内容索引上完成；不把 CMS 访问令牌交给浏览器。未实现搜索时不显示不可用入口。
- 静态询盘连接已确认的外部接口/表单服务；需要同域处理器时单独设计函数，说明这不再是完全无运行时的部署，不擅自改变全站渲染模式。

框架细节发生变动时核对 [Astro rendering](https://docs.astro.build/en/guides/on-demand-rendering/) 和 [Tailwind Astro guide](https://tailwindcss.com/docs/installation/framework-guides/astro)，不要把某个版本的配置当永久接口。
