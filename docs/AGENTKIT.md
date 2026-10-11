# World AgentKit verification contract

Uses **World's `@worldcoin/agentkit`**, not OpenAI AgentKit. Package versions are pinned in package-lock.json. No payment facilitator, automatic payout, x402 charge or internal Oasis credential is configured.

## Trust model

A valid receipt means an EOA signed the exact challenge and AgentBook returned a human-backing identifier at that time. It does not identify a named person, prove a GitHub account belongs to them, verify their authorship or licenses, approve their engineering work, assign a task, authorize publication or promise payment. A signed assertion can still contain an incorrect URL/hash; reviewers must check the actual artifact.

This pilot deliberately supports **EIP-191 EOA signatures on `eip155:480`** only. Smart-contract wallets/ERC-1271, EIP-6492, Solana, other chains, transaction signing and human-in-the-loop action authorization are not implemented. Use a dedicated registered EOA for this client. Expand wallet support only with corresponding verification and abuse tests.

## Operator flow

1. Register an operator-controlled wallet through the current [World AgentKit registration documentation](https://docs.world.org/agents/agent-kit/integrate). Registration is performed by the operator; this repository does not create an identity, register a wallet or send a transaction.
2. Prepare a public issue/PR under `github.com/oasiseng/`. For a website finding, use this program repository's issue. Do not put private data in the issue or artifact.
3. Save the exact proposal or patch artifact locally. For code, use a stable patch/deliverable and record the commit. Later edits require a new hash and receipt.
4. Set the example client's environment variables and run `npm run agent:verify`.
5. Attach the receipt URL and artifact/commit reference to the proposal. Oasis confirms the operator separately and reviews the work.

| Client variable | Meaning |
| --- | --- |
| AGENT_PRIVATE_KEY | Dedicated registered EOA key, supplied through a secure process environment; never paste into a public issue or commit |
| VERIFIER_ORIGIN | Exact HTTPS origin published by Oasis, no trailing slash; local localhost HTTP is allowed for development |
| TASK_ID | Catalog ID or CUSTOM |
| SUBMISSION_URL | Exact public oasiseng GitHub issue/PR URL; no query string or fragment |
| ARTIFACT_PATH | File whose bytes are hashed; no private customer content |

`examples/verify-contribution.ts` reads the file, computes SHA-256, requests a challenge, signs the AgentKit message and retries once using the SDK. It sends only task ID, public URL and hash, not file contents. It prints the receipt or an error, never the key or proof. Do not use the public deterministic test key for real operations.

## API

- `GET /health`: enablement flag; this is not a dependency readiness or registration check.
- `GET /catalog.json`: versioned sample tasks and policies. Website-only routes are grouped under `websiteRoutes` with an unset origin and unverified deployment status; they are not routes on the verifier.
- `POST /api/verify`: JSON `{ "taskId": "FIX-01", "submissionUrl": "https://github.com/oasiseng/REPOSITORY/issues/1", "contentSha256": "64 lowercase hex characters" }`.
- `GET /receipts/{id}`: public receipt with status, task/URL/hash, verification/expiry times and a scope disclaimer. No wallet address or human identifier.

First POST returns **402** with `extensions.agentkit`, an empty `accepts` array and an explicit no-payment message. The SDK signs and repeats the same POST with an `agentkit` header. A successful verification returns **201** with a receipt URL. This protocol's 402 is a proof challenge, not a fee or customer payment flow.

| Status | Meaning |
| --- | --- |
| 400 / 415 | Malformed data or unsupported content type |
| 401 | Unknown/expired/altered challenge, unsupported signer, or invalid signature |
| 403 | Foreign browser origin or human backing could not be verified |
| 409 | Nonce already consumed or identical human/task/URL/hash already receipted |
| 413 | Body exceeds 4 KiB or proof header exceeds 12,000 characters |
| 429 | Per-IP minute or per-human UTC-day limit reached |
| 503 | Disabled, configuration missing, or dependency unavailable |

AgentBook may return null both for a missing registration and for RPC errors. The 403 wording deliberately does not claim to distinguish those cases. A thrown lookup error returns 503. No receipt is issued in either case.

## Enforcement

- Server-issued random nonce, five-minute expiration, exact stored domain/URI/statement/timestamps, and a digest bound to all three request fields.
- Cryptographic EIP-191 recovery checks signer address locally; the AgentKit SDK parses/formats/validates the message. An AgentBook lookup uses a five-second RPC timeout and no transport retry.
- A single D1 insert checks challenge expiry and per-human quota, with unique nonce and human/task/URL/hash constraints. Concurrent requests cannot issue duplicate receipts or overshoot the human limit.
- Default limit: five successful receipts per human per UTC day across wallets; twenty requests per IP/minute including challenges and retries. IP sharing can cause collisions; a distributed network can evade a per-IP limit. Use Cloudflare edge controls for public exposure as described in deployment.
- No user-provided fetch destination: the service does not fetch submissions or artifacts. RPC origin is owner configuration. Browser cross-origin requests are rejected; server-to-server agents use the SDK. There is no broad CORS permission.
- All responses use no-store and restrictive content headers. No GitHub write token, internal-system connection or auto-acceptance endpoint exists.

Exact duplicates are blocked while their receipt is retained. Similar prose, renamed artifacts, different hashes and duplicate business ideas still require human review. This is not a semantic plagiarism or Sybil-proof work-quality system.

## Data and retention

D1 stores the public contribution pointer/hash, receipt, short-lived challenge and HMAC-pseudonymized human/IP identifiers. HMAC uses a private service secret; the stored hashes are still pseudonymous identifiers, not a claim of legal anonymization. Wallet/proof/signature values are processed but not stored by this code. The upstream RPC provider can observe the requested wallet lookup.

Daily cleanup removes expired challenges, IP counters older than approximately one day, and receipts older than 90 days. Expired receipts stop resolving even before cleanup. Cloudflare backups/platform retention are separate and should be configured by the owner. Verification is historical; it is not refreshed automatically when an AgentBook registration changes.

The code does not log bodies, headers or identifiers. Platform/account logging settings remain the owner's responsibility. Public receipts are accessible to anyone with their URL; do not submit confidential URLs or hashes. Revoked receipts remain visibly revoked until expiry and still count toward that day's quota.

## Official references

- [World integration guide](https://docs.world.org/agents/agent-kit/integrate)
- [World SDK reference](https://docs.world.org/agents/agent-kit/sdk-reference)
- [World AgentKit source](https://github.com/worldcoin/agentkit)
- [Cloudflare D1 Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/)

References checked 2026-10-11. Follow the pinned SDK and update tests when changing protocol/package versions.
