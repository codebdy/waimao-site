# RXCMS 接入（rxcms-server）

目标后端已确认为 **rxcms-server**。以下契约于 2026-11-07 根据后端实现核对，kingnod-v2 是消费端参考。生成的网站不依赖作者本机目录；用户只需提供服务地址、站点密钥和所需业务资料。部署版本不同时核对对应源码或脱敏响应。

## 源码依据

路径均相对于 rxcms-server 仓库，作为定位线索，不是 skill 随包文件：

- `internal/interfaces/http/content_api.go`：路由、分页、语言、内容/媒体映射、询盘提交和通知。
- `internal/interfaces/http/site_key_auth.go`：站点 key 认证与 scope 校验。
- `internal/interfaces/http/site_service_gate.go`、`server.go`、`cmd/server/main.go`：服务状态门控和路由装配。
- `internal/infra/mediaurl/mediaurl.go`：稳定投递 URL 与临时签名 URL。
- `internal/interfaces/http/mcp.go`：智能体端点、工具和权限。
- `docs/content-api.md`、`docs/mcp-server.md`：协议说明；与实现有出入时以当前部署版本代码为准。

## 认证与服务状态

网站侧沿用 `RXCMS_API_BASE`（服务源，不包含 `/api/v1` 或 `/graphql`）和 `RXCMS_SITE_KEY` 配置约定。这是网站消费端的环境变量命名，不是后端的 YAML 配置字段。请求带 `Authorization: Bearer <site-key>`，也支持 `X-Api-Key`。

### 环境变量：沿用 kingnod-v2 的方式

kingnod-v2 的 `src/lib/client.ts` 从 `import.meta.env.RXCMS_API_BASE` / `import.meta.env.RXCMS_SITE_KEY` 读取配置，并以 `process.env` 同名变量兜底；这个模块仅供构建期或服务端使用。它的 `.env-example` 只说明配置，不承载实际凭据。

新建 RXCMS 网站时生成不含真实 key 的 `.env.example`，本地复制为被 Git 忽略的 `.env` 后填写。Vercel / Cloudflare 中把同名值放在平台对应的环境变量设置中，不把真实值写进 site.config.mjs 或提交到 Git。

- **纯 static 内容读取**：构建进程从环境变量拿 key → 请求 RXCMS → 生成 HTML/公开内容数据 → 部署 dist。访客读取静态文件，不再需要 key。内容更新后重新构建。
- **server 内容读取**：服务端取得配置并请求 RXCMS；实际使用构建期注入还是运行时变量，要按平台和读取方式确认。Cloudflare runtime secrets/bindings 不能假定等同于 process.env，不能照搬 Node 读取方式而不验证。
- **询盘/上传**：发生在用户访问时，需要函数或服务端环境中的 key。构建时配置过 key 不表示纯静态页面能在访问时安全使用它；详情见下文询盘接入。

kingnod-v2 当前 `astro.config.mjs` 实际是 `output: 'server'`；询盘路由 `src/pages/api/ask-for-quote.ts` 设 `prerender = false`，浏览器提交到该同源端点，端点才带 key 调 RXCMS。借鉴它的环境变量约定，不把整个站误认成纯静态实现。也不能认为去掉 PUBLIC_ 前缀就足够：仍需避免将 key 作为组件属性、脚本变量或 JSON 数据序列化输出。

密钥绑定单站，URL 无需额外传 website id。后台签发最小权限 key：内容读取用 content:read，询盘提交用 forms:write；内容维护和询盘后台读取使用 content:write。当前 REST GET 路由挂 SiteKeyAuth，而表单额外挂 RequireScope(forms:write)；不要把推荐签发权限误写成所有 GET 均显式执行 scope 校验。MCP 按工具校验 scope。

密钥只放构建环境或服务端，不能用 PUBLIC_ 前缀、嵌入浏览器、静态搜索索引、生成 HTML 或公开日志。浏览器不直接持 key 请求 RXCMS。

缺失/失效/吊销 key 返回 401；表单缺 scope 返回 403。当前服务门控还会在站点暂停或无有效订阅等情况下返回 **402**，JSON 含 `error: "site_offline"`。这不是“没有内容”，不能转成空站或 404 发布。

## 内容接口

