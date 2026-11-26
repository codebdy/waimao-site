# 往 RXCMS 发布文章与产品

用 skill 随附的 `scripts/rxcms-publish.mjs` 把一篇文章（post）或一个产品（product）写进网站自己的 RXCMS 后台，然后读回核对。脚本只用 Node 自带模块。建站本来就装了 Node，所以不用另装 Python 或依赖。凭证只从**网站文件夹的 `.env`** 读，做法和变量名都与 kingnod-v2 相同。

只在用户明确要求发布指定内容时运行 `publish`。`check` 与 `readback` 只读，随时可以跑。static 网站要重新构建后才显示新内容。配了部署钩子时，脚本在发布成功后自动触发一次（见下文）；没配就提醒用户到平台手动重新部署（见 [deployment](deployment.md)）。

## 凭证

网站文件夹 `.env`（已被 `.gitignore` 排除）。注释单独占一行，不要写在值的后面：

```
# 服务地址，不带 /api/v1 或 /graphql
RXCMS_API_BASE=https://api.<客户域名>
# 后台「密钥管理」生成；发布需要 content:write
RXCMS_SITE_KEY=
# 可选：平台的部署钩子网址（Cloudflare Pages：Settings → Builds → Deploy hooks；Vercel：Settings → Git → Deploy Hooks）
DEPLOY_HOOK_URL=
```

- 脚本只读这三个变量，不读进程环境，也不打印。报错里出现密钥或钩子网址会替换成 `[REDACTED]` / `[DEPLOY_HOOK]`。部署钩子网址本身就是密钥，和站点 key 一样处理。
- 发布要用带 content:write 的 key。网站构建只需要 content:read，所以 Vercel / Cloudflare 构建环境里可以放同名的只读 key，本机 `.env` 放可写的那把。
- 不把 key 或钩子写进命令、文档、site.config.mjs 或聊天回复。让用户自己把它们粘进 `.env`，AI 不代填。
- 写到哪个站完全由 key 决定。第一次发布前先跑 `check`，把输出里的 `website`（后台站点名和 ID）念给用户确认是这个客户的站，再 `publish`。

## 命令

在任何位置都可以运行，路径用本次真实目录：

```
node <skill>/scripts/rxcms-publish.mjs check    --site <网站文件夹> --file <内容.json> [--update]
node <skill>/scripts/rxcms-publish.mjs publish  --site <网站文件夹> --file <内容.json> [--draft] [--update] [--no-deploy]
node <skill>/scripts/rxcms-publish.mjs readback --site <网站文件夹> --kind post|product --locale <abbr> --slug <slug>
node <skill>/scripts/rxcms-publish.mjs deploy   --site <网站文件夹>
```

- `check`：离线检查输入，再联网只读核对站点、语言、分类、作者、标签（标出哪些标签会新建）和同 slug 的已有对象。不上传、不写入。
- `publish`：先做 `check` 的全部检查，全部通过后才建标签、上传文件、写入，最后读回核对。默认新建并直接发布；`--draft` 写成草稿。
- `--update`：允许修改本站本语言下同 slug 的已有对象。只在服务端声明 `features.conditionalSet` 时按 `id + updatedAt` 条件写入；被别人改过就停（版本冲突），不覆盖。写 SEO 前会再读一次，SEO 在这期间被改过就停。修改时不改分类和作者，标签只补不删，产品 FAQ 逐条改或补、不删。产品图库和附件（媒体、顺序、说明）必须与后台一致，不一致就在任何写入前停下，请用户先在后台调整。不支持把已发布内容改回草稿，下架在后台操作。
- `--no-deploy`：一批连续发布时每篇都加上，整批发完再跑一次 `deploy`。
- 输出是 JSON：`ok`、对象 `id`、做了什么（`log`）、核对通过的项（`checked`）、不符项（`problems`）和部署结果（`deploy`）。`ok: false` 时退出码为 1，并且不触发部署。

## 输入格式

一份 JSON 只放一个语言版本。各语言分别写一份，**slug 相同**（网站按 slug 把译文对上，生成 hreflang）。路径相对这份 JSON 所在的文件夹。

文章：

```json
{
  "kind": "post",
  "locale": "es",
  "slug": "how-to-choose-a-pump",
  "title": "Cómo elegir una bomba",
  "description": "本语言的列表简介（必填）",
  "content": "Markdown 正文。图片写 ![本语言说明](./images/step-1.webp)；视频写 <video src=\"https://…/manifest/video.m3u8\" poster=\"https://…\" controls></video>",
  "cover": { "src": "./images/cover.webp" },
  "tags": [{ "base": "Industrial pumps", "name": "Bombas industriales" }],
  "category": "guides",
  "authorId": 12,
  "cta": [{ "after": "Cómo elegir el caudal", "label": "Pedir presupuesto", "text": "¿Necesita ayuda para elegir?" }],
  "seo": { "title": "…", "description": "…", "robots": "index,follow" },
  "schemaJson": { "@type": "Article" }
}
```

