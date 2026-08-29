const PORTFOLIO_REPOS = [
  {
    id: 'nexa',
    name: 'Nexa',
    repo: 'MDowlen/MERN-AI-ChatBot',
    role: 'AI engineering command center',
    capability: 'product'
  },
  {
    id: 'context',
    name: 'ForgeContext',
    repo: 'MDowlen/forge-context',
    role: 'grounded repository intelligence',
    capability: 'context'
  },
  {
    id: 'pr',
    name: 'ForgePR',
    repo: 'MDowlen/forge-pr',
    role: 'pull-request risk and CI review',
    capability: 'pr-review'
  },
  {
    id: 'incident',
    name: 'ForgeIncident',
    repo: 'MDowlen/MDowlen-forge-incident',
    role: 'incident triage and evidence-backed RCA',
    capability: 'incident-rca'
  }
];

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nexa-command-center'
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
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

async function repositorySnapshot(definition) {
  try {
    const [repo, commits] = await Promise.all([
      githubJson(`/repos/${definition.repo}`),
      githubJson(`/repos/${definition.repo}/commits?per_page=1`)
    ]);
    const latest = Array.isArray(commits) ? commits[0] : null;
    return {
      ...definition,
      visibility: repo.visibility,
      defaultBranch: repo.default_branch,
      language: repo.language,
      updatedAt: repo.pushed_at,
      openIssues: repo.open_issues_count,
      latestCommit: latest
        ? {
            sha: latest.sha.slice(0, 7),
            message: latest.commit?.message?.split('\n')[0] || 'Commit',
            committedAt: latest.commit?.committer?.date || null
          }
        : null,
      status: 'available'
    };
  } catch (error) {
    return {
      ...definition,
      status: 'unavailable',
      error: error.message
    };
  }
}

export async function getEngineeringOverview() {
  const repositories = await Promise.all(PORTFOLIO_REPOS.map(repositorySnapshot));
  const available = repositories.filter((item) => item.status === 'available').length;

  return {
    generatedAt: new Date().toISOString(),
    mode: process.env.GITHUB_TOKEN ? 'authenticated-github' : 'public-github',
    summary: {
      repositories: repositories.length,
      available,
      unavailable: repositories.length - available,
      specialistSystems: 3
    },
    repositories,
    surfaces: [
      { id: 'overview', label: 'Overview', status: 'live' },
      { id: 'repositories', label: 'Repositories', status: 'live' },
      { id: 'pr-risk', label: 'PR Risk', status: 'next-splinter' },
      { id: 'deployments', label: 'Deployments', status: 'next-splinter' },
      { id: 'incidents', label: 'Incidents', status: 'next-splinter' },
      { id: 'conversations', label: 'Conversations', status: 'live' },
      { id: 'health', label: 'System Health', status: 'live' }
    ]
  };
}
