# 发布到 Cloudflare

[← 返回首页](../README.md) · 上一步：[上传到 GitHub](05-github.md) · 另一个选择：[发布到 Vercel](07-vercel.md)

**这篇适合：** 代码已经上传到 GitHub，选择用 Cloudflare 发布的人。**推荐新手选 Cloudflare**，Vercel 和 Cloudflare 选一个就行。

> 💰 **不用买服务器，免费版就够用。** Cloudflare 的免费版就够一个外贸网站起步使用，公司网站也可以用，访问快、自带 SSL 证书（网址以 https 开头，访问更安全）。拿不定主意选哪个平台，就选 Cloudflare。

## 发布前先让 AI 做一件事

对 AI 说：“我要发布到 Cloudflare，请把网站配置改好并告诉我要不要重新上传。”

AI 会把 `site.config.mjs` 里的发布平台设成 Cloudflare。改完后按[上传到 GitHub](05-github.md#以后每次修改怎么上传)的方法 Commit 和 Push。

## 第一步：注册 Cloudflare

1. 打开 [Cloudflare 注册页](https://dash.cloudflare.com/sign-up)，**推荐点页面上的 Google 按钮，用谷歌账号注册**，以后也用它登录。也可以用 GitHub 账号或邮箱注册。
2. 用邮箱注册的，去邮箱点验证链接；然后登录控制台。

这一步**不需要**把域名转到 Cloudflare，也不需要改公司的 DNS。先用 Cloudflare 送的网址就行。

## 第二步：创建 Pages 项目并连接 GitHub

1. 在左侧菜单找到 **Workers & Pages**，点 **Create application**。
2. **选择 Pages**，再点 **Connect to Git**。
   - ⚠️ 不要选 Workers。纯静态站用的是 Pages，选错了后面的设置都对不上。
3. 选 GitHub，按提示授权 Cloudflare 访问你的网站仓库，然后选中这个仓库。看不到私有仓库时，回 GitHub 检查授权是否包含这个仓库。

## 第三步：设置构建

| 设置项 | 填什么 |
| --- | --- |
| Production branch | `main`（你上传代码的分支） |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 保持默认（`package.json` 就在仓库最外层时） |

再点开 **Environment variables（环境变量）**，添加一个：

| 变量名 | 值 |
| --- | --- |
| `NODE_VERSION` | `24.18.1` |

默认的纯静态站只需要这一个。用了 RXCMS、WordPress 或询盘表单时，按 AI 给你的清单再加。

最后点 **Save and Deploy**。

## 完成标志

构建记录显示成功，打开 Cloudflare 给你的网址（类似 `xxx.pages.dev`）能看到网站。

## 发布之后

- 把这个网址告诉 AI，比如“网站发布在 `https://xxx.pages.dev`，请更新网站地址配置”，然后 Commit、Push。
- 以后每次 Push 到 GitHub，Cloudflare 会**自动重新发布**。
- 要用自己的域名，看[日常更新和域名](08-update.md)。

**不要用“拖拽上传文件夹”的方式发布**：那样不能自动更新，用了询盘表单的网站还会导致表单失效。一直用连接 GitHub 的方式。

## 失败了怎么办

打开失败的那次构建记录，把**第一条红色错误**复制给 AI（先遮住密码、密钥）。

下一步：[日常更新和域名](08-update.md)
