# Validation record

Date: 2026-11-07. Local checks only. No application, dev/preview listener, browser, real CMS request/write, email delivery or cloud deployment was started. Customer integration testing is deliberately deferred until a real website exists and its owner supplies the test environment and authorizes submissions.

## Current implementation and evidence

- Skill Creator `quick_validate.py`: passed (Python UTF-8 mode on Windows).
- `npm test`: 33 tests passed, 0 failed (31 before the 2026-11-07 review fixes below). Tests cover deployment selection, SEO escaping/canonical, consent defaults and category changes, RXCMS pagination/error/language/mapping, duplicate route prevention, WordPress pagination/auth/protected-content filtering/HTML cleaning, inquiry validation and result semantics, and generated function switching without overwriting user-owned files.
- `npm run check`: Astro diagnostics passed with 0 errors, 0 warnings, 0 hints (35 files at the check). Added the CookieConsent return type and Node type definitions after the first check identified those issues.
- `npm run build`: default static site built successfully: 7 HTML pages (home, products, sample product, articles, contact, privacy, 404), plus robots.txt and sitemap.xml. Default sample site remains noindex.
- Pre-review default output inspection with Python HTML/JSON/XML parsers: 48 local navigation/stylesheet links resolved; one h1 per page; JSON-LD parsed; noindex and empty sitemap agreed; dependency notices were present. The later review removed empty Articles navigation, so 48 is a historical count, not the current link total.
- `npm run test:builds`: six isolated, offline static variants: local (7 HTML), RXCMS fixture (9), WordPress fixture (7), consent disabled (7), static + Vercel inquiry (7), static + Cloudflare inquiry (7). Synthetic fetch responses replace all CMS network requests. Tests check fixture routes, no sample-product fallback, protected article exclusion, CMS sitemap inclusion, disabled consent mount, no eager Google script, inquiry form and Cloudflare function routing output. Generated platform modules are imported and invoked without a listener. This is not cloud deployment evidence.
- All six build variants scan generated files for a sentinel credential: no occurrence. This checks the exercised build paths, not every future integration.
- Packaging/document inspection: 69 distributable source/package files, 61 relative documentation/image links resolve (guide/README anchors also checked); package-lock direct dependencies and devDependencies match package.json. Git ignores dependencies, generated build outputs and local secrets. Full direct-dependency notices accompany generated static files.
- README now links to docs/usage-guide.md. Official account, Desktop, Vercel and Cloudflare instructions were consulted; the full novice path has not been exercised by a fresh customer or through real account registration.

Environment: Node 24.18.1, npm 11.16.0, Python 3.14.6. Astro 7.4.7, Tailwind/@tailwindcss/vite 4.3.5, vanilla-cookieconsent 3.3.0, marked 18.1.3, sanitize-html 2.18.1, htmlparser2 12.0.0. Check tooling: @astrojs/check 0.9.12, TypeScript 5.9.3, @types/node 24.19.2. npm reports an existing user-config warning about electron_mirror; this project does not modify it. Dependency installation used --no-audit and is not a vulnerability-audit result.

## API contract and scope

RXCMS: inspected rxcms-server content_api.go, key authentication/service gate, media URL generation, routing and related docs. The newly implemented client reads product/post lists with withContent=true, normalizes content and media, and supplies static routes. Fixtures are synthetic, not copied customer records. Categories/users/tags have low-level read helpers, but the starter does not automatically render a full category/team/multilingual site. Markdown rendering intentionally excludes executable MDX and arbitrary embedded services. Media URLs with query strings are conservatively rejected pending site-specific review. schemaJson is retained for reviewed schema merging, not automatically trusted as head output.

WordPress: experimental minimum REST client for posts/pages; only standard posts currently drive frontend Articles. Product plugins, page routing, multilingual mapping, media display, CMS-to-frontend internal links and plugin interactions are not implemented generically. Standard public/protected filtering and sanitized HTML are tested with fixtures. No live credentials were used.

