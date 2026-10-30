# StaffDeck SD1 UI QA

Source:
- Figma file `03XlzJQ1dFYdlDWBR4Mlg4`, page node `0:1`
- Covered SD1 frames: `1:2892`, `1:765`, `1:1462`, `1:2165`, `1:68`, `1:6578`, `1:3713`, `1:3425`, `1:5883`, `1:7470`, `1:3975`, `1:4614`, `1:4286`, `1:5013`, `1:5409`

Implementation checkpoints:
- Chat gallery and selected-session states: `/private/tmp/StaffDeck-sd1-qa/01-chat-gallery-switch.png` through `/private/tmp/StaffDeck-sd1-qa/15-chat-stopped-or-idle.png`
- Figma reference exports: `/private/tmp/StaffDeck-figma-sd1/01-figma-1-2892.png` through `/private/tmp/StaffDeck-figma-sd1/15-figma-1-5409.png`
- Visual comparison contact sheet: `/private/tmp/StaffDeck-sd1-visual-diff/overview-15-scenarios.png`
- Visual comparison report: `/private/tmp/StaffDeck-sd1-visual-diff/visual-diff-report.json`
- Enterprise employee roster: `/private/tmp/StaffDeck-sd1-qa/02-enterprise-agents-collapsed.png` (legacy filename; Figma node `1:765` is expanded), `/private/tmp/StaffDeck-sd1-qa/05-enterprise-agents-expanded.png`, `/private/tmp/StaffDeck-sd1-qa/09-enterprise-agents-collapsed-reference.png`
- Enterprise employee profile: `/private/tmp/StaffDeck-sd1-qa/06-enterprise-dashboard-expanded.png`, `/private/tmp/StaffDeck-sd1-qa/10-enterprise-dashboard-collapsed.png`
- Dark and responsive checks: `/private/tmp/StaffDeck-sd1-qa/20-dark-chat-input.png`, `/private/tmp/StaffDeck-sd1-qa/21-dark-enterprise-dashboard.png`, `/private/tmp/StaffDeck-sd1-qa/22-mobile-chat-input.png`, `/private/tmp/StaffDeck-sd1-qa/23-mobile-enterprise-agents.png`
- Machine-readable report: `/private/tmp/StaffDeck-sd1-qa/report.json`

Browser QA summary:
- 23 browser states checked: all 15 SD1 frames, 4 enterprise regression pages, 2 dark-mode pages, and 2 narrow-screen pages.
- Figma metadata was checked for all 15 nodes. Important interaction-state corrections: `1:2165` is the chat gallery employee-filter dropdown state, `1:4286` is an expanded-sidebar model-dropdown input state, and only `1:5883` is the collapsed enterprise employee roster; `1:765` and `1:68` are expanded-sidebar roster states.
- Formal API data path used: `/api/auth/login`, `/api/chat/agents`, `/api/chat/sessions`, `/api/enterprise/agents`, and page-owned enterprise/chat API calls.
- Layout checks passed: no horizontal overflow, no visible error toast, no pageerror, key 1440x900 chat dimensions matched SD1 (`72/220` sidebar, `56` header, `570` empty state, `1078/960 x 100` composer).
- In-app Browser checks verified `/chat/gallery` at expanded `220px` sidebar with `所有员工` active, visible employee-filter dropdown, top-right `切换主题`/`刷新页面` only, `/enterprise/agents` summary labels, model-dropdown input state, and dark enterprise dashboard inversion.
- Chat polling was constrained to current/running sessions to prevent request storms and stacked `Failed to fetch` errors.
- Enterprise knowledge page now suppresses non-visible OKF version probes during automatic page load.
- Follow-up in-app browser checks matched SD1 top-right actions (`sun`/`refresh`), collapsed chat bottom icon, and composer shallow border/shadow.
- Dark-mode checks verified enterprise dashboard/agents and chat surfaces all invert their main content areas, not only the sidebars.

Automated checks:
- `npm --prefix frontend-enterprise run build` -> passed
- `node /private/tmp/codex-playwright/sd1-qa.mjs` -> 23 total, 0 failures

Final result: passed

---

# Login Page Design QA

## Comparison Target

- Source visual truth: `artifacts/design-qa/login-2026-08-26/source.png`
- Browser-rendered implementation: `artifacts/design-qa/login-2026-08-26/implementation-1586x992.png`
- Full-view comparison: `artifacts/design-qa/login-2026-08-26/comparison-1586x992.png`
- Focused login-card comparison: `artifacts/design-qa/login-2026-08-26/comparison-card.png`
- Responsive evidence:
  - `artifacts/design-qa/login-2026-08-26/implementation-900x600.png`
  - `artifacts/design-qa/login-2026-08-26/implementation-390x844.png`
- State: signed out, Chinese locale, empty credentials, password hidden

## Normalization

- Source pixels: `1586 x 992`
- Implementation pixels: `1586 x 992`
- CSS viewport: `1586 x 992`
- Density normalization: no resize required; source and implementation were compared at equal pixel dimensions and the same viewport.
- Focused card regions were normalized to `524 x 654` before being placed side by side.

## Fidelity Review

