# 外贸网站 · Astro 起步项目

Astro + Tailwind，默认 static。先把本模板复制到独立网站目录，再由 AI 替换公司资料、页面与配置。以下为模板的实际能力，客户项目交付时要按实施结果更新。

TEMPLATE-LICENSE.txt 保留原模板的 MIT 声明，其范围是原模板代码；客户新增资料、品牌素材和独立代码的许可另行说明。不要把复制模板理解为要求客户网站代码公开。依赖声明继续保留在 public/third-party-licenses.txt。

## 当前项目选择

| 项目 | 默认值 |
| --- | --- |
| 建站方式 / 内容来源 | 纯静态站 / local，本地演示产品 |
| 渲染模式 | static |
| 发布平台 | 待选：Vercel 或 Cloudflare |
| 询盘 | none，未开启；填写真实 email 后提供邮件链接 |
| Cookie 同意框 | 开启，Google ID 为空，不发送统计/广告请求 |
| 更新 | 修改代码并推送 GitHub，连接的平台重新构建 |

content.source、output、deployTarget、inquiry.provider 四项独立。RXCMS 产品/文章已提供内容适配；WordPress 标准文章为实验支持。默认单语言构建快照，本地 static 站可开启多语言；RXCMS / WordPress 内容源的多语言需要单独接入。模板不是完成的客户网站；客户译文、复杂产品页、真实平台和邮箱仍需验收。

## 第一次在电脑上看网站

1. 打开本文件和 package.json 所在的网站目录，AI 应告诉你实际路径。不要在 skill 安装目录操作。
2. 安装 Node.js 24 LTS（当前要求 >=22.23.4），打开该目录的终端；已有工具无需重复安装。
3. 首次安装依赖输入 `npm ci`。出现错误先处理，不继续发布。
4. 由你输入 `npm run dev`，访问终端打印的网址。保持窗口运行，结束时按 Ctrl+C 停止。此时只是本地预览。
5. 把需要修改的内容告诉 AI，再预览。发布前执行 `npm test` 和 `npm run build`。AI 默认不启动 dev/preview 或任何服务。
6. 把网站仓库推送到自己的 GitHub，按下方选择平台。若尚不会注册、安装或上传，请先看完整 skill 的 docs/ 目录（05-github.md、07-vercel.md、06-cloudflare.md）；生成客户项目时应保留适合本项目的新手步骤。

独立网站仓库根目录应直接能看到 package.json。GitHub Desktop 中查看 Changes，Commit 后还要 Push origin，托管平台才会自动构建。不要上传 .env、node_modules、dist、.astro、.wrangler、.vercel。真实询盘函数不由普通 Astro 本地预览运行。

## 网站与内容配置

编辑 site.config.mjs 中已有字段：site 为实际正式根网址，name、description、language、email 为真实资料。当前只支持根域部署；子目录部署需另改链接、base 和 canonical。indexable 默认 false：演示页 noindex、sitemap 空，robots 允许读取 noindex。它不是访问保护；补齐内容和隐私页后才开启收录。

`public/favicon.svg` 是中性的占位小图标，上线前须替换成客户自己的图标。可选 `ogImage` 默认为空；需要社交分享图时，填 public 下的路径（例如 `/share.jpg`，不写 public 前缀）或完整 HTTPS 图片地址。路径会按 `site` 域名生成绝对地址；不填就不输出 og:image 或大图卡片标签，没有默认分享图。文章和产品详情包含面包屑结构化数据；文章只使用已有发布日期，产品只使用已有图片，不编造作者、价格或评价。

```js
output: 'static',
deployTarget: null, // 选定后为 vercel 或 cloudflare
content: { source: 'local', locale: 'en' },
inquiry: { provider: 'none', turnstileSiteKey: '' },
```

