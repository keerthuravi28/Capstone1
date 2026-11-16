# Playwright TypeScript AI-Powered Test Automation Framework

An enterprise-grade, TypeScript test automation framework built on **Playwright**, covering UI, API, accessibility, visual regression, and security testing for **OrangeHRM** (running against the public demo: `https://opensource-demo.orangehrmlive.com`). It layers a set of **custom AI agents** on top of the classic Page Object Model to plan, generate, execute, and self-heal tests end-to-end.

This document is the onboarding guide for a new team member. Read it top to bottom once, then use it as a reference.

---

## 1. What this framework gives you

| Capability | How it's implemented |
|---|---|
| Page Object Model | `BasePage` → `WebActions`/`WebAssertions` → per-page classes |
| Data-driven testing | CSV / JSON / Excel readers in `src/main/utils/data-reader.ts` |
| Logging | Winston, console + rotating file logs (`logs/`) |
| Retry mechanism | Playwright's built-in test retries + `ApiClient.withRetry()` for flaky API calls |
| Self-healing | AI generator/executor agent inspects and repairs failing locators via Playwright MCP |
| Cross-browser testing | Chromium / Firefox / WebKit projects in `playwright.config.ts` |
| Multiple environments | `.env`-driven config (`src/main/config/env.config.ts`) |
| Code quality | ESLint + TypeScript strict mode + path aliases |
| CI/CD | GitHub Actions workflow with parallel quality gates |
| Reusable utilities | Generic `WebActions`/`WebAssertions`/`ApiClient`/`ApiAssertions` layers, portable to any project |
| Data generation | Random string/email/username/date helpers in `helpers.ts` |
| Parallel testing | `fullyParallel: true`, worker-scoped fixtures |
| API testing & contract validation | `ApiClient` + Zod schema validation (`contract.spec.ts`) |
| Accessibility (WCAG) | `AccessibilityHelper` wrapping `@axe-core/playwright` |
| Visual regression | Playwright's native screenshot comparison, baselines in `resources/visual-baselines/` |
| Security (non-destructive) | `SecurityHelper` — headers, cookie flags, XSS/SQLi probes |
| Custom AI agents | `.github/agents/*.agent.md` — a full STLC pipeline (plan → generate → execute → analyze → heal) |

---

## 2. Tech stack

| Category | Tool | Version (see `package.json`) |
|---|---|---|
| Language | TypeScript | 5.4+ |
| Test runner | `@playwright/test` | 1.44+ |
| Runtime | Node.js | 18+ (CI uses 20) |
| Logging | winston | 3.13+ |
| CSV parsing | csv-parse | 5.5+ |
| Excel parsing | xlsx (SheetJS) | 0.18+ |
| Schema validation | zod | 3.23+ |
| Accessibility scanning | @axe-core/playwright | 4.10+ |
| Env config | dotenv | 16.4+ |
| Linting | eslint + @typescript-eslint | 8 / 7 |
| AI tooling | @playwright/mcp, jira-mcp-server (dev deps, used by the agents) | — |

---

## 3. Project structure

```
├── .github/
│   ├── agents/                     # Custom AI agents (STLC pipeline) — see §9
│   └── workflows/
│       ├── test-suite.yml          # CI: lint → smoke/api/regression/a11y/security/visual
│       └── copilot-setup-steps.yml # Environment bootstrap for Copilot coding agent
├── .vscode/
│   └── mcp.json                    # Registers the local Playwright MCP server for editor/agent use
├── docs/
│   └── test-plans/                 # AI-generated test plans & requirement reviews land here
├── resources/
│   └── visual-baselines/           # Committed screenshot baselines for visual regression (git-tracked)
├── test-data/                      # CSV / JSON / Excel fixtures consumed by data-driven tests
├── src/
│   ├── main/
│   │   ├── api/
│   │   │   ├── base/                # ApiClient (HTTP core), ApiAssertions (status/schema/etc.)
│   │   │   ├── clients/              # AuthApiClient, EmployeeApiClient — one per domain/resource
│   │   │   └── models/               # TypeScript types + Zod schemas per resource
│   │   ├── common/                   # Portable, app-agnostic layer
│   │   │   ├── WebActions.ts         # Every browser interaction (click, fill, wait, drag, tabs…)
│   │   │   ├── WebAssertions.ts      # Web-first assertions, extends WebActions
│   │   │   ├── AccessibilityHelper.ts
│   │   │   └── SecurityHelper.ts
│   │   ├── config/
│   │   │   ├── env.config.ts         # Typed, validated environment configuration
│   │   │   └── global-setup.ts       # Pre-flight checks + one-time admin login (see §6)
│   │   ├── fixtures/
│   │   │   ├── authorization.ts      # UI fixtures: loginPage, dashboardPage, loggedIn
│   │   │   └── api.ts                # API fixtures: authApi, employeeApi, apiSession
│   │   ├── pages/
│   │   │   ├── BasePage.ts           # Abstract base — adds navigate(), extends WebAssertions
│   │   │   ├── LoginPage.ts
│   │   │   └── DashboardPage.ts
│   │   └── utils/
│   │       ├── data-reader.ts        # readCsv / readExcel / readJson
│   │       ├── logger.ts             # Winston instance + child loggers
│   │       ├── reporting.ts          # annotate/parameter/attach* — native Playwright reporting
│   │       ├── helpers.ts            # Random data, date, screenshot, string helpers
│   │       └── db/                   # Generic DB scaffolding (not yet wired to a real driver)
│   └── tests/
│       ├── ui/                       # login, dashboard, accessibility, visual, security specs
│       └── api/                      # auth, employee, contract specs
├── playwright.config.ts
├── tsconfig.json                     # Path aliases: @pages/*, @utils/*, @config/*, @fixtures/*, @test-data/*
├── .eslintrc.json
├── .env.example                      # Copy to .env and fill in
└── FrameworkRequirement.md           # Original feature/requirements brief
```

