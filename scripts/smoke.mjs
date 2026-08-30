import app from '../api/index.js';

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const healthResponse = await fetch(`${base}/api/health`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || health.status !== 'ok') throw new Error('health failed');

  const engineeringResponse = await fetch(`${base}/api/engineering/overview`);
  const engineering = await engineeringResponse.json();
  if (!engineeringResponse.ok) throw new Error('engineering overview failed');
  if (engineering?.summary?.repositories !== 4) {
    throw new Error('engineering overview did not return the four flagship repositories');
  }
  if (!Array.isArray(engineering.repositories) || engineering.repositories.length !== 4) {
    throw new Error('engineering repository list failed');
  }

  const prResponse = await fetch(`${base}/api/engineering/prs`);
  const prOverview = await prResponse.json();
  if (!prResponse.ok) throw new Error('PR facts endpoint failed');
  if (!Array.isArray(prOverview.items)) throw new Error('PR facts endpoint must return an items array');
  if (!prOverview.boundary?.facts || !prOverview.boundary?.specialist) {
    throw new Error('PR facts endpoint must expose its authority boundary');
  }

  const deploymentResponse = await fetch(`${base}/api/engineering/deployments`);
  const deploymentOverview = await deploymentResponse.json();
  if (!deploymentResponse.ok) throw new Error('deployment evidence endpoint failed');
  if (!Array.isArray(deploymentOverview.items)) {
    throw new Error('deployment evidence endpoint must return an items array');
  }
  if (!deploymentOverview.boundary?.evidence || !deploymentOverview.sampling?.productionQueriedSeparately) {
    throw new Error('deployment endpoint must expose evidence and sampling boundaries');
  }

  const created = await fetch(`${base}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }).then((r) => r.json());

  const replyResponse = await fetch(`${base}/api/conversations/${created.id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'What does the current PR evidence tell me?',
      workspace: { surface: 'pr-risk' }
    })
  });
  const reply = await replyResponse.json();

  if (!replyResponse.ok) throw new Error('workspace-grounded chat flow failed');
  if (!reply?.conversation?.messages?.length) throw new Error('chat flow failed');
  if (reply?.workspace?.surface !== 'pr-risk') {
    throw new Error('assistant did not preserve requested workspace surface');
  }
  if (!reply.conversation.messages.at(-1)?.content?.toLowerCase().includes('deterministic')) {
    throw new Error('demo assistant did not use PR workspace evidence');
  }

  console.log(JSON.stringify({
    health,
    engineering: {
      mode: engineering.mode,
      repositories: engineering.summary.repositories,
      available: engineering.summary.available
    },
    prFacts: {
      count: prOverview.count,
      contractValid: true
    },
    deployments: {
      recent: deploymentOverview.count,
      production: deploymentOverview.latest?.production?.shortSha || null,
      preview: deploymentOverview.latest?.preview?.shortSha || null,
      contractValid: true
    },
    workspaceChat: {
      surface: reply.workspace.surface,
      provider: reply.provider,
      groundedContractValid: true
    },
    messages: reply.conversation.messages.length
  }, null, 2));
} finally {
  server.close();
}
