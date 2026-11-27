# VISTRAH Lean Dev-Iteration & Brand Rules

Scope: repository root `E:\Vistrah 2.0` (do not access or edit `E:\Vistra V.1`).

## Repository Execution & Verification Rules

1. **Default Dev Mode (No AWS Deployment):**
   - Never build Docker images, push to ECR, or trigger AWS SSM production deployments unless explicitly instructed in the prompt.
   - Commit and push locally verified changes cleanly to `origin/main`.

2. **Targeted Verification Only (Stop Redundant Full-Repo Checks):**
   - Run **only** the typecheck and unit test file(s) directly affected by the changed package (for example, if only `mobile/` changed, run `tsc --noEmit` in `mobile/` and the specific modified test file—do **not** run `pytest backend/tests/`, full Vitest suites, or unrelated package checks).
   - Run full cross-package verification (`pytest`, all `tsc` builds, and all test suites) **only** when explicitly requested before an AWS production release.

3. **Permanent VISTRAH UI & Brand Rules:**
   - **Colors:** Coastal Teal (`#0D9488`, hover `#0F766E`) primary, Deep Navy (`#0F294A`) anchor, Warm Orange (`#F97316`) subtle accent, `#F8FAFC` / `#FFFFFF` surfaces. Zero purple/violet gradients.
   - **Typography:** Standardized Swiggy/Myntra scale (`20px` SemiBold `600` headers, `14px` Medium `500` card titles, `13px` Regular `400` body, `11px–12px` captions/tabs). Never use heavy bold (`700+` / `font-bold`).
   - **Navigation:** Top header renders exclusively on the homepage (`/`). Bottom tabs are **Products** and **Vibe Finder**.