产品：不用 `cover / tags / authorId / cta`，改用下面这些字段。`images` 是图库，顺序就是数组顺序，至少一张。`attachments` 是 PDF 资料，`name` 是给访客看的本语言下载名。`faqs` 是常见问答。还可以填 `shortTitle`、`features`、`content2`（包装）、`content3`（交付）和 `relatedSlugs`。`category` 可选。

```json
{ "kind": "product", "locale": "en", "slug": "sample-pump", "title": "…", "description": "…", "content": "…",
  "images": [{ "src": "./images/pump-front.webp", "alt": "…" }], "category": "pumps",
  "attachments": [{ "src": "./docs/pump-datasheet.pdf", "name": "Datasheet (PDF)" }],
  "faqs": [{ "question": "What is the MOQ?", "answer": "One pallet." }],
  "seo": { "title": "…", "description": "…" } }
```

字段说明：

- `locale` 填 RXCMS 的语言代码，即 `/api/v1/config` 里的 `abbr`；`slug` 只用小写字母、数字和连字符。
- `tags`：`base` 是**基准语言**的标签名，`name` 是**本语言**标签名。基准语言版本里两者相同。各语言版本用同一组 `base`。
- `category` 是分类 slug，脚本查出本站本语言唯一的分类 ID 后写入 `categoryId`；不按名称模糊匹配，也不跨语言借用。分类不存在就停下，请用户在后台建好。
- `authorId` 必须是本站公开成员（`/api/v1/content/user`）里的 ID。作者按文章主题和成员职位、简介来选；不默认全署同一个人。
- `cta`（只用于文章）：每张询盘卡片放在小标题 `after`（`##`–`####` 的原文，在正文里必须唯一，代码块里的不算）那一节的末尾，`label` 是按钮文字，`text` 是可选说明，都用本语言。卡片存成 `<figure class="cta" data-cta="inquiry">…<a href="/contact/">按钮</a></figure>`，与 seo-rxcms 的 cta_blocks 同一格式；网站把链接换成本语言的联系页。产品页模板已有询盘入口，不放卡片。正文里不要手写卡片。
- 文章封面在 RXCMS 里只存 `coverId`，没有单独的说明字段；网站用文章标题作封面的 alt，所以 `cover` 只需要 `src`。
- `schemaJson` 可选，原样写入。

## 门禁（任何一项不过，都在建标签、上传和写入之前停下）

- `title`、`description`（列表简介）、`content`、`seo.title`、`seo.description` 必填。脚本只能检查是否非空，**看不出语言**：发布前 AI 必须逐项确认这些字段、标签名、图片说明、FAQ、附件名和 CTA 文字都是本语言写的，不能把英文原文填进其他语言版本。
- 文章：`tags` 至少一个，标签按下一节处理。`category` 与 `authorId` 必填，并且能在本站本语言查到。
- 图片：文章封面必填，产品至少一张图库图，二者都必须是本地文件。图库图和正文图都要有本语言 alt。只收 WebP / JPEG，并按文件内容核对格式（改扩展名不算数），PNG 先转 WebP。不能超过服务端图片上限（`limits.maxImageUploadBytes`，默认 1 MiB）。正文只认 `![说明](地址)` 和 `<img>` 两种写法，引用式 `![说明][名字]` 会被拦下。产品的 `features / content2 / content3` 里不放图片或视频。
- 视频：正文里的 `<video>` 必须用已托管的 https 地址（例如在 RXCMS 后台上传后得到的 Cloudflare Stream 清单 `…/manifest/video.m3u8`）。本脚本不上传视频。`iframe` 和 Markdown 链接形式的 `.mp4` 都会被拦下。
- 附件：只收内容确实是 PDF 的文件。
- 本站本语言已有同 slug 对象时，没带 `--update` 就停下；对象在回收站时也停下。

## 标签：没有就自动新建