Inquiry: static + independent function configuration is implemented for both platforms. The shared handler validates origin, size, fields, honeypot and Turnstile hostname/action, strips untrusted forwarding fields, and does not retry POST. The current RXCMS response reports saved id and spam only. For normal saved inquiries, notification.status=not_reported; for spam it is skipped_spam. Mail provider acceptance/delivery cannot be inferred. No backend code was changed to invent a notification result. Platform rate limits remain a per-customer deployment requirement; Turnstile is not represented as a distributed rate limiter.

Consent: default enabled with empty Google IDs; categories are separate; accepted categories load the corresponding tag; disabled integration does not initialize tags; withdrawal updates denial and reloads. Unit tests use injected effects, and build tests inspect output. Actual browser storage/network behavior remains unverified.

## Review fixes (2026-11-07, Claude Code whole-skill review)

- configure-inquiry no longer fails every build when inquiry is off (or targets the other platform) and the project has its own `public/_routes.json` / `api/inquiry.js`; such files are left untouched. It still refuses to overwrite them when it must generate that path.
- CMS body images were removed by the sanitizer; HTTPS `<img>` is now kept (lazy-loaded, no event attributes). Body image URL lifetime is still not validated.
- RXCMS media file names are no longer used as alt text; they remain as attachment link labels.
- The Articles link and sitemap entry appear only when posts exist; an empty article index is noindex.
- references/rxcms.md corrected against content_api.go: category lists are unpaginated; category/tag details fall back to another language.
- After the fixes: `npm test` 33/33, `npm run check` 0 errors, `npm run test:builds` all six variants passed, default `npm run build` 7 pages. Still fixture-only; no live API, platform or mail evidence.

## Post-review packaging and documentation follow-up (2026-11-07)

- Confirmed the reported Claude fixes are present and reran 33 unit tests, Astro check (0 errors/warnings/hints), and all six offline build variants successfully.
- Added scripts/package_skill.py and generated a local export-site-0.1.0.zip plus SHA-256 sidecar in ignored releases/. The ZIP has a single export-site top-level folder, contains 69 source/document files, and excludes dependency/build/cache folders and local environment/secret files. Extracted-package skill validation and 61 relative document/image link checks passed. This creates a distributable file; it does not publish a GitHub repository or Release.
- Beginner deployment instructions now use site.config.mjs as the default place for output/deployTarget. Environment overrides remain supported and take precedence, including inquiry entry selection; old overrides must still be checked during migration.
- Moved the server-only Wrangler sample to config/cloudflare-server/wrangler.jsonc.example. Only the Cloudflare Workers server workflow copies it into the website root; static Pages has no root Wrangler config from this template.
- Renamed the starter license to TEMPLATE-LICENSE.txt, retaining the complete MIT text and clarifying that it covers the original starter code. Customer-added material is separately identified; dependency notices remain distributed.
- Did not guess a trusted client-IP forwarding chain, change the existing saved/spam/notification response contract, auto-merge arbitrary schemaJson, or claim complete language alignment. These remain explicit implementation/review considerations for a concrete customer site; no production API or reference backend was changed.

- Follow-up check: ZIP entries now carry explicit 0644 Unix permissions (previously mode 0, which macOS/Linux unzip tools can extract as unreadable when packaged on those systems). The guide now explains that Windows "Extract All" adds an `export-site-0.1.0` wrapper folder and only the inner `export-site` folder is installed. The package was regenerated; its contents were compared byte-for-byte with the source tree and scanned for local paths.

- 2026-11-07 historical packaging check: installation text at that point described direct ZIP distribution. The repository is now public at https://github.com/codebdy/export-site and installation instructions point to its Releases page. Packaging reports unrecognized file extensions instead of silently omitting them. That check regenerated a 69-file ZIP with `python -I scripts/package_skill.py`; `npm.cmd test` passed 33/33 (PowerShell blocked `npm.ps1`), and skill validation passed.

## Still requires customer/environment verification

