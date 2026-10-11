# Validation record — 2026-10-11

## Passed locally

- `npm run verify`: catalog checks, generated Worker binding types, TypeScript checks for service/client/tests, **11 tests**, and Worker deployment dry run.
- Tests use actual EIP-191 signatures and local D1, with a controlled AgentBook lookup. Covered: SDK challenge/retry, disabled/misconfigured service, changed content/domain/signature, unknown/expired/extended challenge, concurrent nonce replay, concurrent per-human quota, fresh-nonce duplicate artifact, failed lookup, malformed/oversized input, foreign origin, rate limits, receipt privacy/revocation/retention, and separation of website-only catalog routes.
- Local D1 migration applied successfully; no remote migration performed.
- Source archive extracted into a clean directory: `npm ci --no-audit` and the then-current 10-test verification/build passed without any local secret file. Type generation cleaned up its temporary placeholder. The subsequent catalog-route clarification adds the eleventh test and passed in the source workspace.
- `npm audit` and runtime-only audit reported zero known vulnerabilities at check time. This is not a security certification.
- All local Markdown links resolved. The three GitHub YAML files parsed using YAML 2.9.1; workflow permissions are read-only and use a pull-request event. Python's optional YAML module was unavailable, so the installed Node YAML parser was used instead.
- Git ignores local secrets, dependencies and Worker state. The release helper uses a source allowlist and checks ZIP integrity and excluded paths.

## Website alignment

- Program version 0.3, verification `implemented-not-deployed`, nullable repository/service URLs, optional verification and 48 sample tasks agree between website manifest and companion catalog.
- Astro check: 0 errors, 0 warnings, 5 existing unused-import hints.
- Astro build: 672 pages. Strict link check: 0 broken internal paths across 1,161 HTML outputs. Strict design-drift check: 0 affected pages.
- Four website document/source mirrors passed synchronization checks. The page renders the verification status and explicit no-final-opinion/no-seal language without a link to an uncreated repository.
- New website source changes were backed up before editing. Prior review screenshots show version 0.2; their README identifies that limitation. No new visual browser review is claimed for the added static paragraph.

## Not performed or established

- No remote GitHub repository, commit, push, PR, issue or Actions run. Local Git repository initialized only. GitHub branch protections and workflow-approval settings require owner setup.
- No deployment, real operator registration, live AgentBook proof, production RPC availability check, remote D1 migration, payout, email or internal-system access.
- Local runtime was Node.js 24.8.0 on Windows. GitHub's configured Node.js 22/Linux job has not run remotely yet.
- Tests are not an independent security audit, professional engineering approval or assurance of legal protection. The real registered-wallet smoke test is a release condition before advertising a live verifier.
