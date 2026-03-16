---
description: How to deploy changes to production after completing a feature or fix
---

# Deploy Workflow

JustPlanner uses **auto-deploy via GitHub**. There is no manual deploy step.

## After completing any feature or fix:

// turbo
1. Stage all changed files: `git add <files>`

// turbo
2. Commit with a descriptive message: `git commit -m "feat: ..." or "fix: ..."`

// turbo
3. Push to GitHub: `git push`

GitHub will automatically deploy to production. **Do not** run `deploy.sh` or SSH to the server to deploy — it's all handled by GitHub Actions.

## Important

- Always commit and push **before** telling the user "готово" / "done"
- The user expects changes to be live immediately after you confirm completion
- Server-side changes (in `server/`) are also auto-deployed via the same pipeline
