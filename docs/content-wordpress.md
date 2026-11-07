# WordPress 站（实验功能）

[← 返回首页](../README.md) · 其他方式：[纯静态站](content-static.md) · [RXCMS 站](content-rxcms.md)

**这篇适合：** 已经有一个 WordPress 网站或后台，想继续在 WordPress 里写文章的人。

> ⚠️ **这是实验功能，目前能力有限。** 没有现成 WordPress 的话，建议选[纯静态站](content-static.md)或 [RXCMS 站](content-rxcms.md)。

## 它是什么

内容继续在你原来的 WordPress 后台管理。新网站的外观由这个 skill 制作，从 WordPress 读取内容生成页面。**不是 WordPress 主题**，原来的 WordPress 后台照常运行。

## 现在能做什么、不能做什么

| 能做 | 暂时不能做（需要定制） |
| --- | --- |
| 读取 WordPress 的**普通文章**，显示在网站的 Articles 栏目 | 读取 WooCommerce 等插件里的**产品** |
| 文章里的图片、格式正常显示 | WordPress 的“页面”自动变成网站页面 |
| 草稿、私密文章、加密文章不会被公开 | 多语言插件的翻译 |
| | 原来插件提供的表单、弹窗等功能 |

产品部分要在网站里单独做（像纯静态站一样让 AI 写），或者联系作者定制。

## 需要准备什么

| 名称 | 是什么 |
| --- | --- |
| **WordPress 地址** | 你的 WordPress 网址后面加 `/wp-json/`，比如 `https://blog.yourcompany.com/wp-json/` |
| **用户名 + 应用密码**（可选） | 只有文章不公开时才需要。应用密码在 WordPress 后台 **用户 → 个人资料 → 应用密码** 里生成，**不是你的登录密码** |

> ⚠️ 应用密码不要发到 AI 聊天框里。

## 怎么设置

1. 告诉 AI：“我要从 WordPress 读取文章，请告诉我要填什么、填在哪里。”
2. 在网站文件夹的 `.env` 文件里填（AI 会告诉你怎么建这个文件）：
   ```text
   WORDPRESS_API_BASE=https://blog.yourcompany.com/wp-json/
   WORDPRESS_USERNAME=用户名（没有就留空）
   WORDPRESS_APPLICATION_PASSWORD=应用密码（没有就留空）
   ```
3. 在 Vercel 或 Cloudflare 的环境变量里填同样的内容，重新部署。

## 完成标志

网站的 Articles 栏目里显示的是你 WordPress 里的文章。

## WordPress 发了新文章，网站怎么更新

和 RXCMS 一样，要到 Vercel 或 Cloudflare 点一次 **Redeploy**。见[日常更新](08-update.md)。

## 常见问题

- **部署失败，提示 WordPress 401/403？** 用户名或应用密码不对，或者你的主机、安全插件拦截了登录信息。把错误发给 AI。
- **文章没出来？** 只有“已发布”的公开文章会显示。
