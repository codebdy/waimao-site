# 注册域名并绑定到网站

[← 返回首页](../README.md) · 相关：[发布到 Vercel](07-vercel.md) · [发布到 Cloudflare](06-cloudflare.md)

**这篇适合：** 网站已经用平台送的网址（`xxx.vercel.app` 或 `xxx.pages.dev`）发布成功，想换成自己域名（比如 `www.yourcompany.com`）的人。

**建议顺序：** 先用平台网址确认网站一切正常，再买域名、绑定。

## 先搞懂三个词

| 词 | 意思 |
| --- | --- |
| **域名** | 网址本身，比如 `yourcompany.com`，按年付费 |
| **域名商** | 卖域名的地方，你在哪买，域名就在哪管理 |
| **DNS 解析** | 告诉全世界“这个域名指向哪个网站”的设置。绑定域名就是改这里 |

还有一个常见区别：`yourcompany.com` 叫**根域名**，`www.yourcompany.com` 叫 **www 域名**。建议两个都绑上，访客输哪个都能打开。

## 第一步：选域名、买域名

**怎么选：**
- 外贸站优先 **.com**，海外客户最认可
- 用公司名或品牌名，短一点、好拼写，不要用拼音缩写堆在一起
- 避免连字符和数字

**在哪买（任选一家）：**

| 域名商 | 说明 |
| --- | --- |
| [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) | 按成本价卖，没有加价；**如果网站发布在 Cloudflare，最省事**，DNS 自动在一起 |
| [Namecheap](https://www.namecheap.com/) | 海外老牌，界面简单 |
| [Porkbun](https://porkbun.com/) | 价格透明 |
| [Vercel Domains](https://vercel.com/domains) | 网站在 Vercel 时，可以直接在 Vercel 买，自动配好 |
| [阿里云](https://wanwang.aliyun.com/) / [腾讯云](https://dnspod.cloud.tencent.com/) | 中文界面、可用支付宝；国内域名商要求做**域名实名认证**（不是 ICP 备案） |

**注意：**
- 看清楚**续费价格**，有的首年便宜、第二年很贵
- 打开**自动续费**。域名过期后网站和公司邮箱都会失效，还可能被别人抢注
- 注册信息填真实的，账号和密码保存好，最好用公司邮箱注册

> **要不要 ICP 备案？** 不需要。备案只针对服务器放在中国大陆的网站，Vercel 和 Cloudflare 的服务器都在海外。

## 第二步：绑定到网站

只看你用的那个平台。

### 网站在 Vercel

1. 打开 Vercel 控制台，进入你的网站项目，点 **Settings → Domains**。
2. 点 **Add Domain**，输入你的域名（比如 `yourcompany.com`），按提示把 `www.yourcompany.com` 也加上。Vercel 会建议一个跳转到另一个，保持默认即可。
3. Vercel 会显示需要添加的 DNS 记录，一般是：
   - 根域名：一条 **A** 记录
   - www：一条 **CNAME** 记录
4. 登录你买域名的地方，找到“DNS 解析”或“DNS 记录”，**按 Vercel 页面上显示的值**逐条添加。不要照抄网上别人的数值，每个项目可能不同。
5. 回到 Vercel 等待，状态变成 **Valid Configuration** 就成功了。

在 Vercel 买的域名会自动配置，跳过第 3、4 步。

[Vercel 官方说明：添加自定义域名](https://vercel.com/docs/domains/working-with-domains/add-a-domain)

### 网站在 Cloudflare

**最简单的情况：域名也在 Cloudflare 买，或已经把域名加到 Cloudflare。**

1. 打开 Cloudflare 控制台 → **Workers & Pages** → 选你的网站项目。
2. 点 **Custom domains → Set up a domain**，输入域名，点 **Continue**。
3. Cloudflare 会自动添加 DNS 记录，确认即可。www 和根域名分别添加一次。

**域名在别家买的：**
- **只绑 www**：先在 Cloudflare 按上面第 1、2 步添加 `www.yourcompany.com`，再到域名商那里加一条 **CNAME** 记录，名称填 `www`，值填你的 `xxx.pages.dev`。**顺序不能反**，先在 Cloudflare 添加，否则会打不开（报 522 错误）。
- **要绑根域名**：需要把域名的 DNS 服务器（Nameservers）改成 Cloudflare 提供的那两个。这一步会把整个域名的解析搬到 Cloudflare，**改之前先确认公司邮箱的记录会一起迁移**，拿不准就让 AI 一步步带你做。

[Cloudflare 官方说明：Pages 自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## ⚠️ 最容易出事的地方：公司邮箱

如果这个域名已经在用公司邮箱（比如 `sales@yourcompany.com`），DNS 里会有 **MX** 记录和一些 **TXT** 记录。

- **只添加网站需要的记录，不要删除或修改已有的 MX、TXT 记录**
- 改 Nameservers（DNS 服务器）之前，确认原有记录都已经复制过去
- 改完后给自己的公司邮箱发一封测试邮件，确认还能正常收发

## 第三步：绑定后告诉 AI

对 AI 说：

```text
网站已经绑定域名 https://www.yourcompany.com，请更新网站地址配置。
```

AI 会更新网站里的正式地址（关系到 Google 收录），然后你 Commit、Push 重新发布。

资料都已换成真实内容的话，接着看 [SEO](seo.md)，打开 Google 收录并提交 Search Console。

## 完成标志

- 你绑定的网址都能打开网站（两个都绑了的话，让 AI 帮你定一个主网址，另一个自动跳转过去）
- 地址栏显示小锁头（SSL 证书生效，网址以 https 开头）。SSL 证书由平台**自动配置**，不用自己买，一般绑定后几分钟到几小时生效
- 公司邮箱收发正常

## 常见问题

- **绑完还打不开？** DNS 生效需要时间，一般几分钟，最长可能一两天。先等一等，再检查记录有没有填错。
- **显示“不安全”或证书错误？** 刚绑定时证书还在签发，等一会儿。超过一天还不行，把平台 Domains 页面的提示截图发给 AI。
- **平台提示记录冲突？** 同一个名称（比如 www）上有旧的 A 或 CNAME 记录，删掉旧的网站记录再加新的。**不要动 MX 记录。**