- Fonts and typography: heading hierarchy, weights, line heights, and wrapping are aligned with the source. The implementation uses the product's Geist/PingFang-compatible stack and zero letter spacing.
- Spacing and layout rhythm: the desktop login card measures `524 x 654` and is positioned at `x=899, y=175.5`, within 5px of the reference. Labels, inputs, options, action, help text, divider, and footer follow the source rhythm.
- Colors and tokens: the cool neutral page surface, black text, blue accent, neutral fields, and subtle elevation match the reference. The primary action intentionally uses the project's solid StaffDeck blue instead of adding a new gradient token.
- Image quality and asset fidelity: the employee scene is a generated `1536 x 1024` source, optimized to a 1384px-wide transparent WebP. It renders at 620 CSS px on desktop, remains sharp at Retina density, has no visible rectangular background, and uses the warm multi-role palette requested by the user.
- Copy and content: the screen preserves StaffDeck product copy. `记住账号` is functional. The source's `忘记密码？` link is intentionally replaced by non-interactive `本机安全登录` status because the product has no password-recovery flow.

## Responsive And Interaction Evidence

- `900 x 600`: no horizontal or vertical overflow; card `416 x 469`; illustration and form remain visible.
- `390 x 844`: no overflow; card `358 x 509`; the large employee scene is hidden so the form remains above the fold.
- The top `32px` remains a clear, non-interactive titlebar safe area for desktop dragging and double-click maximize behavior.
- Browser interactions tested: empty-field validation, password visibility toggle, remember-account checkbox, and account clear action.
- Console errors and warnings checked: none.

## Comparison History

### Iteration 1

- Findings: login card was 23px too narrow and about 90px too short; card and form rhythm were compressed; the generated illustration background formed a visible rectangle; the group palette was too cold.
- Fixes: set the desktop card to the reference `524 x 654` geometry, expanded form spacing, regenerated the employee palette from existing StaffDeck avatars, and produced a transparent optimized asset.
- Post-fix evidence: `artifacts/design-qa/login-2026-08-26/comparison-1586x992.png` and the responsive captures.

### Iteration 2

- Findings: the left brand and welcome copy remained about 36px too high; the shadow was slightly stronger than the source.
- Fixes: moved only the brand/copy group down 36px on large desktop and reduced shadow opacity. The five-person scene and the absence of a fake password-recovery link were classified as intentional product constraints.
- Post-fix evidence: `artifacts/design-qa/login-2026-08-26/comparison-1586x992.png` and `artifacts/design-qa/login-2026-08-26/comparison-card.png`.

### Iteration 3

- Result: no remaining actionable P0, P1, or P2 differences. Optional P3 differences are limited to minor optical text/image-position refinements.

## Final Result

final result: passed

---

# Composer Attachment Strip QA

## Comparison Target

- Issue reference: `/var/folders/97/r82hjk512zl_4qm576sf3wgw0000gn/T/codex-clipboard-1680509b-8280-4cfb-98b3-0a2876ab52fc.png`
- Native desktop before scroll: `artifacts/design-qa/attachment-strip-2026-08-26/desktop-before-scroll.png`
- Native desktop after scroll: `artifacts/design-qa/attachment-strip-2026-08-26/desktop-after-scroll.png`
- Issue-versus-result comparison: `artifacts/design-qa/attachment-strip-2026-08-26/issue-vs-single-row.png`
- Scroll movement comparison: `artifacts/design-qa/attachment-strip-2026-08-26/scroll-before-after.png`
- State: authenticated employee chat with seven ready local test attachments

## Visual And Interaction Review

- Attachment chips remain in one fixed-height row instead of wrapping into multiple rows.
- Chips retain their readable width and do not compress; overflow is constrained to the composer width.
- The native horizontal scrollbar is visible when the row overflows.
- Dragging the horizontal scrollbar moves from the first attachment group to the final attachment group, proving the full list remains reachable.
- The message input, model selector, and send action keep their original positions below the attachment strip.

## Automated Checks

- `npm --prefix frontend-enterprise test -- Composer.test.tsx MessageBubble.test.tsx` -> 6 passed
- `npm --prefix frontend-enterprise run build` -> passed
- `git diff --check -- frontend-enterprise/src/pages/chat/chatPageStyles.ts frontend-enterprise/src/pages/chat/components/Composer.tsx frontend-enterprise/src/pages/chat/components/Composer.test.tsx` -> passed

## Final Result

final result: passed

---

# Desktop Shell Interaction QA

## Comparison Target

- Upload issue reference: `/var/folders/97/r82hjk512zl_4qm576sf3wgw0000gn/T/codex-clipboard-1f69f98a-35d3-4982-a2f5-1bb856dc923e.png`
- Native picker evidence: `artifacts/design-qa/upload-file-open-panel.jpeg`
- State: authenticated employee chat, attachment menu open, no file selected or uploaded

## Interaction Review

- Clicking `添加` and choosing `上传文件` opens a native macOS `NSOpenPanel` sheet.
- Cancelling the sheet returns to the composer without adding an attachment or changing the conversation.
- The custom titlebar area beside the traffic lights continues to accept drag and double-click zoom events.
- Employee search controls render at `280 x 32px`, aligned with the adjacent language and account controls.

## Automated Checks

- `backend/.venv/bin/python -m pytest backend/tests/test_desktop_launcher.py -q` -> 48 passed
- `npm --prefix frontend-enterprise test -- --run src/pages/AgentsPage.test.tsx src/pages/EmployeeGalleryPage.test.tsx` -> 9 passed
- `VERSION=0.5.1 bash packaging/build_macos.sh` -> production frontend build, arm64 package smoke, sandbox checks, signature seal, and DMG creation passed

## Final Result

final result: passed
