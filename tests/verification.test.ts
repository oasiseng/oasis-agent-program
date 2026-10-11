import { env } from 'cloudflare:workers';
import { applyD1Migrations, type D1Migration } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentkitClient, type AgentkitExtension } from '@worldcoin/agentkit';
import { privateKeyToAccount } from 'viem/accounts';
import worker, { createHandler } from '../src/index';

// Public deterministic fixture, NOT an operational wallet. Never fund it.
const account = privateKeyToAccount(`0x${'1'.repeat(64)}`);
const signer = createAgentkitClient({ signer: { address: account.address, chainId: 'eip155:480', type: 'eip191', signMessage: message => account.signMessage({ message }) } });
const body = { taskId: 'FIX-01', submissionUrl: 'https://github.com/oasiseng/example/issues/1', contentSha256: 'a'.repeat(64) };
const lookup = vi.fn(async (): Promise<string | null> => 'anonymous-human-fixture');
const handler = createHandler({ lookupHuman: lookup });
const testEnv = env as Env & { TEST_MIGRATIONS: D1Migration[] };
const request = (value: unknown = body, header?: string) => new Request('https://verify.example.com/api/verify', { method: 'POST', headers: { 'content-type': 'application/json', ...(header ? { agentkit: header } : {}) }, body: JSON.stringify(value) });
async function proof(value = body) {
  const response = await handler(request(value), testEnv);
  expect(response.status).toBe(402);
  const data = await response.json() as { extensions: { agentkit: AgentkitExtension } };
  return { extension: data.extensions.agentkit, header: await signer.createHeader(data.extensions.agentkit) };
}
beforeAll(async () => { await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS); });
beforeEach(async () => {
  await testEnv.DB.batch(['receipts', 'challenges', 'request_limits'].map(table => testEnv.DB.prepare(`DELETE FROM ${table}`)));
  lookup.mockReset().mockResolvedValue('anonymous-human-fixture');
});
describe('AgentKit verification with real signatures and local D1', () => {
  it('serves a bounded catalog without implying website routes exist on the verifier', async () => {
    const response = await handler(new Request('https://verify.example.com/catalog.json'), testEnv);
    const data = await response.json() as { categories: unknown[]; humanPage?: string; websiteRoutes: { status: string } };
    expect(data.categories).toHaveLength(6);
    expect(data.humanPage).toBeUndefined();
    expect(data.websiteRoutes.status).toBe('deployment-unverified');
    expect(lookup).not.toHaveBeenCalled();
  });
  it('fails closed while disabled or secret missing', async () => {
    expect((await handler(request(), { ...testEnv, PROGRAM_ENABLED: 'false' })).status).toBe(503);
    expect((await handler(request(), { ...testEnv, HUMAN_HASH_SECRET: '' })).status).toBe(503);
    expect(lookup).not.toHaveBeenCalled();
  });
  it('verifies through the SDK fetch retry and returns a bounded public receipt', async () => {
    const client = createAgentkitClient({ signer: { address: account.address, chainId: 'eip155:480', type: 'eip191', signMessage: message => account.signMessage({ message }) }, fetch: (input, init) => handler(new Request(input, init), testEnv) });
    const response = await client.fetch('https://verify.example.com/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect(response.status).toBe(201);
    const result = await response.json() as { receiptUrl: string; status: string };
    expect(result.status).toBe('verified');
    const publicText = await (await handler(new Request(result.receiptUrl), testEnv)).text();
    expect(publicText).toContain('Not GitHub account ownership');
    expect(publicText).not.toContain('anonymous-human-fixture');
    expect(publicText).not.toContain(account.address);
    const stored = await testEnv.DB.prepare('SELECT human_hash FROM receipts').first<{ human_hash: string }>();
    expect(stored?.human_hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it('rejects changed content, invented challenge and tampered signature', async () => {
    const p = await proof();
    expect((await handler(request({ ...body, contentSha256: 'b'.repeat(64) }, p.header), testEnv)).status).toBe(401);
    const tamper = (fields: object) => btoa(JSON.stringify({ ...JSON.parse(atob(p.header)), ...fields }));
    expect((await handler(request(body, tamper({ nonce: 'unknownnonce' })), testEnv)).status).toBe(401);
    expect((await handler(request(body, tamper({ signature: `0x${'0'.repeat(130)}` })), testEnv)).status).toBe(401);
    expect((await handler(request(body, tamper({ domain: 'attacker.example' })), testEnv)).status).toBe(401);
    expect(lookup).not.toHaveBeenCalled();
  });
  it('rejects expired and extended challenges', async () => {
    const p = await proof();
    await testEnv.DB.prepare('UPDATE challenges SET expires_at = 0').run();
    expect((await handler(request(body, p.header), testEnv)).status).toBe(401);
    const q = await proof();
    const changed = { ...q.extension, info: { ...q.extension.info, expirationTime: new Date(Date.now() + 86_400_000).toISOString() } };
    expect((await handler(request(body, await signer.createHeader(changed)), testEnv)).status).toBe(401);
  });
  it('consumes one nonce once under concurrent replay', async () => {
    const p = await proof();
    const responses = await Promise.all(Array.from({ length: 4 }, () => handler(request(body, p.header), testEnv)));
    expect(responses.map(r => r.status).sort()).toEqual([201, 409, 409, 409]);
  });
  it('enforces the per-human quota atomically across concurrent proofs', async () => {
    const bodies = Array.from({ length: 7 }, (_, i) => ({ ...body, contentSha256: String(i).repeat(64) }));
    const proofs = await Promise.all(bodies.map(b => proof(b)));
    const responses = await Promise.all(proofs.map((p, i) => handler(request(bodies[i], p.header), testEnv)));
    expect(responses.filter(r => r.status === 201)).toHaveLength(5);
    expect(responses.filter(r => r.status === 429)).toHaveLength(2);
  });
  it('rejects the same contribution signed with a fresh nonce', async () => {
    const p = await proof();
    const q = await proof();
    const responses = await Promise.all([p, q].map(x => handler(request(body, x.header), testEnv)));
    expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
  });
  it('fails closed on missing registration or lookup failure', async () => {
    const p = await proof();
    lookup.mockResolvedValueOnce(null);
    expect((await handler(request(body, p.header), testEnv)).status).toBe(403);
    lookup.mockRejectedValueOnce(new Error('RPC fixture'));
    expect((await handler(request(body, p.header), testEnv)).status).toBe(503);
    expect(await testEnv.DB.prepare('SELECT id FROM receipts').first()).toBeNull();
  });
  it('limits requests and validates input without lookup', async () => {
    expect((await handler(request({ ...body, taskId: 'FAKE-01' }), testEnv)).status).toBe(400);
    expect((await handler(request({ ...body, submissionUrl: 'https://github.com.evil.test/oasiseng/a/issues/1' }), testEnv)).status).toBe(400);
    expect((await handler(request({ ...body, extra: 'x'.repeat(5000) }), testEnv)).status).toBe(413);
    expect((await handler(request(body, 'invalid'), testEnv)).status).toBe(400);
    const foreign = request(); foreign.headers.set('origin', 'https://attacker.example');
    expect((await handler(foreign, testEnv)).status).toBe(403);
    await testEnv.DB.prepare('DELETE FROM request_limits').run();
    const e = { ...testEnv, IP_MINUTE_LIMIT: '1' };
    expect((await handler(request(), e)).status).toBe(402);
    expect((await handler(request(), e)).status).toBe(429);
    expect(lookup).not.toHaveBeenCalled();
  });
  it('supports revocation and retention cleanup without granting acceptance', async () => {
    const p = await proof();
    const result = await (await handler(request(body, p.header), testEnv)).json() as { id: string; receiptUrl: string };
    await testEnv.DB.prepare('UPDATE receipts SET revoked = 1 WHERE id = ?').bind(result.id).run();
    expect(await (await handler(new Request(result.receiptUrl), testEnv)).json()).toMatchObject({ status: 'revoked' });
    await testEnv.DB.prepare('UPDATE receipts SET created_at = 0').run();
    await worker.scheduled({} as ScheduledController, testEnv);
    expect((await handler(new Request(result.receiptUrl), testEnv)).status).toBe(404);
  });
});
