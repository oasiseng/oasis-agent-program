# Low-maintenance owner workflow

1. Review new proposals in a batch. Group duplicates and close out-of-scope submissions with a short reason.
2. Choose at most the amount of work you want reviewed. Confirm a bounded task using [the approval template](APPROVED-TASK-TEMPLATE.md).
3. Review artifacts against agreed criteria using [REVIEW.md](../REVIEW.md). Keep technical release under the responsible PE.
4. Record acceptance and payment separately. Do not automate merging, engineering approval or payment from a verification receipt or issue label.
5. Measure accepted useful changes, review minutes, corrections and spend. Keep only categories that save effort or create demonstrable value.

Suggested issue labels to create manually: `proposal`, `needs-scope`, `approved-to-work`, `in-review`, `needs-pe-review`, `accepted`, `declined`, `duplicate`. Labels summarize a decision; the authorized maintainer's recorded approval is authoritative. No active bounty is created merely by publishing the sample catalog.

## Receipt review

Use the official verifier origin, never an arbitrary lookalike supplied by a contributor. Read the receipt, check not revoked/expired, compare the URL and the SHA-256 of the exact artifact, and separately confirm the human operator's GitHub handle. Do not download/run unknown artifacts on a machine with client credentials simply to verify a hash. Review untrusted code in an isolated environment.

## Revocation

There is deliberately no public admin endpoint. The Cloudflare account owner can revoke a specific receipt using a prepared administrative database operation. In the D1 console, substitute a reviewed receipt UUID:

```sql
UPDATE receipts SET revoked = 1 WHERE id = 'RECEIPT_UUID';
SELECT id, revoked FROM receipts WHERE id = 'RECEIPT_UUID';
```

Read the public receipt afterward to verify `status: revoked`. Revocation does not cancel already accepted bounty terms or automatically resolve an incident. Keep a private reason/evidence record. Do not delete receipts to reset quotas or reissue a revoked artifact.

## Routine health

Watch request errors, lookup availability, database usage and cleanup execution. Health reports enablement only, not dependency readiness. The scheduled cleanup runs daily at 03:17 UTC. No inbox monitor or recurring automation is included. Avoid collecting more operator information than needed; payout/account details stay private.

Rotating HUMAN_HASH_SECRET changes all future pseudonyms and effectively resets human/IP limit identity. Use a controlled maintenance window with verification disabled; document the rotation and assess retained records. Changing limits or registration policy requires docs/tests updates. Keep the service on a dedicated account-scoped deployment with only its own D1 binding.
