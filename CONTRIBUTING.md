# 维护与贡献

这份文件写给维护者和贡献者。普通使用者请看 [README](README.md)。

## 目录分工

| 位置 | 给谁看 | 内容 |
| --- | --- | --- |
| `README.md`、`docs/` | 新手使用者 | 安装、建站、发布、更新等操作说明，一个主题一篇 |
| `SKILL.md`、`references/` | AI | 建站规则、接口契约、部署与验证要求 |
| `assets/astro-starter/` | AI（复制成客户网站） | Astro + Tailwind 起步模板、测试和脱敏测试数据 |
| `scripts/package_skill.py` | 维护者 | 生成安装包 |
| `.github/workflows/release.yml` | 维护者 | 发布 Release 时自动打包上传 |
| `VALIDATION.md` | 维护者、审核者 | 每次验证做了什么、没做什么 |
| `THIRD_PARTY_NOTICES.md`、`licenses/` | 所有人 | 借鉴来源与原许可证，再分发时保留 |

写新手文档时：每篇开头说明适合谁，步骤写清在哪里操作、做什么、成功后看到什么，结尾给完成标志和下一篇链接。技术细节放 `references/`，不要写进 `docs/`。

## 本地检查

在 `assets/astro-starter` 目录执行（Windows PowerShell 拦截 `npm.ps1` 时改用 `npm.cmd`）：

```text
npm ci
npm test               # 单元测试
npm run check          # Astro 类型检查
npm run test:builds    # 七种离线静态构建，另含四项错误配置检查（脱敏数据，不联网）
npm run build          # 默认静态构建
```

这些检查都不启动服务器、不连接真实 CMS、不发送邮件。真实平台、CMS、询盘邮件和浏览器表现需要在具体客户网站上另行验证，见 `references/verification.md`。

验证结果如实记录到 `VALIDATION.md`：区分“已验证”和“未验证”，不要把模拟测试写成真实联调。

## 发布新版本

1. 把 `SKILL.md` 里的 `metadata.version` 改成新版本号（如 `0.1.1`），提交并推送。
2. 在 GitHub 网页打开 **Releases → Draft a new release**，tag 填 `v0.1.1`（必须和上一步的版本号一致），写更新说明，点 **Publish release**。
3. GitHub Actions 会自动运行打包脚本，把 `waimao-site-0.1.1.zip` 和 SHA-256 校验文件挂到这个 Release 下。
4. 一两分钟后检查 Release 的 Assets 里有没有 ZIP。没有就去 **Actions** 页面看报错，最常见的是版本号不一致。

本地试打包：在仓库根目录执行 `python -I scripts/package_skill.py`，结果在被 Git 忽略的 `releases/` 目录。遇到不认识的文件类型，脚本会报错并列出文件，确认需要打包后再把扩展名加进脚本。

## 依赖与许可

- 模板依赖升级后，同步更新 `assets/astro-starter/public/third-party-licenses.txt`。
- 新借鉴外部项目时，记录到 `THIRD_PARTY_NOTICES.md`，原许可证放进 `licenses/`。GPL 等不兼容许可的内容只作参考，不复制进来。
- 不要把客户资料、真实密钥、私有项目路径放进仓库。

## 实施参考

- [RXCMS 接口与适配范围](references/rxcms.md)
- [静态询盘函数与客户验收](references/inquiry.md)
- [WordPress 实验客户端](references/wordpress.md)
- [Cookie 同意实现与验证](references/consent.md)
- [部署](references/deployment.md)、[SEO](references/seo.md)、[验证](references/verification.md)
- [模板 README](assets/astro-starter/README.md)
