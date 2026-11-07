# 通用生图规范与提示词骨架

为网站生成或挑选图片时阅读。本文件是**所有网站共用的通用规则**；每个网站独有的风格、提示词和客户反馈记在网站项目的 `brief/image-prompts.md`（见文末）。最终提示词 = 本文件的骨架 + 该网站的统一风格与避免项。

## 一、什么图可以生成

- 可以生成：首页和栏目的场景氛围图、应用场景图、背景、概念示意图。
- 不能生成冒充：客户的产品实物、工厂车间、团队、证书、检测报告、客户案例。这些必须用客户提供的真实照片，缺失时保留位置并列入待补清单。
- 生成图可能被误认为客户实物时，在网页上图片旁标注“示意图 / Illustration”（标注由网页文字呈现，不生成在图片里）。纯氛围背景可不标注。
- 也可以用允许商用的正规图库照片（如 Unsplash、Pexels）做场景图和背景，使用前核对该图许可，并在 `brief/image-prompts.md` 记录来源网址和许可。

## 二、生成前：先看真实参考

用户要真实感图片，或是工业设备、产品场景类网站时，先搜索并实际查看同类设备或场景的真实照片，优先看专业制造商公开的产品图和现场图，理解结构、比例、材质和工作环境，再写提示词。**只参考，不下载使用原图，不出现对方的品牌、商标、型号。**

## 三、提示词骨架（直接套用）

```text
Subject: [拍什么，具体到类型、材质、数量，例如 "a stainless steel centrifugal pump unit mounted on a steel base"]
Setting: [在哪里、周围有什么，例如 "inside a clean modern water treatment plant, pipes and valves in the background"]
Composition: [视角与构图，按下方“四、按页面用途”选择，例如 "wide shot, eye level, subject on the left third, clean space on the right for headline text"]
Lighting: [光线，例如 "soft natural daylight from high windows, gentle shadows"]
Details: [质感与真实细节，例如 "brushed stainless steel with realistic reflections, visible weld seams and bolts, correctly connected pipes and flanges"]
Style: professional commercial photography, photorealistic, natural perspective, true-to-life materials, clear main subject, moderate depth of field, [该网站 brief/image-prompts.md 里的统一风格描述]
Aspect ratio: [16:9 / 4:3 / 1:1，按用途选]
Avoid: line art, illustration, cartoon, 3D render, obvious CGI, plastic texture, over-smoothed surfaces, exaggerated HDR, oversaturated colors, floating or disconnected parts, impossible structures, distorted proportions, extra fingers, garbled text, watermark, brand logos, [该网站的避免项]
```

用户明确要插画或扁平风格时，改掉 Style 和 Avoid 中与写实相关的词，其余骨架照用。

## 四、按页面用途决定构图和比例

| 用途 | 重点 | 构图与比例 |
| --- | --- | --- |
| 首页首屏 | 场景氛围和视觉吸引力 | 16:9 宽幅，主体偏一侧，另一侧留出放标题的干净空间；主体放在中间安全区，手机端裁成竖幅时不被切掉 |
| 栏目 / 分类图 | 一眼看出是哪类产品或应用 | 4:3 或 1:1，主题单一、背景简洁，整组同一视角和主体比例 |
| 详情 / 应用图 | 主体完整、细节清楚 | 4:3，主体完整入画、四周留少量余量，关键结构和材质清晰 |
| 背景图 | 衬托内容、不抢文字 | 低对比、细节少，压上文字后仍清楚可读 |

## 五、工业设备的结构要合理

支撑、连接、管路、传动、进出料关系要清楚可信；金属有合理的拉丝、反光、焊缝和螺栓细节；不得出现部件穿模、悬空、断开或没有意义的结构。人物出现时穿着符合车间安全规范，不出现可辨认的真人面孔。

## 六、整组统一与美观

同一网站的图片统一色调、光线、背景风格、视角和主体比例。配色和风格**按每个网站的品牌和行业确定**，记在该网站的 `brief/image-prompts.md`，不把某个网站的配色当成所有网站的默认。

## 七、生成后检查（逐张实际查看）

- 真实：像真实照片，没有塑料感、过度磨皮和明显 CGI 感。
- 结构：没有变形、穿模、悬空、错误连接，人手和面孔自然。
- 干净：没有乱码文字、水印、品牌 Logo。
- 美观与一致：和整组图片的色调、光线、视角一致；按用途裁切后主体仍完整。

有问题就针对问题改提示词重新生成，不能因为工具返回“成功”就交付。

## 八、接入网站才算完成

图片保存到网站项目的 `src/assets/` 对应目录，通过 [astro](astro.md) 的图片组件输出，自动优化格式和尺寸；检查页面上的显示、裁切、体积和手机端加载效果。只在对话里展示图片不算完成改图。

## 九、每个网站独有的部分放哪里

- 网站项目的 `brief/image-prompts.md`：该网站的统一风格描述、避免项、每张图的用途、提示词或图库来源、状态，以及客户对图片的长期反馈。starter 已附模板。
- **每生成或更换一张图，把最终使用的完整提示词（或图库来源）写进图片清单那一行**，下次修改从这条提示词改起，不从头重写。
- **用户对图片的每一次修正都要记下**，并在重新生成前先更新文件：只针对这张图的（如“这台机器换成正面”）改该图那一行的提示词并在备注写明原因；能推广到其他图的（如“不要出现人”“不够真实”“色调暖一点”）写进反馈记录，并合并到统一风格或避免项，之后所有图片都带上。记下后告诉用户“已记住，以后的图片都按这个来”。
- 用户的 AI 工具设置里有“提示词不写入文件”之类规则时，按 SKILL.md“沉淀客户要求”第 4 步先问用户是否为这个网站记录。
- 生图需要用户的 AI 工具或图片服务具备生图能力；不支持时，按骨架写好提示词交给用户用自己的工具生成，再把图片放回指定位置。没有写实生图能力、也没有合适图库照片时，**不得用代码画的色块、几何图形或简笔画冒充照片**。
