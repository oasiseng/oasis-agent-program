# Publish the repo and enable verification

The public repository is now [oasiseng/oasis-agent-program](https://github.com/oasiseng/oasis-agent-program). No verification service has been deployed by publishing the repository. Existing Oasis website, intake Worker, databases and automations do not need to be replaced. Section 1 records initial publication guidance; continue with repository settings and section 2 for deployment preparation.

## 1. Create the GitHub repository

Suggested name: **oasis-agent-program**, under **oasiseng**. Create it empty (no generated README/license) so this package remains authoritative. Publish the tracked source files, including `.github/`, catalog and lockfile. Never upload `.dev.vars`, `.env`, node_modules, `.wrangler`, test databases or release archives.

The supplied ZIP contains an allowlisted source package. Extract it before uploading; uploading the ZIP itself does not configure GitHub templates or CI. A normal Git push is preferable to browser upload because hidden `.github` files must be included. The local repository is initialized but has no commit, remote or push.

After the owner creates the empty remote, review files and use a normal commit/push. Replace the URL if a different name was chosen:

```sh
git add .
git diff --cached --stat
git commit -m "Add public contribution pilot and AgentKit verification"
git remote add origin https://github.com/oasiseng/oasis-agent-program.git
git push -u origin main
```

Verify the remote files, proposal form and CI result independently. Turn on issue forms. Set main-branch protection/rules to require pull requests, the `verify` check, and owner/code-owner review, with no routine bypass or auto-merge. On a solo-owned repo, plan how another trusted reviewer handles owner-authored PRs; never count an agent as the professional reviewer. A CODEOWNERS file requests review but does not enforce branch protection by itself.

Keep Actions permissions read-only. Require owner approval for workflows from outside contributors. Never use `pull_request_target` to run untrusted contributor code, pass production credentials to PR jobs, or add deployment/payout secrets to this workflow.

## 2. Validate locally

```sh
npm ci
npm run verify
npm run db:local
npm run dev
```

Tests use real EIP-191 signatures, a local D1 database and a controlled AgentBook test response. They do not prove a real registration or production connection. `npm run build` performs `wrangler deploy --dry-run`; it uploads nothing.

The type-generation helper temporarily uses `.dev.vars.example` only if no local file exists, then removes that temporary file. It never replaces an existing local secret. The placeholder is rejected by the service.

## 3. Create an isolated Cloudflare deployment

Use a new Worker and D1 database for this pilot. Do not bind internal databases or use the website's intake credentials.

```sh
npx wrangler login
npx wrangler d1 create oasis-agent-pilot
```

Put the returned database ID in `wrangler.jsonc`; the all-zero ID is deliberately a placeholder. Set PUBLIC_ORIGIN to the final HTTPS origin without a path, for example a dedicated `agents-verify` subdomain you control. It must match the deployed service. Set WORLD_RPC_URL to a World Chain mainnet RPC you trust. The checked-in public endpoint is a convenience with no availability guarantee; do not commit a private RPC URL containing an API key. If needed, remove that var and use a Cloudflare secret named WORLD_RPC_URL.

Generate at least 32 random characters for HUMAN_HASH_SECRET and store it with the prompted secret command. Do not paste it into commands saved in a public shell history, source files or issues.

```sh
npx wrangler secret put HUMAN_HASH_SECRET
npx wrangler d1 migrations apply DB --remote
npm run verify
npx wrangler deploy
```

Keep `PROGRAM_ENABLED=false` for this first deployment. Confirm `/health`, `/catalog.json`, the database binding, disabled POST behavior and the HTTPS origin. Set up appropriate Cloudflare request/abuse controls and cost alerts for the public hostname; the application limits alone do not stop distributed abuse or eliminate database/compute costs. Protect the workers.dev hostname too, or disable it when using a custom route so it cannot bypass hostname controls.

## 4. Run one real proof, then announce

Set `PROGRAM_ENABLED=true`, deploy, and use the example client with a dedicated **actually registered** operator wallet and a synthetic public proposal. Confirm the 201 receipt, receipt GET, correct artifact hash and duplicate rejection. Test a nonregistered wallet and a stopped/unavailable RPC without issuing a receipt. No real client data or payment is needed.

If this fails, disable verification again; leave manual proposals available. Do not label the verifier live on the website until this check succeeds.

Then update the companion repository URL and verified service origin on the website/manifest according to [WEBSITE-INTEGRATION.md](WEBSITE-INTEGRATION.md). Record deployment date, version/commit and the real-proof outcome in the validation record. The receipt remains optional unless a particular approved task explicitly requires it.

## Local enabled testing

Copy `.dev.vars.example` to `.dev.vars`, replace its placeholder with a random local-only value, and add `PROGRAM_ENABLED=true` and `PUBLIC_ORIGIN=http://localhost:8787`. Apply local migrations and start the Worker. Real AgentBook registration is still required by the running service; only automated tests substitute the lookup. Keep private keys out of `.dev.vars` unless you deliberately choose local secret storage; the provided operator client reads its own process environment.

## Disable or roll back

Set PROGRAM_ENABLED=false and redeploy: new verification stops, existing receipt reads remain available until revoked/expired. Manual task review remains independent. Use the prior reviewed Worker version for a code rollback; do not drop the database or reset receipt uniqueness to bypass quotas. No automatic deployment is configured.
