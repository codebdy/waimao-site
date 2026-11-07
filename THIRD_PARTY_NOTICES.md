# Sources and third-party notices

Reviewed 2026-11-07. Core instructions are adapted and rewritten for B2B export sites. Upstream repositories are references, not runtime dependencies. No upstream installers, agents, hooks, API clients or automatic promotional instructions are bundled.

## MIT sources

| Source and pinned revision | Reviewed paths | Used in / changes |
| --- | --- | --- |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo/tree/6be93f45064ffbadced572b5d5c95f55fd263af0) | skills/seo/SKILL.md; seo-schema and seo-hreflang skill guidance reviewed during research | references/seo.md, verification.md: audit categories and structured-data / language checks adapted into build-time decisions. Removed scoring thresholds, promotional footer, Claude runtime paths, automatic delegation and unverified date-dependent assertions. |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/96798cf38736ecdba015a1d2b0521b0c8f8f41dd) | skills/cro/SKILL.md | references/planning.md: value proposition, CTA, information hierarchy and evidence adapted for procurement and inquiries. No marketing integrations or upstream form implementation copied. |
| [jdevalk/skills](https://github.com/jdevalk/skills/tree/106fc68014b6275300b8206ad94b8facc1549577) | astro-seo/SKILL.md | references/seo.md and astro.md: Astro code checks, metadata, static output and site structure as implementation concerns. No required astro-seo-graph package, scoring model or experimental agent-discovery endpoints copied. |

Original notices and full MIT licenses downloaded from these pinned revisions:

- [Claude SEO](licenses/claude-seo-MIT.txt): Copyright (c) 2026 agricidaniel.
- [Marketing Skills](licenses/marketingskills-MIT.txt): Copyright (c) 2025 Corey Haines.
- [Joost de Valk skills](licenses/jdevalk-skills-MIT.txt): Copyright (c) 2026 Joost de Valk.

Retain this file and licenses when redistributing the adapted skill. Dependencies installed for generated websites retain their own licenses; the repository MIT license does not relicense third-party packages.

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