| 方法与路径 | 契约 |
| --- | --- |
| GET `/api/v1/config` | website、baseLang、locales；语言项含 abbr、htmlLang、urlFragment、dir |
| GET `/api/v1/schema` | types 字段描述；用于辅助核对，字段细节仍以响应/映射代码为准 |
| GET `/api/v1/content/{type}` | items、total、page、pageSize；post / product / tag 按页切分，默认每页 20，上限 100；post_category、product_category、user 一次返回全部，page / pageSize 只是回显 |
| GET `/api/v1/content/{type}/{identifier}` | 单条信封；不存在返回 404 |
| GET `/api/v1/search?q=...` | 搜索文章、产品和两种分类；支持 locale、page、pageSize |
| GET `/api/v1/media/{ref}` | mediaRef 对应媒体及 file URL 对象 |

内容信封是 `{ id, type, slug?, locale?, data }`。type 包括 post、product、post_category、product_category、tag、user。文章/产品只投放已发布且未软删内容；不要把这一 status 规则泛化到所有分类和用户类型。

列表参数包括 page、pageSize、locale、category、tag、slug、name、sourceTagId、featured、withContent；过滤项按内容类型生效，featured 只接受有效布尔值。文章和产品普通列表不带正文及 schemaJson，详情或 `withContent=true` 才返回；分类正文和 meta 走分类详情。

标识符例外：tag 使用 URL 编码后的原始名称，没有 slug；user 详情使用数字 ID，不能假定所有类型都以 slug 路由。user 列表当前返回全部公开成员；两种分类列表也返回该语言的全部分类（total=本次条数）。这三类都未按页切分，第 2 页会再次返回同一批数据，遍历时以 total 判断结束，不要按 `items.length < pageSize` 继续翻页。

内容字段映射：

- 文章：title、description、content、cover、category、tags、author、meta、publishedAt/createdAt/updatedAt、schemaJson。
- 产品：title、shortTitle、description、featured、seqValue、category、meta、updatedAt、medias；详情另含 content/content2/content3、features、attachments、relatedSlugs、schemaJson。
- 当前产品关联字段是 **relatedSlugs**；按 slug 和当前语言解析，不把旧消费端的 relatedProducts 当作后端保证返回的字段。
- SEO 来自 data.meta；schemaJson 是原生 JSON，不进行双重编码，也不塞进正文 script。用站点真实标题、作者、封面、日期与 canonical 合并主体，避免竞争的 Article / Product 节点。

## 多语言

内容列表/详情不传 locale 时使用站点 baseLang；未配默认语言时可能返回全部语言，构建前应核对。实现支持 abbr 或 urlFragment 匹配，推荐从 config 获取，不自行猜语言前缀。未知语言在列表、文章/产品详情中不命中内容。

**分类与标签详情不同**：post_category、product_category、tag 详情按请求语言找不到时，会回落到 baseLang，再找不到则不按语言过滤（content_api.go 的 oneTag / onePostCategory / oneProductCategory）。返回信封的 `locale` 是实际语言；多语言静态页必须比较它与请求语言，不一致按“缺译文”处理，不能当作该语言页面输出或生成 hreflang。starter 的 `client.detail()` 目前不做这项比较。

**搜索不同**：不传 locale 时跨语言搜索；单语言搜索要显式传参。**成员不同**：summary/profile 独立回落基准语言，并用 summaryLocale/profileLocale 表示各字段实际语言；未知/缺译文成员仍可能返回基准资料。

站点声明支持某语言不代表每篇内容都有译文。只为实际对应内容生成 hreflang；回落文本按真实语言处理。

## 图片、视频与附件

使用后端返回的媒体 file 字段，不自行拼接私有存储路径。Cloudflare Images 返回图片投递 URL；Cloudflare Stream 提供 HLS / transformVideo、cloudflareEmbed 和缩略图字段。产品 medias 和 attachments 当前经关联数据实时映射，不是永久有效的旧 JSON 快照。

静态构建尤其要检查 URL 生命周期：Images/Stream 使用稳定投递地址；R2 **配置自定义投递域名后**可返回稳定地址，未配置时回退 presign；其他存储也可能返回会过期的签名地址。不能把短时 URL 当作永久静态资源发布。需要配置稳定投递、经授权复制为站点资产，或设计有明确缓存期限的代理；并非所有媒体问题都需要全站改 server。

上传与读取分离：`GET /api/v1/media/{ref}` 不提供上传能力。内容维护/上传已有 `/graphql`、`/api/media` 等路径，使用前核对各自处理器、权限和完整上传协议，不凭读接口猜 POST。

## 询盘与通知

提交到 `POST /api/v1/forms/{form}`，例如 contact。form 作为询盘类型保存，不表示后端已提供可自动渲染的表单字段 schema。请求为 JSON：

