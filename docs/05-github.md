# 上传到 GitHub

[← 返回首页](../README.md) · 上一步：[预览和修改](04-preview.md) · 下一步：[发布到 Cloudflare（推荐）](06-cloudflare.md) 或 [发布到 Vercel](07-vercel.md)

**这篇适合：** 网站在电脑上看着满意了，准备发布的人。

## 为什么要先上传 GitHub

GitHub 相当于网站代码的“云盘”。上传后，Cloudflare 或 Vercel 会从这里取代码、自动生成网站。以后你每次上传修改，网站都会自动更新。

**上传到 GitHub ≠ 网站上线。** 上线是下一篇的事。

## 第一步：注册 GitHub

1. 打开 [GitHub 注册页](https://github.com/signup)，**推荐点 Continue with Google，用谷歌账号注册**，以后也用它登录（已有账号直接登录）。没有谷歌账号也可以用邮箱注册。
2. 按页面提示完成验证；用邮箱注册的，去邮箱点 GitHub 发来的验证链接，收不到就看看垃圾邮件。
3. 按 GitHub 提示开启双重验证，**把恢复码保存好**。

**完成标志：** 能登录 GitHub，右上角能看到你的头像。

## 第二步：下载安装 GitHub Desktop

GitHub Desktop 是 GitHub 官方的桌面软件，用按钮上传，不用敲命令。

1. 打开 [GitHub Desktop 官网](https://desktop.github.com/)，点页面中间的下载按钮（Windows 显示 **Download for Windows**，苹果电脑显示 **Download for macOS**）。
2. 安装：
   - **Windows**：双击下载好的 `GitHubDesktopSetup` 文件，它会自动装好并打开，中间不用点任何选项。
   - **苹果电脑**：双击下载的压缩包解压，把 **GitHub Desktop** 拖进“应用程序”文件夹，再从“应用程序”里打开。
3. 打开后点 **Sign in to GitHub.com**，浏览器会弹出 GitHub 页面，登录并点授权（Authorize），再回到 Desktop。
4. 按提示确认名字和邮箱，点 **Finish**。

**完成标志：** 在 Desktop 的设置里能看到已登录的账号（Windows：菜单 **File → Options → Accounts**；苹果电脑：菜单 **GitHub Desktop → Settings → Accounts**）。

## 第三步：让 AI 准备好仓库

在 AI 对话框里说：

```text
帮我把网站文件夹准备成 Git 仓库，做好第一次提交，先不要上传。
```

AI 会在**网站文件夹**（以公司英文名命名，下面以 `huali-pumps` 为例，换成你自己的）里建好仓库，并检查 `.env` 密钥、`node_modules` 这些不该上传的东西已经排除。AI 告诉你“已完成第一次提交”就可以了。

> **不要在 Desktop 里点 New repository 自己新建仓库。** 名字只要和网站文件夹差一个字母，就会多出一个**空仓库**，上传上去的没有网站，发布后打开是 404。

## 第四步：在 Desktop 里添加并上传

1. 在 Desktop 点菜单 **File → Add local repository**（添加本地仓库）。
2. 点 **Choose...**，选中网站文件夹，例如 `my-waimao-site/huali-pumps`。**选网站文件夹本身**，不要选外面的 `my-waimao-site`（里面有你的原始资料）。点 **Add repository**。
   - 如果提示“这个文件夹还不是仓库”，说明上一步还没做好，回到 AI 那里再说一次第三步的话，**不要点提示里的 create a repository**。
3. 点上方的 **Publish repository**（发布仓库）：
   - Name 保持默认（就是网站文件夹名，如 `huali-pumps`），不用改。
   - **勾选 Keep this code private**（代码私有）。代码私有不影响网站被访问。
   - 点 **Publish Repository**，等它跑完。

## 完成标志

在 Desktop 点 **Repository → View on GitHub**，浏览器里打开你的仓库，**最外层就能看到 `package.json`、`src`、`site.config.mjs`** 这些文件。

只看到 `README.md`、`LICENSE` 两三个文件的，说明传上去的是空仓库，看下面的“传错了怎么办”。

## 以后每次修改怎么上传

AI 改完、你预览满意后：打开 Desktop → 左下角 Summary 写一句说明（比如“更新产品”）→ **Commit to main** → 点上方 **Push origin**。

记住：**Commit 是存档，Push 才是上传。** 只 Commit 不 Push，网站不会更新。也可以直接对 AI 说“帮我提交修改”，它做好 Commit 后你只点 Push origin。

## 传错了怎么办

**症状：** GitHub 仓库里没有 `package.json`；或者在 Vercel 导入时 Application Preset 显示 **Other**（正常应自动显示 Astro），在 Cloudflare 导入时框架显示 None；或者发布后打开网址是 404。

先在浏览器打开你的 GitHub 仓库看一眼：

- **最外层只有 `README.md`、`LICENSE` 这两三个文件，没有 `package.json`、`src`**：说明传上去的是空仓库，在平台上手动改设置没用，按下面重新传一次。
- **能看到 `package.json`、`src`**：仓库没问题，**不要删**，把平台的报错截图发给 AI，让它检查发布设置。

确认是空仓库后：

1. 在 GitHub 网页打开这个空仓库 → **Settings** → 拉到最底下 **Delete this repository**，按提示删除。
2. 在 Desktop 里选中这个仓库，菜单 **Repository → Remove**，把它从 Desktop 移除；如果它在电脑上多建了一个空文件夹，也一起删掉（**别删网站文件夹**，拿不准就问 AI）。
3. 从[第三步](#第三步让-ai-准备好仓库)重新来一遍。
4. 已经在 Vercel 或 Cloudflare 建了项目的，把那个项目删掉，再重新导入新仓库。

下一步：选一个平台发布 → [Cloudflare（推荐，免费版就够用）](06-cloudflare.md) 或 [Vercel](07-vercel.md)（选一个就够了）
