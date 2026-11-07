# 发布到 Vercel

[← 返回首页](../README.md) · 上一步：[上传到 GitHub](05-github.md) · 另一个选择：[发布到 Cloudflare](07-cloudflare.md)

**这篇适合：** 代码已经上传到 GitHub，选择用 Vercel 发布的人。Vercel 和 Cloudflare 选一个就行。

## 发布前先让 AI 做一件事

对 AI 说：“我要发布到 Vercel，请把网站配置改好并告诉我要不要重新上传。”

AI 会把 `site.config.mjs` 里的发布平台设成 Vercel。改完后按[上传到 GitHub](05-github.md#以后每次修改怎么上传)的方法 Commit 和 Push。

## 关于费用

Vercel 的免费版（Hobby）**只限个人非商业用途**。公司外贸网站属于商业用途，应该选付费的 Pro 套餐。[官方说明](https://vercel.com/docs/plans/hobby)

## 第一步：注册并连接 GitHub

1. 打开 [Vercel 注册页](https://vercel.com/signup)，选 **Continue with GitHub**，用 GitHub 账号登录授权。
2. 进入控制台后点 **Add New → Project**（或直接打开 [vercel.com/new](https://vercel.com/new)）。
3. 如果看不到你的网站仓库，点提示安装 **Vercel GitHub App**，并允许它访问你的网站仓库。

## 第二步：导入并设置

1. 找到你的网站仓库，点 **Import**。
2. 确认下面这些设置（大部分会自动填好）：

| 设置项 | 填什么 |
| --- | --- |
| Framework Preset | Astro |
| Root Directory | 保持默认（`package.json` 就在仓库最外层时） |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |
| Node.js Version | 24.x |

3. **Environment Variables（环境变量）**：默认的纯静态站**不用填**。用了 RXCMS、WordPress 或询盘表单时，按 AI 给你的清单填。
4. 点 **Deploy**。

## 完成标志

等一两分钟，页面显示部署成功（Congratulations），点预览图或网址能打开你的网站。网址类似 `xxx.vercel.app`。

## 发布之后

- 把这个网址告诉 AI：“网站发布在 https://xxx.vercel.app，请更新网站地址配置。”然后 Commit、Push。
- 以后每次 Push 到 GitHub，Vercel 会**自动重新发布**，不用再来这里操作。
- 要用自己的域名，看[日常更新和域名](08-update.md)。

## 失败了怎么办

打开失败的那次部署，看 **Build Logs**，把**第一条红色错误**复制给 AI（先遮住密码、密钥）。不要自己乱改设置反复试。

下一步：[日常更新和域名](08-update.md)
