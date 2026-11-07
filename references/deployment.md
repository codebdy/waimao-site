# Vercel / Cloudflare 网站部署

生成项目的 README 必须包含本项目可执行的发布步骤，不只给本文件链接。先询问平台；未决定时可保持 static + 未指定平台。上传或实际部署前沿用已有授权，缺少授权则让用户确认目标账号、项目及环境。

## 配置约定

starter 中 `site.config.mjs` 持久保存 `output`（static/server）和 `deployTarget`（null/vercel/cloudflare）。可用构建环境变量 `SITE_OUTPUT`、`DEPLOY_TARGET` 覆盖，两者独立。`config/deployment.mjs` 校验枚举并只在 server 模式加载选定适配器，避免静态站意外拉起适配器运行时。

配置文件中保存非敏感设置；不要提交 Token。环境变量比文件优先，切换平台时尤其检查旧平台残留覆盖。这两个变量必须在执行构建的进程中设置，不能只添加到 Worker 的运行时 bindings。

| output | 平台 | 适配器 | 交付产物 / 平台 |
| --- | --- | --- | --- |
| static | Vercel | 无 | dist，Vercel 静态托管 |
| static | Cloudflare | 无 | dist，Cloudflare Pages |
| server | Vercel | @astrojs/vercel | Vercel build output，保留框架默认输出设置 |
| server | Cloudflare | @astrojs/cloudflare | Cloudflare Workers，按锁定适配器生成配置部署 |

静态模式是纯文件托管，不需要为了切换平台添加服务端适配器。server 平台切换是构建时选择，不能把已生成的函数产物直接搬到另一平台。

上述 static 描述针对网页。需要实时询盘时，可以叠加独立 Vercel Function / Pages Function，仍保持 output=static。随包 inquiry.provider 与 content.source 独立，按 [询盘说明](inquiry.md) 配置并在推送前运行 `npm run configure:inquiry`；构建前检查防止平台选择与函数入口不一致。纯 static 默认不生成函数。

## Vercel

1. 用户授权后将网站源码推送至其 Git 仓库，在 Vercel 导入；Root Directory 选择网站根目录。
2. 使用 Astro framework preset，Install Command 为 `npm ci`，Build Command 为 `npm run build`。使用模板要求的兼容 Node 版本。
3. static 模式 Output Directory 为 `dist`；server 模式保留 Astro/Vercel 自动输出配置，不强行填 dist 来覆盖适配器产物。
4. 默认在 site.config.mjs 设置 deployTarget=vercel 和所选 output，不要求新手重复配置环境覆盖。已有 SITE_OUTPUT / DEPLOY_TARGET 时检查其优先级；添加 CMS 等必要的服务端凭据，分别配置 Preview / Production。
5. 先预览、验证，再绑定正式域名并更新 site URL。部署钩子可用于 static CMS 重建；不要公开钩子 URL。

## Cloudflare Pages：static

1. 在 Workers & Pages 创建 Pages 项目并连接网站 Git 仓库。Root Directory 选择网站根目录。
2. Build Command `npm run build`，输出目录 `dist`；文件配置 deployTarget=cloudflare、output=static。构建环境设置兼容 Node 版本和所需 CMS 构建密钥；模式/平台环境覆盖只在确有需要时设置。
3. 使用 Git 集成部署，或用户授权后上传构建好的 dist。不要上传源码目录代替构建产物。
4. 有真实 404.html，不配置全站 SPA 200 回退。需要重定向 / 响应头时生成 Pages 支持的配置，并核实路径和规则。

## Cloudflare Workers：server

1. 设置 `output: 'server'`、`deployTarget: 'cloudflare'`，安装与当前 Astro 相容的 @astrojs/cloudflare 和 Wrangler 并提交锁文件。
2. 采用当前适配器的 Workers 部署方式。仅在此分支将 config/cloudflare-server/wrangler.jsonc.example 复制到网站根目录为 wrangler.jsonc，修改项目名；绑定、兼容标志和实际账户配置按项目添加。静态 Pages 不复制该示例。不要复制旧版 Pages 的 `_worker.js` 输出路径。
3. 构建读取文件中的 output=server、deployTarget=cloudflare；若使用 SITE_OUTPUT / DEPLOY_TARGET 覆盖，确保构建进程实际取得它们。用 `npm run build` 生成适配器产物；在 Workers Git 集成配置相同构建命令及 `npx wrangler deploy` 部署命令，或由已授权用户在构建后执行该部署命令。
4. 通过平台 secret / bindings 配置运行时凭据。构建期密钥与运行时密钥分开核对，不能假定配置一边就会同步另一边。
5. 当前适配器配置与 Node API 兼容性必须核实。只用标准 fetch 的内容层更容易迁移；文件系统写入、邮件 SDK、图片服务、KV/D1 等需要逐项适配。

## 切换流程

保持业务页面不变，修改 deployTarget（及必要的构建变量）。如果只是换平台，保留 output。安装所需 server 适配器并更新锁文件；迁移运行时 bindings、密钥、域名、构建钩子、重定向和 headers。做目标构建与预览验收后再切 DNS，保留原部署用于回滚。项目 README 更新为当前实际配置。

WordPress API 内容源同样使用这套 Astro 前端部署流程，后台宿主保持独立，认证变量见 [wordpress](wordpress.md)。Vercel / Cloudflare 账号、域名与密钥由用户配置，不能在 skill 内硬编码。

当前行为以 [Vercel 部署指南](https://docs.astro.build/en/guides/deploy/vercel/)、[Cloudflare 部署指南](https://docs.astro.build/en/guides/deploy/cloudflare/)、[Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) 为准。不要把本说明当作绕过版本差异的依据。
