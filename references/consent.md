# Cookie 同意与 Google Consent Mode v2

实现/修改统计、广告、隐私弹窗时阅读。面向用户的解释和开关操作见 [使用指南](../docs/usage-guide.md#consent)。

## 当前实现

starter 使用 vanilla-cookieconsent 3.3.0；组件在 SiteLayout 挂载，页脚提供重新选择入口，隐私页 `/privacy-policy/`。只有英文文案；生成其它语言网站时翻译弹窗、按钮、隐私页并验收，不假设 language 配置自动翻译它。

配置集中在 site.config.mjs 的 cookieConsent / google。enabled 默认为 true，两个 Google ID 默认为空，初始仅必要偏好存储。enabled=false 时不初始化弹窗、不执行该集成的 gtag 命令，也不加载其标签。Google ID 是公开标识，可以传浏览器；只序列化显式白名单，不能序列化整个配置或环境变量。

采用基础同意模式：在自带 Google 标签加载之前初始化四个 denied 信号；首次有效同意及回访都从 CookieConsent 回调读取选择，按类别更新后加载。analytics_storage 对应 analytics；ad_storage、ad_user_data、ad_personalization 对应 advertisement。无 ID 时不添加相应类别，不将 analytics 同意误当广告同意。[Google 文档](https://developers.google.com/tag-platform/security/guides/consent)

默认提供等权重接受与拒绝选项。关闭偏好窗口不代表同意。保存偏好 180 天，revision 增加会重新征求。已加载标签后撤回类别时更新拒绝、关闭 GA 收集并刷新页面，重新按已存选择初始化；尽力清除本域可访问的 _ga / _ga_*、_gcl_* Cookie，不能承诺清除服务商已收到的数据或所有跨域 Cookie。

组件针对当前完整页面导航。若引入 Astro ClientRouter/SPA，需另行处理导航生命周期、监听重复与 page_view，不能声称原组件已适配。

## 范围和真实说明

- Google Ads 当前只配置公开 AW 标签，不自动发送询盘转化；要追踪转化，另核实 conversion label、同意和去重条件。
- 不管理手工插入的 GTM、Meta、视频 iframe、聊天插件或 Turnstile。新增外部服务时盘点并单独接入相应类别，避免绕过同意。
- 不能把普通 CookieConsent 集成称为 Google 认证 CMP。法律文案与地区要求应根据客户业务另核实，不能承诺自动合规。
- 隐私页是待完善模板。开通询盘、反垃圾服务或媒体第三方请求时，按实际服务商、处理用途、联系方式和保存期限补充。
- 参考 kingnod-v2 的弹窗形态，未复制其真实 Google ID、私有代码，未沿用统计与广告绑定到同一类别的做法。

## 验证

单元测试覆盖默认拒绝、关闭开关、分别授权、重复回调、撤回和配置白名单。静态构建检查挂载与开关输出。浏览器网络、Cookie 持久化、键盘焦点/移动端、实际 Google Tag Assistant 仍需用户启动预览或在授权部署环境验证，未操作时不能标成已完成。

客户验收至少包含：新访客不选择/拒绝时无自带 Google 请求；只同意统计时广告仍 denied；同意广告时三个广告信号一致；刷新保留选择；页脚可重开；撤回后新页不加载被拒标签；关闭集成即使 ID 有值也不执行。避免在现有页面早于 defaults 手工注入 Google 标签。

参考：[CookieConsent 配置](https://cookieconsent.orestbida.com/reference/configuration-reference.html)、[Google 集成回调](https://cookieconsent.orestbida.com/advanced/google-consent-mode.html)。
