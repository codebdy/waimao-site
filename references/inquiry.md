# static + RXCMS 询盘函数

这是可复制、可测试的代理示例，**尚未做客户 RXCMS / 邮件 / 云平台真实联调**。开发 skill 时不要求客户凭证；具体客户网站发布前再取得测试环境、允许提交的表单和收件人，按下文验收。后端源码不随 skill 分发，也没有在本次任务中修改后端。

## 三个独立配置

```js
output: 'static',
deployTarget: 'vercel', // 或 cloudflare
content: { source: 'local', locale: 'en' }, // 也可以 rxcms / wordpress
inquiry: { provider: 'rxcms', turnstileSiteKey: '客户自己的公开 site key' },
```

示例值不能直接上线；由实施者填真实公开标识。inquiry 默认 none，此时不生成函数或真实表单。无需因为询盘切换全站 server。随包函数生成器仅用于 static；已有 server 项目应复用原生服务端路由和正确运行时 secrets，不能强行套用静态函数目录。

修改后在**生成的网站根目录**执行 `npm run configure:inquiry`，然后提交它生成的源码。构建前检查配置与生成文件一致；平台切换、关闭功能后也运行一次。脚本只修改固定路径中的自身生成文件，遇到用户自有同名文件会停止，避免覆盖已有接口。SITE_OUTPUT / DEPLOY_TARGET 环境覆盖也参与检查。

| 平台 | 生成入口 | 托管方式 |
| --- | --- | --- |
| Vercel | api/inquiry.js，Web Request/Response handler | Astro 静态输出 + 独立 Vercel Function，Git 导入部署 |
| Cloudflare Pages | functions/api/inquiry.js；public/_routes.json 仅包含 /api/inquiry | Pages Git 集成，Pages Function 从 context.env 读配置 |

共用实现为 src/lib/inquiry.mjs，无平台私有存储依赖。入口必须在推送前生成，不能等云平台已经发现函数后才生成。Vercel 输出目录仍是 dist；Cloudflare 的 functions 位于项目根目录，不放 dist。控制台拖拽 dist 不部署 Pages Functions。[Vercel 函数](https://vercel.com/docs/functions/runtimes/node-js)、[Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)

## 客户项目环境变量

| 函数运行时变量 | 含义 |
| --- | --- |
| RXCMS_API_BASE | RXCMS 服务 origin，不含 /api/v1 |
| RXCMS_FORM_KEY | 绑定该站、具有 forms:write 的 key；不从 PUBLIC_ 变量读 |
| RXCMS_FORM_NAME | 默认 contact，后台保存的询盘类型 |
| INQUIRY_ALLOWED_ORIGINS | 允许的网站 origin，英文逗号分隔，例如 https://www.example.com；禁止通配全部预览站 |
| TURNSTILE_SECRET_KEY | 客户 Turnstile widget 的私密 key |

另在 site.config.mjs 配 inquiry.turnstileSiteKey，公开且应与 secret 对应。Vercel 在所需 Preview/Production 环境配置；Pages 在项目的运行时变量/Secrets 中配置，不能把只有构建期的变量当作运行时已配置。RXCMS_SITE_KEY 用于内容构建，RXCMS_FORM_KEY 用于表单，分别签发和保管。

客户在 Cloudflare 控制台建立 Turnstile widget、添加正式和获准的预览域名，取得 site key / secret；Vercel 托管也可以使用 Turnstile。模板校验服务器 siteverify 成功、hostname 和 action=inquiry，不能只看前端显示通过。[服务端校验](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## 安全与行为

- 仅 POST JSON；流式限制请求 16 KiB，按字段长度/必填校验；固定后端地址与表单名，不由访客决定上游 URL。
- 显式 origin 白名单、蜜罐、Turnstile token 验证。Origin 不足以防脚本伪造，Turnstile 也不等于频率限制；生产上线再配置平台 WAF/限流，记录实际规则与阈值，不使用函数内存计数冒充跨实例限流。
- 浏览器不提供授权 key，代理不透传任意请求头、客户端伪造的 IP 或附件 ID。当前无附件上传功能。后端可能看到函数出口 IP，不能宣称后端 IP 垃圾规则识别了原始访客；需要原始 IP 时另核实平台可信头与后端代理信任链。
- 上游超时或回执损坏可能发生在保存之后，返回 saved=null，禁止自动重试 POST。客户端避免重复点击，但不提供跨请求持久化幂等保证。
- 不把上游错误正文、密钥、个人询盘或通知收件人写入公开响应/日志。样例表单的文字不承诺邮件送达。
- Turnstile 会发起独立的安全验证请求，需在客户隐私说明中如实披露；它不由 Google 同意开关管理。

## 响应语义：不能把三件事合成“成功”

当前 rxcms-server POST /api/v1/forms/{form} 成功时返回 `201 {id, ok:true, spam}`。notifyEnquiry 丢弃邮件服务返回的结果，因此代理无法知道普通询盘邮件是发送成功、额度不足还是配置缺失。**不推断、不编造该字段。**

代理将它规范化为：

```json
{"saved":true,"id":301,"spam":false,"notification":{"status":"not_reported"}}
```

spam=true 时 notification.status=skipped_spam，表示按当前后端逻辑不发送垃圾询盘通知；保存仍然成功。常见前置或上游明确拒绝为 saved=false；网络超时/无有效回执为 saved=null。浏览器可区分已保存、垃圾待审及通知未知，不能把 unknown 当成 failed 或 delivered。

若客户要求 API 返回具体的邮件发送状态，需要**另行改造并部署 RXCMS 后端契约**：区分 skipped、provider_accepted、failed，并保留已保存询盘 id。provider_accepted 仍不等于收件箱送达；送达需要邮件服务事件或收件箱证据。不要只在代理里增加一个永远为 true 的字段。当前适配器不识别未核实的新通知字段。

## 客户上线时的真实验收

先取得客户授权的测试站点、表单和测试通知收件人，再执行有限次数测试，不在 skill 开发阶段索取或发送。记录日期、代码版本、平台及环境；报告仅保留脱敏证据，不公开 key、token 或个人资料。

| 场景 | 要核对的证据 | 预期 |
| --- | --- | --- |
| 普通询盘 | HTTP 201 + id；后台同 id 内容；收件邮箱/邮件日志 | saved=true，spam=false；通知结果单独记录 |
| 明确垃圾测试 | 使用客户预先提供的测试规则样本；后台垃圾分类 | saved=true，spam=true，通知 skipped_spam；不能为测试擅改生产规则 |
| 通知失败/未配置 | 客户测试环境的设置与日志，询盘仍存在 | 保存不受通知失败影响；旧接口仍为 not_reported |
| 认证/权限失败 | 测试环境无效或无权限 key | 失败，不产生虚假成功提示 |
| 跨来源、超大请求、无效 Turnstile | 响应及无新增询盘 | 前置拒绝，不发送上游提交 |
| 超时 | 后台按测试标记确认是否保存 | 先核对后决定是否重试，不能重复自动投递 |

未取得邮件日志或收件箱证据，就把通知结果写“未验证”。当前脱敏 tests/inquiry.test.mjs 的模拟收据与 mock fetch，只验证代理决策，不是实网联调。