本地产品在 src/data/local-products.json，由 src/data/catalog.ts 读取。source=rxcms 时，在本地 .env 或平台构建环境设置 RXCMS_API_BASE（服务 origin）、RXCMS_SITE_KEY；通过分页 API 读取产品和文章，生成 Products / Articles。失败中止构建，不回退演示内容。媒体需稳定 HTTPS URL，当前保守拒绝带查询参数的媒体链接；富文本只支持安全 Markdown 子集，不执行 MDX。相关产品按 relatedSlugs 映射，schemaJson 保留供人工核对后合并，未自动覆盖默认 Product schema。

source=wordpress 时，配置 WORDPRESS_API_BASE（以 /wp-json/ 结尾）；需认证时成对配置 WORDPRESS_USERNAME、WORDPRESS_APPLICATION_PASSWORD。实验客户端仅把标准 posts 渲染到 Articles，产品为空；pages 客户端未连前端路由。产品插件、媒体展示、内链改写、多语言和交互插件需额外适配。WordPress 后台继续运行在其原 PHP/数据库宿主。

凭证只在构建/服务端使用，不加 PUBLIC_ 前缀，不发聊天，不进入页面或配置文件。即使选 server，当前产品/文章路由仍是构建快照；需要实时 CMS 时另实现请求时取数与缓存策略。CMS 后台更新后需重建或配置已验证的发布钩子；只改后台不会自动产生 Git 提交。

## 本地静态站开启多语言

默认 `i18n: null`，继续使用原来的 `language: 'en'`，仍生成 7 个演示页面，没有语言切换器和 hreflang 标签。只配置一种语言也保持无前缀路由。若要英语加德语，在 site.config.mjs 中把 i18n 改为：

```js
i18n: {
  defaultLocale: 'en',
  locales: [
    { code: 'en', htmlLang: 'en', name: 'English' },
    { code: 'de', htmlLang: 'de', name: 'Deutsch', dir: 'ltr' },
  ],
},
```

同时保持 `content.source: 'local'`、`output: 'static'`。显式 i18n 优先于旧 language 字段；content.locale 是 CMS 取数设置，不是这份语言列表。code 是 URL 代码和字典键，htmlLang 是语言标签（也可为 en-US 等），name 是切换器显示名称，dir 可为 ltr 或 rtl，省略默认 ltr。默认语言在 `/`，其他语言在 `/de/` 等路径；Astro 使用 `prefixDefaultLocale: false`，不生成回退译文。RXCMS / WordPress 或 server 配置多种语言会报错，需单独接入。

产品文件 src/data/local-products.json 的每条记录有一个共享 key 和 translations。示例结构如下，实际填写客户资料：

```json
{
  "key": "sample-component",
  "translations": {
    "en": { "slug": "sample-component", "title": "Sample industrial component", "description": "Example only.", "specifications": [] },
    "de": { "slug": "muster-bauteil", "title": "Industrielles Musterbauteil", "description": "Nur ein Beispiel.", "specifications": [] }
  }
}
```

同一产品的 key 不变，各语言 slug 可以不同。没有某种语言的版本就不填写该版本：不会生成该语言详情页，也不会加入 sitemap 或 hreflang；不要复制英文冒充译文。已有演示产品附带德语译文；构建测试另加一个仅英语产品验证缺译文情形，不增加默认演示页数。本地文章仍为空，本次没有新增文章编辑机制。

新增一种语言时，让 AI 一起完成这三处修改：

1. 在 site.config.mjs 的 i18n.locales 中加入该语言。
2. 在 src/i18n/ui.mjs 的 dictionaries 中增加完整字典，按英语字典的字段逐项翻译。它包含导航、按钮、页脚、联系和隐私正文、404、询盘标签与结果提示、Cookie 文案。缺项构建会报出字段名，不会悄悄显示英文。客户上线前还需按真实处理方式完善各语言隐私说明。
3. 在 src/data/local-products.json 添加已经准备好的产品译文，包括参数、可选 SEO 字段及附件说明；relatedSlugs 若使用，要填写本语言的产品 slug。然后运行 npm test、npm run check、npm run test:builds 和 npm run build 检查。