---

## 4. Architecture: the layering model

The framework strictly separates **generic, portable behavior** from **application-specific behavior**, so the bottom layers could be dropped into any other Playwright project unchanged.

### UI layer

```
WebActions        → every reusable interaction/getter/wait (no selectors, no URLs)
  └── WebAssertions → web-first assertions (visibility, text, count, screenshots…)
        └── BasePage → adds navigate() relative to BASE_URL — the one app-specific method
              └── LoginPage, DashboardPage, … → app selectors + business flows
```

Every page object **must** extend `BasePage`. Application selectors live only in the concrete page classes (e.g. `LoginPage`); `WebActions`/`WebAssertions` never reference an application selector.

### API layer

```
ApiClient        → HTTP core: get/post/put/patch/delete, auth token injection, retry, polling
  └── ApiAssertions → status/header/body/schema assertions
        └── AuthApiClient, EmployeeApiClient, … → one client per REST resource
```

`ApiClient` wraps Playwright's native `APIRequestContext` — there is no external HTTP library. Responses are normalized into a consistent `ApiResponse<T>` shape (`data`, `raw`, `status`, `ok`, `headers`, `duration`). Non-2xx responses do **not** throw; assert on `status`/`ok` explicitly in the test.

### Standalone helpers

`AccessibilityHelper` (axe-core) and `SecurityHelper` (headers/cookies/XSS/SQLi probes) are deliberately **not** folded into `WebActions`/`WebAssertions` — they're distinct concerns with their own dependencies and result shapes. Instantiate them directly in a test: `new AccessibilityHelper(page)`.

---

## 5. Getting started

### Prerequisites
- Node.js ≥ 18 (CI uses 20)
- npm

### Setup
```bash
npm install
npx playwright install --with-deps        # or: npm run install:browsers
cp .env.example .env                       # then fill in values if defaults don't suit
```

Key `.env` values (see `.env.example` for the full list):

| Variable | Purpose | Default |
|---|---|---|
| `BASE_URL` | App under test | `https://opensource-demo.orangehrmlive.com` |
| `APP_USERNAME` / `APP_PASSWORD` | Login credentials used by global setup & tests | `Admin` / `admin123` |
| `API_BASE_URL` | REST API root | `.../api/v2` |
| `HEADLESS` | Run browser headless | `false` |
| `LOG_LEVEL` | Winston log level | `info` |
| `DB_ENABLED` | Toggle DB pre-flight check / scaffolding | `false` |

`src/main/config/env.config.ts` loads and validates all of this into a single typed `ENV` object — import `ENV` instead of reading `process.env` directly anywhere in the framework.

---

## 6. Running tests

```bash
npm test                       # everything (all projects)
npm run test:ui                # UI project only (Chromium)
npm run test:api               # API project only
npm run test:cross-browser     # UI on Chromium + Firefox + WebKit (Firefox/WebKit projects are commented out by default in playwright.config.ts — enable them there first)

npm run test:smoke             # --grep @smoke
npm run test:regression        # --grep @regression
npm run test:critical          # --grep @critical
npm run test:accessibility     # --grep @accessibility
npm run test:visual            # visual project, --grep @visual
npm run test:visual:update     # regenerate visual baselines

npm run test:report            # run + open the HTML report
npm run lint                   # ESLint
npm run type-check             # tsc --noEmit
npm run clean                  # remove test-results/
```

