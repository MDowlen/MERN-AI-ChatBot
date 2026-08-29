const SYSTEM_PROMPT = `You are Nexa, the conversational interface for an AI Engineering Command Center.

The application surfaces repository metadata, deterministic PR risk facts, deployment evidence, system health, and a ForgeIncident specialist. Use the supplied WORKSPACE CONTEXT as the source of truth for those facts.

Rules:
- Clearly distinguish deterministic/API-derived facts from your interpretations.
- Never claim a semantic code defect merely because a PR has high churn or many files.
- Never claim a deployment caused an incident solely because it happened earlier.
- If evidence is incomplete, say what is missing.
- Production-changing actions such as rollback, traffic shifting, or destructive operations require explicit human authority.
- Keep answers practical and concise, but explain engineering reasoning when asked.`;

function contextualDemoReply(message, context = {}) {
  const lower = message.toLowerCase();
  const surface = context?.surface || 'conversations';

  if (surface === 'pr-risk' && context.pullRequests?.length) {
    const pr = context.pullRequests[0];
    const risk = pr.deterministicRisk || {};
    return `You are looking at PR #${pr.number}: “${pr.title}”. The deterministic surface is ${risk.band || 'unknown'} risk based on measurable facts such as ${pr.changedFiles} changed files, +${pr.additions}/-${pr.deletions} lines, and CI state ${pr.combinedStatus}. That does not prove a semantic defect; ForgePR is the specialist layer for grounded code-quality findings.`;
  }

  if (surface === 'deployments' && context.deployments) {
    const prod = context.deployments.production;
    const preview = context.deployments.preview;
    return `Deployment evidence shows production at ${prod?.shortSha || 'unknown'} (${prod?.state || 'unknown'}) and the latest preview at ${preview?.shortSha || 'unknown'} (${preview?.state || 'unknown'}). Different SHAs prove the preview is testing different source than production; they do not by themselves prove whether the preview is safer or riskier.`;
  }

  if (surface === 'incidents') {
    return 'The current Incident surface is backed by the ForgeIncident Python specialist. It can correlate supplied signals, rank evidence-backed hypotheses, list falsifiers, and produce approval-aware remediation. The lightweight serverless profile is signal-only unless the optional ForgeContext profile is installed.';
  }

  if (surface === 'repositories' && context.repositories?.length) {
    return `Nexa currently sees ${context.repositories.length} flagship repositories. ForgeContext owns grounded repository intelligence, ForgePR owns semantic PR review, ForgeIncident owns incident RCA, and Nexa owns orchestration and presentation.`;
  }

  if (lower.includes('mern')) {
    return 'Nexa still uses the MERN foundation: React is the interface, Express/Node owns the main API, and MongoDB persists conversations. The Command Center now also includes a Python serverless specialist for ForgeIncident.';
  }

  return `I received: “${message.slice(0, 180)}${message.length > 180 ? '…' : ''}”\n\nCurrent workspace surface: ${surface}. This deployment is using the deterministic demo assistant, so I can summarize the server-grounded workspace context but I will not invent specialist findings.`;
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && content?.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

export async function generateAssistantReply(message, history = [], workspaceContext = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return { content: contextualDemoReply(message, workspaceContext), provider: 'demo' };
  }

  const recentHistory = history.slice(-10).map((item) => ({
    role: item.role,
    content: item.content
  }));

  const groundedInput = [
    {
      role: 'user',
      content: `WORKSPACE CONTEXT (server-generated JSON):\n${JSON.stringify(workspaceContext, null, 2)}`
    },
    ...recentHistory,
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        instructions: SYSTEM_PROMPT,
        input: groundedInput,
        max_output_tokens: 700,
        store: false
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const payload = await response.json();
    const content = extractResponseText(payload);
    if (!content) throw new Error('OpenAI response did not contain text');
    return { content, provider: 'openai' };
  } catch (error) {
    console.error('AI provider unavailable; using contextual demo assistant:', error.message);
    return { content: contextualDemoReply(message, workspaceContext), provider: 'demo-fallback' };
  }
}
