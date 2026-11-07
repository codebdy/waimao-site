# Sources and third-party notices

Reviewed 2026-11-07. Core instructions are adapted and rewritten for B2B export sites. Upstream repositories are references, not runtime dependencies. No upstream installers, agents, hooks, API clients or automatic promotional instructions are bundled.

## MIT sources

| Source and pinned revision | Reviewed paths | Used in / changes |
| --- | --- | --- |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo/tree/6be93f45064ffbadced572b5d5c95f55fd263af0) | skills/seo/SKILL.md; seo-schema and seo-hreflang skill guidance reviewed during research | references/seo.md, verification.md: audit categories and structured-data / language checks adapted into build-time decisions. Removed scoring thresholds, promotional footer, Claude runtime paths, automatic delegation and unverified date-dependent assertions. |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/96798cf38736ecdba015a1d2b0521b0c8f8f41dd) | skills/cro/SKILL.md | references/planning.md: value proposition, CTA, information hierarchy and evidence adapted for procurement and inquiries. No marketing integrations or upstream form implementation copied. |
| [jdevalk/skills](https://github.com/jdevalk/skills/tree/106fc68014b6275300b8206ad94b8facc1549577) | astro-seo/SKILL.md | references/seo.md and astro.md: Astro code checks, metadata, static output and site structure as implementation concerns. No required astro-seo-graph package, scoring model or experimental agent-discovery endpoints copied. |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/b7d5353e0130feb8c5574ef1251f8a1db1873ccb) | .claude/skills/ui-ux-pro-max/SKILL.md; references/quick-reference.md within that skill | references/design.md: adapted product/audience-based style selection, typography, consistent visual tokens, readable long content, image sizing and web form feedback for B2B catalogs and inquiries. No style database, scripts, CLI, native/mobile app rules, dashboard/chart workflows or mandatory design-system file generation bundled. Industry examples are our B2B adaptation, not outputs from the upstream search engine. |
| [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines/tree/434b7f91364665f2f733b310ec54809bf8f37937) | command.md | references/design.md and verification.md: selected semantic navigation, visible focus, image loading, form labels/errors and responsive-layout checks, rewritten for procurement pages. No React-specific code, automatic fetching, fixed list-virtualization threshold or universal copy/animation rules adopted. This uses the MIT-licensed guidelines repository, not a copied wrapper from vercel-labs/agent-skills. |

Original notices and full MIT licenses downloaded from these pinned revisions:

- [Claude SEO](licenses/claude-seo-MIT.txt): Copyright (c) 2026 agricidaniel.
- [Marketing Skills](licenses/marketingskills-MIT.txt): Copyright (c) 2025 Corey Haines.
- [Joost de Valk skills](licenses/jdevalk-skills-MIT.txt): Copyright (c) 2026 Joost de Valk.
- [UI UX Pro Max](licenses/ui-ux-pro-max-MIT.txt): Copyright (c) 2024 Next Level Builder.
- [Vercel Web Interface Guidelines](licenses/vercel-web-interface-guidelines-MIT.txt): Copyright (c) 2025 Vercel Labs.

Retain this file and licenses when redistributing the adapted skill. Dependencies installed for generated websites retain their own licenses; the repository MIT license does not relicense third-party packages.

## Apache-2.0 design source

[Anthropic frontend-design](https://github.com/anthropics/skills/tree/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/frontend-design), reviewed 2026-11-07: skills/frontend-design/SKILL.md and its LICENSE.txt. The full upstream license is retained in [frontend-design Apache-2.0](licenses/anthropic-frontend-design-Apache-2.0.txt).

Modified/adapted on 2026-11-07 in references/design.md: subject-specific visual direction, deliberate typography/layout, restrained decoration, planning before implementation and review against the brief. Rewritten in Chinese and scoped to B2B procurement, products and inquiries; customer preferences take precedence. Removed the assumed design-studio client story, generic placeholder-copy generation, mandatory aesthetic novelty and any implication of permission to start a browser or service. No other Anthropic skills or their tools/assets are bundled. The source skill directory contains only SKILL.md and LICENSE.txt; the repository's third-party notices were inspected and no components from them are incorporated by this adaptation.

The Apache-2.0 terms continue to apply to the adapted upstream portions; the core repository MIT license does not replace them. Preserve the license, attribution and modification notices with redistribution. These sources are not endorsements of export-site.

## WordPress: reference only

[WordPress/agent-skills](https://github.com/WordPress/agent-skills/tree/7374e6f1c913b3b02b25465d266d9c0e0a04fc96), GPL-2.0-or-later. README and skill inventory informed optional integration links. No GPL skill text, scripts, templates or license-relabelled files are bundled. references/wordpress.md is independently written guidance; adding upstream files later requires a fresh licensing review.

## kingnod-v2: project experience

Architecture was inspected in the user's local kingnod-v2 working tree: astro.config.mjs; src/lib/client.ts, content.ts, content-models.ts; src/ui/Container.astro, Frame.astro, Section.astro, Meta.astro; src/styles/tokens.css; .agents/skills/kingnod-v2/SKILL.md. HEAD observed: eb500f7a22518783f3ecedbefc289934c75f24b0. The inspected working files may differ from that commit; this is not a claim that the private source is publicly available or MIT-licensed.

Derived design decisions: common layout components, content facade, centralized SEO, CMS/render-mode separation and schema identity. Starter code is newly authored; no original components, brand assets, credentials, business content or copied rxdrag library implementation are redistributed. CMS endpoint names and response shapes are documented observations, not a tested RXCMS integration.

Also inspected CookieConsent.astro, its configuration, HeadCode.astro and Document initialization for the requested consent experience. The new implementation separates analytics and advertising choices, gates Google loading behind consent, and contains no original Google tracking ID or copied private component. Inquiry and content clients are independently written against the observed backend contract; fixtures are synthetic, not exported customer records.

## Website runtime dependencies added for these features

The starter package/lock pin vanilla-cookieconsent 3.3.0 (MIT, Copyright 2020–2025 Orest Bida), marked 18.1.3 (MIT), sanitize-html 2.18.1 (MIT) and htmlparser2 12.0.0 (MIT). They are installed through npm, not vendored as private source. Preserve their package license notices when redistributing bundled code; the skill MIT license does not replace them. CookieConsent supplies the dialog behavior; Markdown parsing and HTML sanitization use maintained parsers rather than custom regular-expression filtering.

Full installed direct-dependency notices (including Marked's additional Markdown notice) are retained in [the starter's distributable notices](assets/astro-starter/public/third-party-licenses.txt), so static builds carry them even when minification removes comments. Refresh that file when dependency versions change.

## rxcms-server: confirmed backend contract

The user confirmed rxcms-server as the integration target. On 2026-11-07, inspected its working-tree docs/content-api.md, docs/mcp-server.md, internal/interfaces/http/content_api.go, site_key_auth.go, site_service_gate.go, mcp.go, internal/infra/mediaurl/mediaurl.go and cmd/server/main.go. HEAD observed: d65b004c1c7949449e07b66eaa93cefb921fce58; working-tree files may differ. references/rxcms.md describes observed API contracts and integration decisions. No backend implementation, private configuration or credentials are redistributed, and this notice does not grant a license to the backend. No live API, mail or MCP mutation was performed.

## Primary documentation

Framework/deployment references are linked in references/astro.md and deployment.md; Google Search documentation in references/seo.md. Policies and APIs can change; recheck authoritative docs when implementing version-sensitive behavior. No full external manuals are bundled.