### What happens before any test runs

`playwright.config.ts` wires a `globalSetup` (`src/main/config/global-setup.ts`) that runs **once** before the whole suite:
1. **Pre-flight checks** — confirms `BASE_URL` and `API_BASE_URL` are reachable (and DB config is complete if `DB_ENABLED=true`) before spending time driving a browser. Fails fast with a clear message instead of a confusing timeout later.
2. **One-time admin login** — logs into OrangeHRM once via the UI and persists the session to `.auth/admin.json` (gitignored).

The `loggedIn` fixture (`src/main/fixtures/authorization.ts`) then restores that saved session via cookies instead of re-running the login form per test — faster, less flaky, and lighter on the shared public demo instance. If the saved session is missing, it falls back to a real UI login automatically.

### Test tags

Tests are tagged via Playwright's native `{ tag: [...] }` test option (not comment-based tags):

| Tag | Meaning |
|---|---|
| `@smoke` | Fast, critical-path checks — run on every push/PR |
| `@regression` | Broader functional coverage |
| `@critical` | Business-critical scenarios |
| `@accessibility` | WCAG/axe-core scans |
| `@visual` | Screenshot comparisons |
| `@security` | Header/cookie/injection checks |
| `@contract` | API response schema validation |

Combine with `--grep`, e.g. `npx playwright test --grep "@smoke.*@critical"`.

---

## 7. Writing a new test — the conventions to follow

1. **UI tests** import `test`/`expect` from `src/main/fixtures/authorization.ts` (gives you `loginPage`, `dashboardPage`, `loggedIn`), not directly from `@playwright/test`.
2. **API tests** import from `src/main/fixtures/api.ts` (gives you `authApi`, `employeeApi`, `employeeApiNoAuth`, worker-scoped `apiSession`).
3. Tag every test with `{ tag: [...] }`.
4. Call `annotate({...})` in a `beforeEach` (epic/feature/owner/layer) and per-test (`story`, `severity`) — these become annotations in the HTML/JSON report (`src/main/utils/reporting.ts`). This project **replaced Allure with Playwright's native reporter**; use `annotate`/`parameter`/`attachJson`/`attachApiResponse`, not an Allure API.
5. Wrap multi-step flows in `test.step(...)` for readable reports.
6. Never call `page.locator(...)` with a raw CSS/XPath selector directly in a spec — put it in a page object method, and drive it through `WebActions`/`WebAssertions` (`this.click(...)`, `this.assertVisible(...)`, etc.).
7. For new API resources: add a model + Zod schema under `src/main/api/models/`, a client under `src/main/api/clients/` extending `ApiAssertions`, and expose it via a fixture in `src/main/fixtures/api.ts`.
8. Use path aliases (`@pages/*`, `@utils/*`, `@config/*`, `@fixtures/*`, `@test-data/*`) from `tsconfig.json` where convenient.
9. Data-driven tests read fixtures from `test-data/` via `readCsv`/`readExcel`/`readJson` — load data at **module scope**, not inside a test, since Playwright needs it before registering the generated tests (see `login.spec.ts` for the pattern).

---

## 8. Quality lenses beyond functional UI/API

- **Accessibility** — `new AccessibilityHelper(page).scan()` runs axe-core against WCAG 2.1 A/AA by default; `assertNoViolations(violations, { minSeverity: 'serious' })` gates on severity.
- **Visual regression** — `assertPageScreenshotMatches()` / `assertScreenshotMatches()` (from `WebAssertions`) compare against baselines committed in `resources/visual-baselines/` (path template set in `playwright.config.ts`). Chromium-only by design (rendering differs by OS/browser); CI runs it with `continue-on-error: true` until baselines are confirmed Linux-consistent. Regenerate with `npm run test:visual:update`.
- **Security** — `new SecurityHelper(page)` checks response security headers, cookie flags (`Secure`/`HttpOnly`/`SameSite`), and probes for reflected/executed XSS or leaked DB errors. Deliberately non-destructive — no real exploitation, since this targets a shared public demo instance.
- **Contract testing** — `assertMatchesSchema(response, SomeZodSchema)` (on any API client, via `ApiAssertions`) verifies the response body's actual shape/types, catching silent field renames/retypes that a status-code-only check would miss.

---

## 9. The AI agent pipeline (`.github/agents/`)

