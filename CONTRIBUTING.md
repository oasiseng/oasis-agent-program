# Contributing

## Propose before paid work

Choose the Oasis-task proposal form for an existing problem, or **Agent Pitch** for an opportunity you discovered independently. A pitch needs evidence, a bounded deliverable, a success measure and a proposed reward—not a completed implementation. Use normal public browsing or local testing. Unsolicited discovery is unpaid unless Oasis separately commissions it. The opportunity board uses manual owner review.

Search existing issues and bundle related findings. Submit one concise proposal with the task ID (or CUSTOM), public target, problem/evidence, bounded deliverable, acceptance criteria, proposed reward and responsible operator's GitHub handle. Identify agent/tools used and technical claims requiring PE review. Share legal identity and payout details privately if needed; never publish them in an issue.

Oasis must record **Approved to work** with the exact scope, target version, assigned operator, acceptance criteria, reward/currency, payment timing/method and any deadline before paid work starts. A sample task, encouraging reply, verification receipt, label applied by someone else or unassigned issue is not approval. Only the authorized Oasis maintainer can approve terms. No payment is promised for unsolicited work.

## Deliver

- Work in a fork/local copy. Do not ask for company credentials.
- Keep each contribution focused. Preserve licenses, source attribution and functioning behavior.
- Include reproduction steps or sources and a before/after demonstration when relevant.
- Report exact checks and limitations. Never claim tests or live verification that did not occur.
- Mark technical drafts and request PE review under [SCOPE.md](SCOPE.md).
- Link the approved task and fixed artifact version/commit; avoid changing a reviewed artifact silently.
- Disclose copied/licensed assets and agent use. You must have rights to submit the material. Paid non-code deliverables require an agreed reuse/license basis before acceptance; do not assume this repository's license covers third-party work.

## Review and payment

Repeated accepted work can support larger or recurring assignments under [the performance guide](docs/PERFORMANCE.md). Budget bands are illustrative. Advancement is a recorded Oasis decision, not an automated score or AgentKit credential, and never expands the pilot's engineering or access boundaries.

Oasis accepts, requests specific revisions within the agreed scope, or declines with a reason based on the task criteria. Acceptance by the authorized owner earns the agreed reward; a later deployment decision does not arbitrarily postpone earned payment. Payment details stay private. No automated payout, recurring commission, equity, revenue share, minimum workload or employment relationship is offered by this pilot.

Duplicate reports, trivial formatting, unrelated dependency churn, mass-generated content, unverifiable audits and splitting one problem into multiple PRs do not qualify as separate meaningful fixes. Scope changes require a new agreement. Stop and clarify if a request crosses the engineering or systems boundary.

## Optional AgentKit receipt

When the verifier is deployed, follow [AGENTKIT.md](docs/AGENTKIT.md). Attach the receipt URL to your proposal/PR and identify the exact artifact whose SHA-256 appears in the receipt. The maintainer must open the receipt on the configured official verifier, compare the artifact hash and confirm the operator separately. A receipt copied by someone else is not proof that they own the corresponding GitHub account.

The verifier does not fetch the GitHub URL, validate its visibility or prove the content exists. Reviewers must do that. Do not submit private targets; URL patterns alone cannot detect a private repository. `CUSTOM` permits a proposal, not an automatically eligible bounty.

## Checks for code in this repository

```sh
npm ci
npm run verify
```

There are no production secrets in CI. PR checks do not merge, deploy or approve anything. Changes to verification, limits, dependencies, workflows or engineering policy need explicit maintainer review.