多语言页头使用普通链接切换语言：有对应译文就打开该页，没有则打开目标语言首页。每页语言标记、规范网址和结构化数据使用实际语言，企业和网站标识保持稳定。hreflang 只关联真实存在的可索引译文；x-default 指向默认语言对应页，没有该版本时指向默认语言首页。sitemap 汇总各语言实际页面；收录开关、空文章页 noindex 和单一默认语言 404 保持原有规则。

Cookie 同意框使用 vanilla-cookieconsent 内置 translations，初始语言跟随页面；同一域名的各语言共用根路径 Cookie、名称和 revision，不因切换语言重复索取同意。真实浏览器中的记忆、撤回、方向排版和平台上的缺页状态码仍需验收。

## Vercel：默认 static

1. 注册 Vercel，可用 GitHub 登录；选择适合商业网站的套餐。导入网站 GitHub 仓库，按需授权 Vercel GitHub App。
2. Root Directory 为 package.json 所在目录；独立网站仓库留默认。选择 Astro preset、Node 24.x，Install Command `npm ci`、Build Command `npm run build`、Output Directory `dist`。
3. site.config.mjs 设置 output=static、deployTarget=vercel 并提交。默认不重复填写 SITE_OUTPUT / DEPLOY_TARGET；旧项目若有覆盖变量，核对或清除。内容源需要时配置对应构建凭证，Preview / Production 分别核对。
4. Deploy 后查看成功部署的网址，验证页面和联系功能；使用真实正式地址更新 site，再推送部署。
5. 后续修改 Commit 后 Push 到生产分支（通常 main），平台自动构建。失败时查看第一条实际错误。

## Cloudflare Pages：默认 static

1. 注册 Cloudflare 邮箱账号并完成验证，然后进入 Workers & Pages，创建 Pages 项目，选择 Connect to Git、连接并授权 GitHub 网站仓库。注册和仓库授权是两步。
2. Production branch 对应已有代码的分支。网站根目录为 package.json 所在目录；Build Command `npm run build`，输出 `dist`，Node 版本满足要求（如 NODE_VERSION=24.18.1）。保留依赖安装，提交锁文件。
3. site.config.mjs 设置 output=static、deployTarget=cloudflare 并提交，不必重复填模式/平台环境覆盖；按内容源配置 CMS 构建凭证。静态项目根目录不放 server 专用 Wrangler 示例。
4. 部署成功后检查 pages.dev 地址、页面、404 和联系入口，再绑定域名。Git 集成在 Push 后自动构建；不要用全站 SPA 回退掩盖不存在页面。

只有纯文件静态站可考虑控制台直接上传 dist；包含 Pages Functions 时应使用 Git 集成或受支持的 Wrangler 流程，不能只拖入 dist。

## static + RXCMS 询盘函数（可选）

本地内容站也能启用询盘，不必接入 CMS 内容或改 server。先选平台，在 site.config.mjs 把 inquiry.provider 改为 rxcms，填客户的公开 Turnstile site key。在网站目录运行：

```bash
npm run configure:inquiry
```

它为 Vercel 生成 api/inquiry.js，为 Cloudflare 生成 functions/api/inquiry.js 和 public/_routes.json。把生成文件一起提交再 Push。改平台或关闭询盘后也运行它，旧的自身生成入口会清理；不会覆盖用户自有同名文件。构建前自动检查一致性，避免漏部署函数。

函数运行时配置以下变量（本地 .env 中填写不等于云端运行时已有）：

| 变量 | 值的用途 |
| --- | --- |
| RXCMS_API_BASE | API 服务 origin |
| RXCMS_FORM_KEY | 本站 forms:write key，与内容读取 key 分开管理 |
| RXCMS_FORM_NAME | 默认 contact |
| INQUIRY_ALLOWED_ORIGINS | 允许的实际网站 origin，逗号分隔，不用通配符 |
| TURNSTILE_SECRET_KEY | Turnstile 私密 key；对应公开 site key |

Vercel 在相应环境的变量中配置；Pages 在项目运行时变量/Secrets 中配置。客户需在 Turnstile 添加实际网站域名；模板核验 token、hostname、action，此外生产应配置平台限流。正文限制 16 KiB；不传客户端 IP 头或附件 ID；当前无附件上传。