This is what makes the framework "AI-powered": a set of specialist agents that together run the STLC (Software Test Life Cycle) — from a requirement to an executed, self-healed, analyzed test suite.

| Agent | Role |
|---|---|
| `Test-Orchestrator` | Master coordinator — routes work through the pipeline below and enforces quality gates |
| `Requirement-Analyst` | Reviews a Jira story for testability *before* planning starts (READY / NEEDS CLARIFICATION / BLOCKED) |
| `Story-Analyst-Test-Planner` | Turns a Jira story or a live app crawl into a functional test plan + a shared Page & Surface Inventory |
| `NonFunctional-Quality-Planner` | Plans Accessibility / Visual / Security coverage from that inventory (its own trigger matrix + dedup) |
| `Script-Generator-Test-Executor` | Turns a plan into real Playwright specs under `src/tests/**`, runs them, and self-heals failing locators via live browser inspection (Playwright MCP) |
| `Test-Metrics-Analyzer` | Parses `test-results/results.json`, scores flakiness, tracks trends, and suggests fixes (never edits code) |

Pipeline: `Requirement Analyst → Functional Planner → Non-Functional Planner → Generator/Executor → Metrics Analyzer → feedback loop back to planners/generator`. Every handoff between stages is a **file on disk** (test plans in `docs/test-plans/`, specs in `src/tests/`, `test-results/results.json`, `reports/`), so the pipeline is inspectable and can be run stage-by-stage by a human too.

To use it (in an agent-capable host, e.g. GitHub Copilot Chat with agents enabled): invoke `@test-orchestrator` with a Jira ID, an app URL, or a path to an existing plan — see the prompt library at the bottom of `.github/agents/Test-Orchestrator.agent.md` for ready-to-use examples (full pipeline, plan-only, generate-only, analyze-only, heal-a-flaky-test, etc.). These agents require the `jira-mcp-server` and `@playwright/mcp` MCP servers (already declared as dev dependencies / in `.vscode/mcp.json`) and are optional — the framework runs standalone via `npm test` without them.

---

## 10. CI/CD

`.github/workflows/test-suite.yml` runs on every push/PR to `main`/`master`, plus manual dispatch:

1. **Lint & Type Check** (gate for everything else)
2. **Smoke (UI + API)** — Chromium
3. **API (functional + contract)**
4. **UI Regression** — Chromium only in CI (cross-browser is available on demand via `npm run test:cross-browser`, not part of the automatic gate)
5. **Accessibility (WCAG)**
6. **Security**
7. **Visual Regression** — `continue-on-error: true` until Linux-consistent baselines are confirmed

Each job uploads `test-results/` as a build artifact. `.github/workflows/copilot-setup-steps.yml` bootstraps the environment (install deps + browsers) for the GitHub Copilot coding agent.

---

## 11. Logging & reporting

- **Logs**: Winston writes colorized console output plus `logs/error.log` and `logs/combined.log` (JSON, rotated). Child loggers (`pageLogger`, `stepLogger`, `dataLogger`, `hookLogger`, `aiLogger`) tag entries by context — import the right one instead of the raw `logger`.
- **Test report**: Playwright's built-in HTML reporter (`test-results/playwright-report`, `npm run test:report` to view) and JSON reporter (`test-results/results.json`, consumed by the Metrics Analyzer agent). There is no Allure dependency — `reporting.ts` intentionally mirrors the old Allure helper API (`annotate`, `parameter`, `attachJson`, etc.) on top of Playwright's native `test.info()`.

---

## 12. Known scaffolding / not-yet-wired pieces

- **Database layer** (`src/main/utils/db/`): `GenericDatabaseClient` validates config and exposes the intended API, but no real DB driver is wired yet — see `src/main/utils/db/README.md` for the intended flow (add a concrete client, e.g. `PostgresDatabaseClient`, wire it into `DbClientFactory`).
- **Firefox/WebKit UI projects** are defined but commented out in `playwright.config.ts`; uncomment to enable them for `npm run test:firefox` / `test:webkit` / `test:cross-browser`.

---

## 13. Quick reference

```bash
# First-time setup
npm install && npx playwright install --with-deps && cp .env.example .env

# Everyday
npm run test:smoke          # fast confidence check
npm run test:ui             # full UI suite
npm run test:api            # full API suite
npm run lint && npm run type-check   # before pushing

# Debugging a single spec
npx playwright test src/tests/ui/login.spec.ts --headed --debug

# Updating visual baselines after an intentional UI change
npm run test:visual:update
```