```json
{
  "name": "Example buyer",
  "email": "buyer@example.com",
  "company": "Example company",
  "mobile": "",
  "message": "Product requirements",
  "fromUrl": "https://example.com/products/example/",
  "attachmentIds": []
}
```

这是契约示例，不能自动执行。email 与 message 至少一项非空；attachmentIds 是已上传到同站的媒体整数 ID，不是文件本身或任意 URL。完整 message 存 content，摘要存 message 字段。

成功保存返回 `201 { id, ok: true, spam }`。spam=true 表示已存储但被判垃圾，不发通知；非垃圾尝试给站点 noticeEmail 发信。**通知为尽力而为**：邮件服务、收件设置、发送额度或投递失败不改变已保存的成功响应。UI 只能据此说明需求已提交，不能宣称邮件已送达。

网站接入路径：

- **static + Vercel**：静态页面保持预渲染；按需增加独立 Vercel Function 或用户已有表单代理，服务器持 forms:write key 转发 RXCMS。
- **static + Cloudflare Pages**：按需增加 Pages Function 或独立 Worker 作为询盘代理。纯 dist 直接上传不包含 Functions 部署；采用支持 Functions 的部署流程或单独部署 Worker，并说明网站静态、表单需要运行时。
- **server**：用所选平台的服务端端点持 key 转发。

代理需校验输入、限制大小和频率、处理可信来源及后端失败；不伪造客户端 IP 或盲目信任传入转发头，不自动重试非幂等提交。没有现成代理时把它列为待实现，不让浏览器绕过代理携带密钥。已有表单保持原字段/行为，除非用户要求调整。

## 智能体

`POST /mcp` 为无状态 Streamable HTTP / JSON-RPC 入口，支持 initialize、tools/list、tools/call、ping。GET 返回 405，不按旧式 SSE 端点配置。与 Content API 使用相同站点 key 机制，但建议独立签发智能体 key。

content:read 可发现/读取配置、文章、产品和分类；content:write 包括内容创建/修改及 list_enquiries/get_enquiry；forms:write 对应 submit_form。按 tools/list 实际结果调用，不保证某个客户端工具前缀。智能体维护权限及客户询盘数据不能进入公开站点产物；未经授权不创建/发布内容或提交询盘。

## 实施与验收

随包现有实现：`assets/astro-starter/src/lib/content/rxcms.mjs` 提供环境认证、列表完整分页、详情 404 区分、语言匹配、产品/文章规范化；`src/data/catalog.ts` 在 content.source=rxcms 时构建期读取，并驱动产品/文章路由与 sitemap。脱敏 fixture 和针对性测试在 `tests/fixtures/rxcms.json`、`tests/content.test.mjs`。这是已实现的内容适配层，尚未连接客户 API。

当前范围为单语言构建快照，产品/文章正文按 Markdown 安全子集处理，不执行 MDX；保留 relatedSlugs、meta、附件和原生 schemaJson。schemaJson 尚不自动覆盖页面结构化数据，复杂媒体/视频、分类独立页面和多语言路由需要客户站点适配。稳定媒体当前保守拒绝带查询参数的 URL（遇到即中止构建），确认稳定的变体地址时可扩展白名单，不能直接放开签名 URL。正文 Markdown / HTML 中的 `<img>` 只保留 HTTPS 地址，**不做有效期检查**；客户站点使用 R2 未配自定义域或其它会签名的存储时，要先核对正文图片地址。媒体文件名不作为 alt；Cloudflare Stream 视频（mediaType=video）当前不渲染。切换 output=server 也不会自动实现实时 CMS 页面。

询盘代理实现与通知未知的语义见 [inquiry](inquiry.md)，可独立搭配 static。客户阶段再真实联调，不把本地 fixture 当成已验证邮件送达。

先实现内容适配层，页面不直接依赖接口信封。static 构建按 total 与实际返回数量完整分页并检测重复/提前结束，重大取数失败中止构建保留上次部署；不要把 401/402/403/5xx 转为空列表。static 内容更新需手动重建或另行接入平台构建钩子，本次代码核对未证明 RXCMS 自动调用这些钩子。

server 按平台取得运行时凭据，明确缓存和失效规则；内容不存在才返回 404，临时错误保留适当 5xx。用脱敏 fixture 测试分页、完整字段、relatedSlugs、缺译文、媒体有效期、402 和询盘成功/垃圾/失败路径。真实 API、邮件和平台运行另行验证。
