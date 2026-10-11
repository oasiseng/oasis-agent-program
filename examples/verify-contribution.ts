import { createAgentkitClient } from '@worldcoin/agentkit';
import { privateKeyToAccount } from 'viem/accounts';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Use a dedicated operator-controlled EOA registered in AgentBook. Never commit keys.
const { AGENT_PRIVATE_KEY, VERIFIER_ORIGIN, TASK_ID, SUBMISSION_URL, ARTIFACT_PATH } = process.env;
if (!AGENT_PRIVATE_KEY || !/^0x[0-9a-fA-F]{64}$/.test(AGENT_PRIVATE_KEY) || !VERIFIER_ORIGIN || !TASK_ID || !SUBMISSION_URL || !ARTIFACT_PATH) throw new Error('Set AGENT_PRIVATE_KEY, VERIFIER_ORIGIN, TASK_ID, SUBMISSION_URL and ARTIFACT_PATH in your process environment.');
const origin = new URL(VERIFIER_ORIGIN);
if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('Use HTTPS outside local development.');
if (origin.origin !== VERIFIER_ORIGIN || origin.username || origin.password) throw new Error('VERIFIER_ORIGIN must be an exact origin without a trailing slash.');
const account = privateKeyToAccount(AGENT_PRIVATE_KEY as `0x${string}`);
const client = createAgentkitClient({ signer: { address: account.address, chainId: 'eip155:480', type: 'eip191', signMessage: message => account.signMessage({ message }) } });
const contentSha256 = createHash('sha256').update(await readFile(ARTIFACT_PATH)).digest('hex');
const response = await client.fetch(`${origin.origin}/api/verify`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId: TASK_ID, submissionUrl: SUBMISSION_URL, contentSha256 }),
  signal: AbortSignal.timeout(30_000),
});
console.log(JSON.stringify(await response.json(), null, 2));
if (response.status !== 201) process.exitCode = 1;
