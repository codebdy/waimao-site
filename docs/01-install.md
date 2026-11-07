# 安装

[← 返回首页](../README.md) · 上一步：[开始前准备](00-prepare.md) · 下一步：[开始建站](02-start.md)

**这篇适合：** 第一次使用的人。做完后，你的 AI 工具就能认出这个 skill。**只需要装一次**，以后做任何网站都能直接用。

## 先准备两样工具

| 工具 | 用来做什么 | 怎么装 |
| --- | --- | --- |
| **AI 编程工具** | 读取这个 skill，帮你写网站 | 选一个：Claude Code、Codex、WorkBuddy、DeepSeek Harness 等，按它们官网的说明安装、登录。必须是**能读写电脑文件**的工具，普通聊天网页不行 |
| **Node.js** | 在电脑上生成和预览网站 | 到 [Node.js 官网](https://nodejs.org/en/download) 下载 **24 LTS** 版本，一路下一步安装 |

## 第一步：让 AI 帮你安装

1. 在电脑上新建一个文件夹，比如叫 `my-waimao-site`，以后这次建站的东西都放在这里。
2. 用你的 AI 工具打开这个文件夹。
   - Claude Code、Codex 这类命令行工具：在文件资源管理器里打开 `my-waimao-site`，在地址栏输入 `powershell` 回车，在打开的窗口里输入 `claude`（或 `codex`）回车。
3. 把下面这段话**原样复制**，粘贴到 **AI 的对话框**里发送：

```text
请帮我安装 waimao-site 这个 skill：
从 https://github.com/codebdy/waimao-site/releases 下载最新版本的 waimao-site ZIP，
解压后把里面的 waimao-site 文件夹装到你的用户级 skills 目录
（Claude Code 是 ~/.claude/skills/，Codex 和 DeepSeek Harness 是 ~/.agents/skills/，WorkBuddy 是 ~/.workbuddy/skills/），
确认 waimao-site 文件夹里直接就是 SKILL.md，装好后告诉我怎么使用它。
```

4. AI 可能会请你允许它下载文件、执行命令，选择**允许**即可。
5. 装好后，按 AI 的提示**关掉 AI 工具重新打开**（或“重新加载技能”）。

> **会用命令行的话**，也可以在终端里输入一条命令安装（需要已装好 Node.js）：
> ```text
> npx skills add codebdy/waimao-site -g
> ```

> 这两种方式都会装到你电脑的“用户目录”里，不在网站项目文件夹中，所以 **skill 不会被上传到你网站的 GitHub 仓库**。

## 第二步：叫出 skill

重新打开 AI 工具（同样打开 `my-waimao-site` 文件夹），在 **AI 的对话框**里：

| 你用的工具 | 怎么叫它出来 |
| --- | --- |
| Claude Code | 输入 `/waimao-site` |
| Codex | 输入 `$waimao-site`，或输入 `/skills` 选择 |
| WorkBuddy、DeepSeek Harness 及其他工具 | 对它说“用 waimao-site 帮我建站” |

## 完成标志

AI 告诉你它已经读取了 waimao-site，并开始问你公司和产品的资料。

## 没成功？

- 把 AI 的报错原样发给它，让它重新安装，或换成上面的命令方式。
- 确认装好后重新打开过 AI 工具。
- 还不行就对 AI 说：“请检查 waimao-site 这个 skill 装在哪里，SKILL.md 的位置对不对”，让它自己排查。
- **自动安装始终不成功，就用页面最下方的[手动安装](#manual)**，自己把文件夹放好。
- 其他问题见[常见问题](faq.md)。

> 让 AI 安装和命令安装都来自各工具的官方说明和网上教程，作者还没在每个工具上逐一实测；WorkBuddy 企业版的目录可能不同，以 AI 实际检查的结果为准。

## 以后怎么更新 skill

有新版本时（在 [GitHub Releases](https://github.com/codebdy/waimao-site/releases) 能看到），把下面这段话发给 AI：

```text
请把 waimao-site 这个 skill 更新到最新版本：
从 https://github.com/codebdy/waimao-site/releases 下载最新版本的 waimao-site ZIP，
用里面的 waimao-site 文件夹替换你用户级 skills 目录里原来的 waimao-site 文件夹，
更新好后告诉我新版本号。
```

更新后关掉 AI 工具重新打开。用命令安装的，重新执行一次 `npx skills add codebdy/waimao-site -g` 即可；手动安装的，按页面最下方的步骤用新文件夹替换旧文件夹。

**注意：** 更新 skill 不会自动改动你已经做好的网站。想让已有网站用上新功能，再对 AI 说：“按最新版的 waimao-site 更新我的网站”，它会说明要改哪些地方，你确认后再改。

下一步：[开始建站](02-start.md)

---

<a id="manual"></a>

<details>
<summary><b>手动安装（AI 装不上时再看）</b></summary>

<br>

**1. 下载并解压**

- 打开 [GitHub Releases](https://github.com/codebdy/waimao-site/releases)，下载最新的 `waimao-site-版本号.zip`。**不要点绿色的 Code 按钮下载**，那样文件夹名字不对。
- 解压。Windows“全部解压缩”会多出一层文件夹（如 `waimao-site-0.1.0`），**里面那个 `waimao-site` 文件夹才是要用的**，打开它能直接看到 `SKILL.md`。

**2. 打开你的用户目录**

- **Windows**：在文件资源管理器的地址栏输入 `%USERPROFILE%` 回车。
- **Mac**：在访达里按 `Shift + Command + G`，输入 `~` 回车。以点开头的文件夹默认隐藏，按 `Command + Shift + .` 可以显示。

**3. 把 `waimao-site` 文件夹整个放进对应目录**（没有的文件夹自己新建）

| 你用的工具 | 放到用户目录下的 |
| --- | --- |
| Claude Code | `.claude\skills\` |
| Codex、DeepSeek Harness | `.agents\skills\` |
| WorkBuddy | `.workbuddy\skills\`（企业版可能是 `.codebuddy\skills\`） |

以 Claude Code 为例，放好后是这样：

```text
用户目录/
└── .claude/
    └── skills/
        └── waimao-site/
            ├── SKILL.md      ← 能在这一层看到它
            ├── references/
            ├── assets/
            └── docs/
```

**常见放错：** 只复制了 `SKILL.md` 一个文件；或多套了一层，变成 `waimao-site/waimao-site/SKILL.md`。

**4.** 关掉 AI 工具重新打开，按上面“第二步”叫出它。

</details>