代理结果包括 saved（true/false/null）、id（已确认保存时）、spam、notification.status。垃圾询盘已存但通知 skipped_spam；普通询盘通知为 not_reported，因为当前 RXCMS 接口没有返回邮件发送结果。超时 saved=null 时先核对后台，不自动重试。不能把 HTTP 成功当邮件已送达。

客户网站阶段再取得测试站点与授权收件人，分别验证：后台保存记录、垃圾分类、通知日志与收件箱。当前仅提供脱敏测试，未进行真实提交。参考完整 skill 的 references/inquiry.md；客户交付 README 需补实际接口、运行时配置位置和真实验收结果。

## Cookie / Google 同意框

它让访客选择统计/广告 Cookie，不是 Google 评价框。cookieConsent.enabled 默认 true，google.analyticsId / adsId 默认空。只有配置自己的公开 G-… / AW-… 标识且访客接受相应类别，才加载相关标签。统计与广告分开，页脚 Cookie settings 可重开，撤回会刷新页面。

关闭：把 site.config.mjs 的 cookieConsent.enabled 改 false，同时停用此弹窗和随包 Google 集成。开启则改 true。改后预览、Commit、Push，再等部署成功；已有选择可从页脚重开。实质用途变化时增加 revision，重新征求同意。默认偏好保存 180 天。

真实上线前补齐 src/pages/privacy-policy.astro，说明实际运营者、用途、联系和数据处理。当前英语文案需随网站语言调整。这不是认证 CMP，不自动保证法律合规；也不管理手动添加的其它脚本或 Turnstile。Google Ads 转化事件需要单独配置，标签加载不等于转化追踪完成。

## 按需 server 与平台切换

只有明确需要时把 output 改 server，config/deployment.mjs 懒加载对应适配器。默认 static 不需要适配器。当前随包独立询盘函数仅支持 static；server 站请实现原生服务端路由，不混用两个路由机制。

Vercel：安装与 Astro 7.4.7 相容的 @astrojs/vercel（本次核对 11.0.20），提交 package.json 和锁文件，设 output=server、deployTarget=vercel。保留 Vercel 框架自动输出配置，不强制 dist。

Cloudflare：安装相容的 @astrojs/cloudflare（本次核对 14.4.6）及 Wrangler（4.125.0），设 output=server、deployTarget=cloudflare。仅在此分支将 config/cloudflare-server/wrangler.jsonc.example 复制到网站根目录为 wrangler.jsonc，再按目标 Worker 修改。使用 Workers Git 构建 `npm run build`、部署 `npx wrangler deploy`，分别配置构建环境和运行时 bindings/secrets。不要照搬旧 Pages _worker.js 路径。可能启动模拟运行时的构建应由用户执行或明确授权。

只切平台时保持 output 和内容源。同步文件与 SITE_OUTPUT / DEPLOY_TARGET 覆盖、询盘函数入口、环境变量、钩子、重定向和域名；新平台预览通过再迁移域名，保留原部署回滚。生产域名不变就保持 site，不改成临时预览地址。

## 已有检查与剩余验收

`npm test` 检查部署选择、SEO、同意控制、内容客户端和询盘代理；脱敏数据在 tests/fixtures。`npm run build` 检查静态生成。真实 CMS、通知、云端函数、DNS、浏览器交互和视觉效果需要实际验收，单元测试不能代替。

开发/审核可再执行 `npm run check` 做类型检查，`npm run test:builds` 在临时目录运行七种脱敏静态构建（含英语/德语），检查真实译文路由、SEO、切换链接及生成文件中没有测试密钥；另检查不支持的多语言配置和字典缺项会阻止构建。不会连接真实 CMS 或启动预览服务器。依赖升级后同步 public/third-party-licenses.txt 中的完整声明。

依据：[Astro Vercel](https://docs.astro.build/en/guides/deploy/vercel/)、[Astro Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)、[Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)。
