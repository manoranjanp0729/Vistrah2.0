# VISTRAH Development Rules

## Source of Truth

GitHub main is the approved VISTRAH source of truth.

## Change Policy

1. Never casually overwrite a working feature.
2. Never redesign an approved page unless explicitly requested.
3. Preserve approved UI and functionality as the baseline.
4. Reuse existing components, styles and data structures where practical.
5. Do not introduce a dependency without a clear reason.
6. Test affected functionality before committing.
7. Production-ready changes must build successfully.
8. Database and API contracts must not be changed casually.
9. Secrets must never be committed.
10. Experimental work should use feature branches.
11. Approved work is committed to GitHub.
12. The latest approved commit becomes the new baseline.

## Development Flow

Current baseline
→ feature change
→ build
→ test
→ review
→ approve
→ commit
→ merge/update main

## Important

A visually approved page is considered locked until a new change is explicitly requested.