- Real Vercel / Cloudflare Git builds, function discovery/execution, runtime secrets, DNS, redirects, response codes and platform limits.
- Real RXCMS/WordPress requests, customer schema mapping, media lifetime, content updates and configured build hooks.
- Inquiry database record and spam classification, configured notification behavior, mail logs/provider acceptance and actual receiving mailbox. These are separate checks in references/inquiry.md; none occurred during skill development.
- Platform rate-limiting policies and complete production abuse controls, attachment handling if requested, and native server inquiry routes (bundled function generator supports static only).
- Browser consent first visit/return/revocation, focus/mobile accessibility, real Google/Turnstile behavior, and final client-specific privacy content. No certified CMP or legal-compliance claim.
- Full server adapter builds/runtime. Adapter selection tests use injected factories. Previously checked compatible metadata: @astrojs/vercel 11.0.20, @astrojs/cloudflare 14.4.6 with Wrangler 4.125.0; these optional packages are not installed in the static template.
- Visual rendering, Core Web Vitals, Google indexing/rich-result eligibility and customer content accuracy. Fixture indexable builds are not production SEO validation.
- The 2026-11-07 Claude Code review was static analysis plus local tests/builds; it did not exercise the novice path, a browser or a cloud platform. Review instructions are supplied in conversation, not in a prompt file.

Installation instructions now cover multiple AI tools. Claude Code / Codex locations follow the official documentation supplied for this update, while WorkBuddy / DeepSeek-related tools remain untested.

Added `.github/workflows/release.yml` to check the published Release tag against `SKILL.md` metadata.version, package the skill, and upload the ZIP and SHA-256 file. The workflow has not yet been run on GitHub; actual Release triggering and asset upload remain unverified.

## 2026-11-07 SEO and beginner documentation update

- Added a neutral placeholder favicon, optional absolute og:image and og:site_name, Article and detail-page BreadcrumbList nodes, and existing product images. Missing article dates, authors, product prices and ratings are not invented.
- Updated the beginner guide with Search Console DNS verification and sitemap submission, clarified single-language scope, and replaced outdated installation wording with the public repository's Releases download instructions. SKILL.md and THIRD_PARTY_NOTICES.md needed no download wording changes.
- `npm.cmd test`: 33/33 passed. `npm.cmd run check`: 35 files, 0 errors/warnings/hints. `npm.cmd run test:builds`: all six offline variants passed (RXCMS 10 HTML pages, other variants 7 each), including structured-data parsing, dated/undated articles, breadcrumbs, product images, favicon and optional sharing metadata checks. `npm.cmd run build`: passed, 7 static pages.
- `python -I scripts/package_skill.py`: generated the local 70-file ZIP and SHA-256 sidecar. SVG was already permitted by the packaging script; no packaging rules changed.
- This update used no network, running service, deployment or Git push. Real DNS/Search Console verification, sitemap status, indexing, social preview rendering and platform behavior remain to be checked on the customer's live site.

## 2026-11-07 B2B design guidance integration

- Adapted only B2B website-relevant methods from Anthropic frontend-design, UI UX Pro Max and Vercel Web Interface Guidelines into the existing design reference; added routing, beginner guidance and scoped visual checks. Pinned source revisions, modification notices and three full licenses are recorded in THIRD_PARTY_NOTICES.md and licenses/. No upstream tools, databases, runtime dependencies or brand assets were added.
- Preserved the concurrent split of the beginner documentation; updated the existing style guide and README without replacing that work. Skill validation passed with `python -X utf8 .../skill-creator/scripts/quick_validate.py` using the existing user-installed PyYAML (the isolated invocation could not import it). Parsed Markdown link checks found 162 existing local file targets and no missing targets in the checked snapshot; anchors and external URLs were not validated. `git diff --check` passed.
- Regenerated the local package with `python -I scripts/package_skill.py`, including the new licenses. This integration changes instructions/documentation only; it did not rerun the previous section's passing Astro tests or builds. Source research used read-only GitHub requests; no service, deployment, Git push or real inquiry was performed. No generated customer site, browser behavior or design quality was visually tested. The Claude review prompt is supplied in conversation, not saved as a file.
