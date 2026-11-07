# 日常更新

[← 返回首页](../README.md) · 相关：[注册域名并绑定](09-domain.md)

**这篇适合：** 网站已经发布，以后要改内容、加产品、换平台的人。

## 改内容的固定流程

```text
告诉 AI 改什么 → 自己预览确认 → GitHub Desktop 里 Commit → Push → 平台自动发布
```

1. 打开 AI 工具，进入原来的 `my-export-site` 项目，叫出 export-site，说清楚要改什么。
2. 按[预览和修改](04-preview.md)在电脑上看一下效果。
3. 打开 GitHub Desktop，确认当前仓库是你的网站，写一句 Summary，点 **Commit to main**，再点 **Push origin**。
4. 去 Vercel 或 Cloudflare 控制台，能看到一次新的部署。等它显示成功，刷新网站就是新内容了。

**完成标志：** 刷新网站后能看到新改的内容。

**第一次建议亲手走一遍**：让 AI 改一处你能认出的文字，按上面四步发布，确认自动更新是通的。

## 网站没变化？依次检查

1. GitHub Desktop 里是不是只 Commit 了、忘了 **Push**
2. 平台上这次部署有没有失败（失败就把第一条红色错误发给 AI）
3. 浏览器缓存：按 `Ctrl + F5` 强制刷新，或用无痕窗口打开

## 用了 RXCMS 或 WordPress 后台的网站

在后台改了内容，**网站不会自动变**。因为网站是提前生成好的，需要重新生成一次：

- **简单办法**：到 Vercel 或 Cloudflare 控制台，找到最新一次部署，点 **Redeploy**（重新部署）。
- **省事办法**：让 AI 帮你配置“后台一发布就自动重新部署”（需要配置部署钩子，AI 会说明具体步骤）。

## 加新页面、新产品

直接告诉 AI，比如“加一个 OEM 定制服务页面”“新增 3 款产品，资料在 资料/新品 文件夹”。之后流程同上。

## 换发布平台（Vercel ↔ Cloudflare）

一般不需要换。真要换的话：

1. 告诉 AI：“我要把网站从 Vercel 换到 Cloudflare”，它会改好配置，你 Commit、Push。
2. 按新平台的文档（[Vercel](06-vercel.md) / [Cloudflare](07-cloudflare.md)）重新连接**同一个** GitHub 仓库。
3. 用过的环境变量（CMS 密钥、询盘设置）要在新平台重新填一遍。
4. 先用新平台送的网址确认一切正常，再把域名[改绑](09-domain.md)过去。
5. 旧平台先别删，等新平台稳定运行几天再删，出问题还能切回去。

## 换了电脑怎么办

代码都在 GitHub 上。新电脑上：
1. 安装 Node.js、AI 工具、GitHub Desktop。
2. 在 GitHub Desktop 里用 **File → Clone repository** 把网站仓库下载下来。
3. 按[安装](01-install.md)重新放好 skill，就能继续让 AI 修改。
