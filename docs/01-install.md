# 安装

[← 返回首页](../README.md) · 下一步：[开始建站](02-start.md)

**这篇适合：** 第一次使用的人。做完后，你的 AI 工具就能认出这个 skill。

## 先准备两样工具

| 工具 | 用来做什么 | 怎么装 |
| --- | --- | --- |
| **AI 编程工具** | 读取这个 skill，帮你写网站 | 选一个：Claude Code、Codex、WorkBuddy 等，按它们官网的说明安装、登录。必须是**能读写电脑文件**的工具，普通聊天网页不行 |
| **Node.js** | 在电脑上生成和预览网站 | 到 [Node.js 官网](https://nodejs.org/en/download) 下载 **24 LTS** 版本，一路下一步安装 |

装好 Node.js 后，打开一个新的终端窗口（Windows 叫 PowerShell，就是输入命令的黑框/蓝框），分别输入 `node --version` 和 `npm --version`，能看到版本号就说明装好了。

> **关于 DeepSeek：** DeepSeek 是 AI 模型，网页版和 App 只能聊天，不能读写电脑文件，所以装不了 skill，也做不出网站。想用 DeepSeek，要在支持 skill 的工具里把模型选成 DeepSeek。

## 第一步：下载安装包

1. 打开 [GitHub Releases](https://github.com/codebdy/export-site/releases)，下载最新版本的 `export-site-版本号.zip`。
2. **不要点绿色的 Code 按钮下载**，那样下来的文件夹名字不对，AI 工具会找不到。
3. 解压。Windows 用“全部解压缩”时会多出一层文件夹（比如 `export-site-0.1.0`），**打开它，里面那个 `export-site` 文件夹才是要用的**。打开 `export-site`，能直接看到 `SKILL.md` 就对了。

## 第二步：建一个项目文件夹

在电脑上新建一个文件夹，比如叫 `my-export-site`。以后这次建站的东西都放在这里，AI 生成的网站也会在这里面。

## 第三步：把 skill 放到对应位置

按你用的工具，把整个 `export-site` 文件夹放进去。下面的路径都从 `my-export-site` 开始算，没有的文件夹自己新建。

| 你用的工具 | 放到哪里 | 怎么叫它出来 |
| --- | --- | --- |
| Claude Code | `my-export-site/.claude/skills/export-site/` | 在对话框输入 `/export-site` |
| Codex | `my-export-site/.agents/skills/export-site/` | 输入 `$export-site`，或输入 `/skills` 选择 |
| WorkBuddy | `my-export-site/.workbuddy/skills/export-site/`，放好后重启 WorkBuddy 或“重新加载技能” | 对它说“用 export-site 帮我建站” |
| 其他支持 skill 的工具 | 一般是 `my-export-site/.agents/skills/export-site/`，以工具说明为准 | 按工具说明 |
| **以上都不行时（万能办法）** | 放在 `my-export-site` 里任意位置 | 对 AI 说：“请先读取 export-site/SKILL.md，按里面的说明帮我建站” |

> WorkBuddy 的位置来自网上教程，作者还没有亲自测过；企业版可能是 `.codebuddy/skills/`。不行就用最后一行的万能办法。

以 Claude Code 为例，放好后应该是这样：

```text
my-export-site/
└── .claude/
    └── skills/
        └── export-site/
            ├── SKILL.md      ← 能在这一层看到它
            ├── references/
            ├── assets/
            └── docs/
```

**常见放错的情况：**
- 只复制了 `SKILL.md` 一个文件 → 要复制整个 `export-site` 文件夹
- 多套了一层：`export-site/export-site/SKILL.md`，或 `export-site-0.1.0/export-site/SKILL.md` → 去掉多的那层
- 以 `.` 开头的文件夹（如 `.claude`）在 Mac 访达里默认隐藏，按 `Command + Shift + .` 可以显示出来

## 第四步：在 AI 工具里叫出它

1. 用你的 AI 工具打开 `my-export-site` 文件夹。
   - Claude Code、Codex 这类命令行工具：在文件资源管理器里打开 `my-export-site`，在地址栏输入 `powershell` 回车，然后在打开的窗口里输入 `claude`（或 `codex`）回车。
2. 在 **AI 的对话框**里按上表的方式叫它，比如 Claude Code 输入 `/export-site`。注意是在 AI 的对话框里输入，不是在 PowerShell 里。

## 完成标志

AI 告诉你它已经读取了 export-site，并开始问你公司和产品的资料。

## 没成功？

- 先检查上面“常见放错的情况”。
- 关掉 AI 工具重新打开，或重新加载技能。
- 还不行就用万能办法：直接让 AI 读取 `SKILL.md`。
- 其他问题见[常见问题](faq.md)。

下一步：[开始建站](02-start.md)
