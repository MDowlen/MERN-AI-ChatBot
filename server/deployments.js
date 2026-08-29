const NEXA_REPO = 'MDowlen/MERN-AI-ChatBot';

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nexa-command-center'
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function githubJson(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`GitHub ${response.status}: ${detail.slice(0, 180)}`);
  }
  return response.json();
}

async function deploymentSnapshot(deployment) {
  const statuses = await githubJson(
    `/repos/${NEXA_REPO}/deployments/${deployment.id}/statuses?per_page=1`
  ).catch(() => []);
  const status = Array.isArray(statuses) ? statuses[0] : null;

  return {
    id: deployment.id,
    environment: deployment.environment || 'unknown',
    ref: deployment.ref || null,
    sha: deployment.sha || null,
    shortSha: deployment.sha ? deployment.sha.slice(0, 7) : null,
    task: deployment.task || 'deploy',
    createdAt: deployment.created_at,
    updatedAt: deployment.updated_at,
    transient: Boolean(deployment.transient_environment),
    production: Boolean(deployment.production_environment),
    state: status?.state || 'unknown',
    description: status?.description || deployment.description || '',
    environmentUrl: status?.environment_url || status?.target_url || null,
    logUrl: status?.log_url || null,
    creator: deployment.creator?.login || null
  };
}

export async function getDeploymentOverview() {
  const deployments = await githubJson(`/repos/${NEXA_REPO}/deployments?per_page=12`);
  const items = await Promise.all(deployments.map(deploymentSnapshot));

  const production = items.find((item) => item.production || item.environment === 'Production') || null;
  const preview = items.find((item) => item.transient || item.environment !== 'Production') || null;

  const facts = [];
  if (production) {
    facts.push({
      code: 'production-release',
      detail: `${production.shortSha || 'unknown'} is the latest visible production deployment`,
      state: production.state
    });
  }
  if (preview) {
    facts.push({
      code: 'preview-release',
      detail: `${preview.shortSha || 'unknown'} is the latest visible preview deployment`,
      state: preview.state
    });
  }
  if (production && preview && production.sha !== preview.sha) {
    facts.push({
      code: 'preview-ahead-of-production',
      detail: 'The preview and production deployments point to different commits.',
      state: 'info'
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    repository: NEXA_REPO,
    mode: process.env.GITHUB_TOKEN ? 'authenticated-github' : 'public-github',
    count: items.length,
    items,
    latest: { production, preview },
    facts,
    boundary: {
      evidence: 'This surface uses GitHub deployment/status evidence that is visible without provider secrets.',
      provider: 'Vercel-specific build/runtime logs remain a separate authenticated provider integration.'
    }
  };
}
