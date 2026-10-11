import { buildAgentkitSchema, createAgentBookVerifier, formatSIWEMessage, parseAgentkitHeader, validateAgentkitMessage, type AgentkitExtension, type AgentkitPayload } from '@worldcoin/agentkit';
import { createPublicClient, http, recoverMessageAddress } from 'viem';
import catalog from '../catalog/tasks.json';

const MAX_BODY = 4096;
const CHALLENGE_MS = 5 * 60_000;
const RETENTION_MS = 90 * 86_400_000;
const TASKS = new Set(catalog.categories.flatMap(c => c.tasks.map(t => t.id)));
const SCOPE = 'Human-backed agent signature only. Not GitHub account ownership, task approval, engineering review, publication authority or payment eligibility.';
type Contribution = { taskId: string; submissionUrl: string; contentSha256: string };
type Challenge = { nonce: string; payload_hash: string; info: string; expires_at: number };
type Receipt = { id: string; task_id: string; submission_url: string; content_sha256: string; created_at: number; revoked: number };
type Dependencies = { lookupHuman(address: string, env: Env): Promise<string | null> };
class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" } });
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const digest = async (text: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
async function pseudonym(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}
function limit(value: string, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new HttpError(503, 'Invalid server limits.');
  return n;
}
function originFor(env: Env) {
  const url = new URL(env.PUBLIC_ORIGIN);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((!local && url.protocol !== 'https:') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new HttpError(503, 'Invalid public origin.');
  if (!env.HUMAN_HASH_SECRET || env.HUMAN_HASH_SECRET.length < 32 || env.HUMAN_HASH_SECRET.includes('REPLACE_')) throw new HttpError(503, 'Verification secret not configured.');
  return url.origin;
}
async function readContribution(request: Request): Promise<Contribution> {
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') throw new HttpError(415, 'Use application/json.');
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new HttpError(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Body required.');
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const next = await reader.read(); if (next.done) break;
    size += next.value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new HttpError(413, 'Request too large.'); }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'Invalid JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Object required.');
  const b = body as Record<string, unknown>;
  if (Object.keys(b).sort().join(',') !== 'contentSha256,submissionUrl,taskId' || typeof b.taskId !== 'string' || (!TASKS.has(b.taskId) && b.taskId !== 'CUSTOM') || typeof b.contentSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(b.contentSha256) || typeof b.submissionUrl !== 'string' || !/^https:\/\/github\.com\/oasiseng\/[A-Za-z0-9_.-]+\/(issues|pull)\/[1-9][0-9]*$/.test(b.submissionUrl)) throw new HttpError(400, 'Supply a catalog task ID (or CUSTOM), an oasiseng GitHub issue/PR URL, and a lowercase SHA-256 digest.');
  return { taskId: b.taskId, submissionUrl: b.submissionUrl, contentSha256: b.contentSha256 };
}
const defaults: Dependencies = {
  async lookupHuman(address, env) {
    const client = createPublicClient({ transport: http(env.WORLD_RPC_URL, { timeout: 5000, retryCount: 0 }) });
    return createAgentBookVerifier({ client }).lookupHuman(address);
  },
};
function publicReceipt(row: Receipt) {
  return { id: row.id, status: row.revoked ? 'revoked' : 'verified', taskId: row.task_id, submissionUrl: row.submission_url, contentSha256: row.content_sha256, verifiedAt: new Date(row.created_at).toISOString(), expiresAt: new Date(row.created_at + RETENTION_MS).toISOString(), scope: SCOPE };
}
export function createHandler(deps: Dependencies = defaults) {
  return async (request: Request, env: Env): Promise<Response> => {
    try {
      const path = new URL(request.url).pathname;
      if (path === '/health' && request.method === 'GET') return json({ service: 'oasis-agent-program', verificationEnabled: env.PROGRAM_ENABLED === 'true', automatedAcceptance: false, automatedPayouts: false });
      if (path === '/catalog.json' && request.method === 'GET') {
        // Website-relative routes must not accidentally resolve on this verifier host.
        const { humanPage, spec, markdown, customerIntake, ...program } = catalog;
        return json({ ...program, websiteRoutes: { origin: null, status: 'deployment-unverified', humanPage, spec, markdown, customerIntake } });
      }
      if (/^\/receipts\/[a-f0-9-]{36}$/.test(path) && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT id, task_id, submission_url, content_sha256, created_at, revoked FROM receipts WHERE id = ? AND created_at > ?').bind(path.slice(10), Date.now() - RETENTION_MS).first<Receipt>();
        return row ? json(publicReceipt(row)) : json({ error: 'Receipt not found or expired.' }, 404);
      }
      if (path !== '/api/verify') return json({ error: 'Not found.' }, 404);
      if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
      if (env.PROGRAM_ENABLED !== 'true') throw new HttpError(503, 'Verification is disabled. Contact Oasis using the published contribution process.');
      const origin = originFor(env);
      if (request.headers.has('origin') && request.headers.get('origin') !== origin) throw new HttpError(403, 'Origin not allowed.');
      const dailyLimit = limit(env.DAILY_HUMAN_LIMIT, 100);
      const minuteLimit = limit(env.IP_MINUTE_LIMIT, 1000);
      const now = Date.now(); const bucket = Math.floor(now / 60_000);
      const ipHash = await pseudonym(env.HUMAN_HASH_SECRET, `ip:${request.headers.get('cf-connecting-ip') ?? 'local'}`);
      const rate = await env.DB.prepare('INSERT INTO request_limits (ip_hash, bucket, uses) VALUES (?, ?, 1) ON CONFLICT(ip_hash, bucket) DO UPDATE SET uses = uses + 1 WHERE uses < ? RETURNING uses').bind(ipHash, bucket, minuteLimit).first();
      if (!rate) throw new HttpError(429, 'Request limit reached. Retry in the next minute.');
      const contribution = await readContribution(request);
      const payloadHash = await digest(JSON.stringify(contribution));
      const header = request.headers.get('agentkit');
      if (!header) {
        const nonce = crypto.randomUUID().replaceAll('-', '');
        const info = { domain: new URL(origin).host, uri: `${origin}/api/verify?submission=${payloadHash}`, statement: `Verify public contribution ${payloadHash}. No authorization, engineering approval or payment is granted.`, version: '1', nonce, issuedAt: new Date(now).toISOString(), expirationTime: new Date(now + CHALLENGE_MS).toISOString() };
        await env.DB.prepare('INSERT INTO challenges (nonce, payload_hash, info, expires_at) VALUES (?, ?, ?, ?)').bind(nonce, payloadHash, JSON.stringify(info), now + CHALLENGE_MS).run();
        const extension: AgentkitExtension = { info, supportedChains: [{ chainId: 'eip155:480', type: 'eip191', signatureScheme: 'eip191' }], schema: buildAgentkitSchema() };
        return json({ x402Version: 2, error: 'Human-backed agent proof required. This challenge does not request payment.', accepts: [], extensions: { agentkit: extension } }, 402);
      }
      if (header.length > 12_000) throw new HttpError(413, 'Proof too large.');
      let proof: AgentkitPayload;
      try { proof = parseAgentkitHeader(header); } catch { throw new HttpError(400, 'Malformed AgentKit proof.'); }
      const stored = await env.DB.prepare('SELECT nonce, payload_hash, info, expires_at FROM challenges WHERE nonce = ?').bind(proof.nonce).first<Challenge>();
      if (!stored || stored.payload_hash !== payloadHash || stored.expires_at <= now) throw new HttpError(401, 'Unknown, expired or mismatched challenge.');
      const info = JSON.parse(stored.info) as AgentkitExtension['info'];
      for (const key of ['domain', 'uri', 'statement', 'version', 'nonce', 'issuedAt', 'expirationTime'] as const) {
        if (proof[key] !== info[key]) throw new HttpError(401, 'Signed challenge does not match.');
      }
      if (proof.chainId !== 'eip155:480' || proof.type !== 'eip191' || (proof.signatureScheme && proof.signatureScheme !== 'eip191') || proof.notBefore || proof.requestId || proof.resources) throw new HttpError(401, 'Unsupported proof fields or signer. This pilot supports EOA EIP-191 only.');
      if (!(await validateAgentkitMessage(proof, info.uri, { maxAge: CHALLENGE_MS })).valid) throw new HttpError(401, 'Invalid proof lifetime.');
      if (await env.DB.prepare('SELECT id FROM receipts WHERE nonce = ?').bind(proof.nonce).first()) throw new HttpError(409, 'Challenge already consumed.');
      try {
        const address = await recoverMessageAddress({ message: formatSIWEMessage(proof, proof.address), signature: proof.signature as `0x${string}` });
        if (address.toLowerCase() !== proof.address.toLowerCase()) throw new Error('Mismatch');
      } catch { throw new HttpError(401, 'Invalid EIP-191 signature.'); }
      let human: string | null;
      try { human = await deps.lookupHuman(proof.address, env); } catch { throw new HttpError(503, 'AgentBook lookup unavailable. Retry later.'); }
      if (!human) throw new HttpError(403, 'Human backing could not be verified. Registration or RPC availability may need attention.');
      const humanHash = await pseudonym(env.HUMAN_HASH_SECRET, `human:${human}`);
      const id = crypto.randomUUID(); const acceptedAt = Date.now();
      const dayStart = Math.floor(acceptedAt / 86_400_000) * 86_400_000;
      // One SQLite write checks expiry, quota and nonce together. No check-then-increment race.
      const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO receipts (id, nonce, human_hash, task_id, submission_url, content_sha256, created_at)
        SELECT ?, nonce, ?, ?, ?, ?, ? FROM challenges
        WHERE nonce = ? AND payload_hash = ? AND expires_at > ?
        AND NOT EXISTS (SELECT 1 FROM receipts WHERE nonce = ?)
        AND (SELECT COUNT(*) FROM receipts WHERE human_hash = ? AND created_at >= ?) < ?
        RETURNING id, task_id, submission_url, content_sha256, created_at, revoked`)
        .bind(id, humanHash, contribution.taskId, contribution.submissionUrl, contribution.contentSha256, acceptedAt, proof.nonce, payloadHash, acceptedAt, proof.nonce, humanHash, dayStart, dailyLimit).first<Receipt>();
      if (!inserted) {
        if (await env.DB.prepare('SELECT id FROM receipts WHERE nonce = ?').bind(proof.nonce).first()) throw new HttpError(409, 'Challenge already consumed.');
        if (await env.DB.prepare('SELECT id FROM receipts WHERE human_hash = ? AND task_id = ? AND submission_url = ? AND content_sha256 = ?').bind(humanHash, contribution.taskId, contribution.submissionUrl, contribution.contentSha256).first()) throw new HttpError(409, 'This contribution already has a receipt. Use the original receipt or submit a changed artifact.');
        if (stored.expires_at <= acceptedAt) throw new HttpError(401, 'Challenge expired.');
        throw new HttpError(429, 'Daily human-backed verification limit reached.');
      }
      return json({ ...publicReceipt(inserted), receiptUrl: `${origin}/receipts/${id}` }, 201);
    } catch (error) {
      // Never log proof headers, wallet addresses, human identifiers, body or secret values.
      return json({ error: error instanceof HttpError ? error.message : 'Verification temporarily unavailable.' }, error instanceof HttpError ? error.status : 503);
    }
  };
}
export default {
  fetch: createHandler(),
  async scheduled(_controller, env) {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM challenges WHERE expires_at <= ?').bind(now),
      env.DB.prepare('DELETE FROM request_limits WHERE bucket < ?').bind(Math.floor(now / 60_000) - 1440),
      env.DB.prepare('DELETE FROM receipts WHERE created_at <= ?').bind(now - RETENTION_MS),
    ]);
  },
} satisfies ExportedHandler<Env>;
