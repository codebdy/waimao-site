# 上传到 GitHub

[← 返回首页](../README.md) · 上一步：[预览和修改](04-preview.md) · 下一步：[发布到 Cloudflare（推荐）](06-cloudflare.md) 或 [发布到 Vercel](07-vercel.md)

**这篇适合：** 网站在电脑上看着满意了，准备发布的人。

## 为什么要先上传 GitHub

GitHub 相当于网站代码的“云盘”。上传后，Cloudflare 或 Vercel 会从这里取代码、自动生成网站。以后你每次上传修改，网站都会自动更新。

**上传到 GitHub ≠ 网站上线。** 上线是下一篇的事。

## 第一步：注册 GitHub

1. 打开 [GitHub 注册页](https://github.com/signup)，用邮箱注册（已有账号直接登录）。
2. 去邮箱点 GitHub 发来的验证链接。收不到就看看垃圾邮件。
3. 按 GitHub 提示开启双重验证，**把恢复码保存好**。

**完成标志：** 能登录 GitHub，右上角能看到你的头像。

## 第二步：安装 GitHub Desktop

GitHub Desktop 是一个用按钮操作的软件，不用敲命令。

1. 从 [GitHub Desktop 官网](https://desktop.github.com/) 下载安装。
2. 打开后选择登录 GitHub.com，在弹出的浏览器里登录、授权，再回到 Desktop。
3. 按提示填写你的名字和邮箱。

## 第三步：把网站加进 Desktop

> **只上传 `website` 文件夹**，不要上传整个 `my-export-site`（里面有 skill 和你的原始资料）。

1. 在 Desktop 点菜单 **File → Add local repository**，选择 `my-export-site/website` 文件夹。
2. 如果提示“这个文件夹还不是仓库”，点提示里的 **create a repository**。
   - 弹出的窗口里，Name 填 `website`，Local path 选 `my-export-site`（也就是 website 的上一层）。
   - 确认最后的路径还是 `my-export-site/website`，没有多套一层。
   - 拿不准就让 AI 帮你：“请只在 website 文件夹里初始化 Git 仓库”。
3. 看左边 **Changes** 列表，应该有 `src`、`package.json`、`site.config.mjs` 这些。**如果看到 `.env`、`node_modules`、`dist`，先停下来问 AI**，这些不能上传。

## 第四步：提交并上传

1. 左下角 Summary 写一句说明，比如“网站第一版”，点 **Commit to main**。
   - 这一步只是在你电脑上存了一个版本，还没上传。
2. 点上方的 **Publish repository**。
   - 名字可以改成好认的，比如 `company-website`。
   - **勾选 Keep this code private**（代码私有）。代码私有不影响网站被访问。
3. 点 **Publish Repository** 完成上传。

## 完成标志

在 Desktop 点 **Repository → View on GitHub**，浏览器里能看到你的仓库，最外层就有 `package.json`、`src` 等文件。

## 以后每次修改怎么上传

AI 改完、你预览满意后：打开 Desktop → 写 Summary → **Commit to main** → **Push origin**。

记住：**Commit 是存档，Push 才是上传。** 只 Commit 不 Push，网站不会更新。

下一步：选一个平台发布 → [Cloudflare（推荐，免费版就够用）](06-cloudflare.md) 或 [Vercel](07-vercel.md)（选一个就够了）
