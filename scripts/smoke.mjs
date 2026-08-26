import app from '../api/index.js';

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const health = await fetch(`${base}/api/health`).then((r) => r.json());
  if (health.status !== 'ok') throw new Error('health failed');

  const created = await fetch(`${base}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }).then((r) => r.json());

  const reply = await fetch(`${base}/api/conversations/${created.id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Explain MERN in one paragraph.' })
  }).then((r) => r.json());

  if (!reply?.conversation?.messages?.length) throw new Error('chat flow failed');
  console.log(JSON.stringify({ health, messages: reply.conversation.messages.length, provider: reply.provider }, null, 2));
} finally {
  server.close();
}