- 先在基准语言里按 `base` 原名找标签，找到就用；再在本语言里找 `sourceTagId` 指向它的译名标签，名称必须与 `name` 一致。
- 缺什么就建什么：基准标签不存在时先建基准标签，再建本语言译名标签（`sourceTagId` 指向基准标签）。写法同 DeepClaw 翻译客户端的 `upsertOneTag`。建好后用公开接口读回，确认名称和源标签都对。
- **有歧义就停下请用户确认，不猜**：只差大小写的同名标签、后台已有的译名和输入不同、本语言名称已被另一个标签用掉、非基准语言的 `name` 和 `base` 相同（没翻译），以及同一基准标签在本语言有多个译名。

## 上传与写入

- 图片走后台同一个代理端点 `POST /api/media/image-upload`，站点由 key 决定。PDF 走后台给非图片文件用的直传链路：`POST /api/media/upload-credentials`（只带 `name`、`mimeType`、`size`，和后台一样），然后按返回的 PUT 地址上传字节（不带 key），再 `POST /api/media/{id}/confirm`（依据 rxcms-server `media_handler.go`）。签名上传地址不会出现在输出里。
- 上传名是「原文件名 + 内容哈希」：重跑时后台已有同名、字节相同且已确认的媒体就直接复用，不会重复上传。正文里的本地图片地址会换成媒体的公开地址。
- 新建对象用一次 `upsertOne<Post|Product>`，带站点、语言、slug、状态、分类、作者和本语言标签，SEO 放在 `meta.sync` 里一起写；产品的 FAQ 用 `faqs.add` 一起写。产品随后为每张图写一条 `upsertOneProductMedia`，为每份 PDF 写一条 `upsertOneProductAttachment`（`altText` = 下载名）。
- 所有写请求只发一次，不自动重试。新建请求结果不明时，先 `readback` 查清后台，不要直接重跑 `publish`。对象建好之后，如果后续某一步写入失败，脚本照样做完整读回，并在 `problems` 里列出没写进去的部分。

## 读回

- 管理端逐项比对：slug、标题、简介、正文（含询盘卡片数量和位置）、状态、分类、作者、标签、封面、图库与附件（媒体、顺序、说明）、FAQ、SEO（含 `metaId` 已挂接）和 schemaJson。
- 匿名取回封面、正文图、图库图和 PDF，字节哈希必须与本地文件一致；已托管的视频与海报至少要能取到。
- 已发布的还要查公开接口：内容可读，标签名称和源标签 ID 正确，作者正确；产品附件的公开地址不能是会过期的签名地址（否则网站构建会失败，说明后台存储还没配置公开投递域名）。网站构建读的就是公开接口。
- 读回不符时不自动回滚、不重发，也不触发部署，把 `problems` 原样报告给用户。

## 部署钩子

`.env` 里配了 `DEPLOY_HOOK_URL`，脚本在发布并读回通过后 POST 一次这个网址，触发平台重新构建。草稿、读回不符和带 `--no-deploy` 的发布都不触发。没配时输出会提醒用户到平台手动重新部署。变量名不用 kingnod-v2 的 `VERCEL_DEPLOY_HOOK`：本 skill 默认推荐 Cloudflare，钩子网址在两个平台上用法相同。

## 不在本脚本范围

上传正文视频（Cloudflare Stream）、跨语言图库镜像、建分类、作者自动分配、批量计划、审核与冻结流水线都不在范围内。需要时在后台操作；要给脚本加这些能力，按下一节做。

## 新增上传或写入能力：照管理后台的实际链路做

给脚本加新的媒体类型、字段或对象之前，先查清 RXCMS 管理后台（rxcms-frontend 编辑器与后台页面）对同一种内容实际怎么做，再动手：

1. **先调查，后设计**：查清后台调的接口、带的参数、服务端返回的凭证与上传协议、确认步骤、内容实际存在哪里，以及最终写进字段的是什么地址。每条结论都标出处（rxcms-frontend / rxcms-server 的文件和行号，或只读接口返回的字段）。
2. **对照一条真实记录**：用站点 key 只读查一条后台已有的同类记录，确认和调查结论一致。
3. **按同一条路实现**：参数、存储方式、上传协议都照后台。不加后台不发的参数；服务端返回什么凭证就按什么上传，不自己选存储或协议。
4. **走不通按 bug 处理**：后台能做、脚本这条路走不通时，定位到具体提交和行（例如站点 key 与用户会话的鉴权差异），连同证据交给用户决定修不修。不改设计绕开，不写兼容补丁掩盖，不提议改生产后台迁就脚本。
5. **只读调查别人的仓库**：不切换 rxcms-server、rxcms-frontend 的当前分支；需要改服务端时经用户同意再做。

（教训：正文视频曾按 R2 设计，实际后台存在 Cloudflare Stream，而且后台本来就能正常上传。）
