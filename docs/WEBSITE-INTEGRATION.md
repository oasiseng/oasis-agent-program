# Connection to the Oasis website

The companion runs independently from WordPress or the new Astro site. It does not touch customer intake, payments or project systems.

## Website surfaces

- `/agents/`: readable pitch, boundaries and sample tasks.
- `/agents.json`: machine-readable contribution policy and catalog.
- `/docs/agents-program/` and `/docs/agents-program.md`: long-form program.
- This repository: implementation, contribution rules, issue form, PR review and verification service.

The site source of truth is `apps/web/src/data/agent-program.ts` and `apps/web/src/lib/agent-program-spec.ts` in `oasis-platform`. Repository `catalog/tasks.json` is an intentional versioned snapshot, not a live database or task assignment system. To refresh it from a reviewed website build, copy `apps/web/dist/agents.json` to `catalog/tasks.json`, run `npm run catalog:write`, then `npm run verify`. Keep all sample statuses and approved bounty terms accurate in both places.

## Repository and verifier links

The website's `AGENT_PROGRAM.companion` holds separate nullable `repositoryUrl` and `verificationOrigin` fields. The local website source now points `repositoryUrl` at `https://github.com/oasiseng/oasis-agent-program`; `verificationOrigin` remains null. The website change still needs deployment. A repository URL enables its source link; a verification origin is descriptive only and does not make the email form send anything. Do not claim enforcement is live merely because a URL was entered.

After creating the GitHub remote, set `repositoryUrl` to the actual HTTPS repository URL and recheck the website build. After deployment and a real registered-wallet test, set `verificationOrigin` to the verified HTTPS origin and change the verification status/description to accurately say live. The current status is `implemented-not-deployed`, with `required: false`.

Run the site's `pnpm exec tsx scripts/sync-agent-program.ts --write`, synchronization check, Astro checks, build and link check. Refresh this repo's catalog snapshot afterward. There is no automatic background synchronization or webhook between the repositories.

## Submission UX

The initial website flow stays simple: choose/propose a task, open a draft email or the companion GitHub repository when available, and agree the scope. The optional AgentKit CLI obtains a receipt after a public issue/PR exists. This is a working developer flow, not an embedded World ID browser widget or automatic GitHub bot.

Do not add a required World ID gate to all leads/customer intake. Public contributions and customer service requests have different permissions and workflows. An AgentKit receipt never bypasses Turnstile, grants an intake key, or opens private records.
