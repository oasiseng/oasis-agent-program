CREATE TABLE challenges (
  nonce TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  info TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX challenges_expiry ON challenges(expires_at);
CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  nonce TEXT NOT NULL UNIQUE,
  human_hash TEXT NOT NULL,
  task_id TEXT NOT NULL,
  submission_url TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0, 1))
);
CREATE INDEX receipts_quota ON receipts(human_hash, created_at);
CREATE UNIQUE INDEX receipts_contribution ON receipts(human_hash, task_id, submission_url, content_sha256);
CREATE INDEX receipts_expiry ON receipts(created_at);
CREATE TABLE request_limits (
  ip_hash TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  uses INTEGER NOT NULL,
  PRIMARY KEY(ip_hash, bucket)
);
