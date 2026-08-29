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

function allowedRepo(repoName) {
  const match = PORTFOLIO_REPOS.find((item) => item.repo === repoName);
  if (!match) throw new Error('Repository is not in the Nexa engineering allowlist');
  return match;
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

function deterministicRiskFacts(pr, combinedStatus) {
  const changedFiles = Number(pr.changed_files || 0);
  const additions = Number(pr.additions || 0);
  const deletions = Number(pr.deletions || 0);
  const churn = additions + deletions;
  const facts = [];
  let score = 0;

  if (changedFiles >= 20) {
    score += 3;
    facts.push({ code: 'large-file-surface', severity: 'high', detail: `${changedFiles} files changed` });
  } else if (changedFiles >= 8) {
    score += 2;
    facts.push({ code: 'medium-file-surface', severity: 'warning', detail: `${changedFiles} files changed` });
  }

  if (churn >= 800) {
    score += 3;
    facts.push({ code: 'large-code-churn', severity: 'high', detail: `${churn} lines added/deleted` });
  } else if (churn >= 250) {
    score += 2;
    facts.push({ code: 'medium-code-churn', severity: 'warning', detail: `${churn} lines added/deleted` });
  }

  if (combinedStatus?.state === 'failure' || combinedStatus?.state === 'error') {
    score += 5;
    facts.push({ code: 'ci-failing', severity: 'critical', detail: `Commit status is ${combinedStatus.state}` });
  } else if (combinedStatus?.state === 'pending') {
    score += 1;
    facts.push({ code: 'ci-pending', severity: 'info', detail: 'Commit checks are still pending' });
  }

  const band = score >= 5 ? 'high' : score >= 2 ? 'medium' : 'low';
  return { score, band, facts };
}

export async function getPullRequestOverview(repoName = 'MDowlen/MERN-AI-ChatBot') {
  const definition = allowedRepo(repoName);
  const pulls = await githubJson(`/repos/${definition.repo}/pulls?state=open&sort=updated&direction=desc&per_page=10`);

  const items = await Promise.all(pulls.map(async (pull) => {
    const [detail, combinedStatus] = await Promise.all([
      githubJson(`/repos/${definition.repo}/pulls/${pull.number}`),
      githubJson(`/repos/${definition.repo}/commits/${pull.head.sha}/status`).catch(() => null)
    ]);
    const risk = deterministicRiskFacts(detail, combinedStatus);
    return {
      number: detail.number,
      title: detail.title,
      draft: detail.draft,
      author: detail.user?.login || 'unknown',
      base: detail.base?.ref,
      head: detail.head?.ref,
      headSha: detail.head?.sha,
      updatedAt: detail.updated_at,
      changedFiles: detail.changed_files,
      additions: detail.additions,
      deletions: detail.deletions,
      commits: detail.commits,
      comments: detail.comments + detail.review_comments,
      mergeableState: detail.mergeable_state,
      combinedStatus: combinedStatus?.state || 'unknown',
      deterministicRisk: risk,
      url: detail.html_url
    };
  }));

  return {
    generatedAt: new Date().toISOString(),
    repository: definition,
    mode: process.env.GITHUB_TOKEN ? 'authenticated-github' : 'public-github',
    count: items.length,
    items,
    boundary: {
      facts: 'Nexa computes only deterministic size/churn/CI facts in this layer.',
      specialist: 'ForgePR remains the specialist for grounded quality/safety findings and generated-test workflows.'
    }
  };
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
      { id: 'pr-risk', label: 'PR Risk', status: 'live' },
      { id: 'deployments', label: 'Deployments', status: 'next-splinter' },
      { id: 'incidents', label: 'Incidents', status: 'next-splinter' },
      { id: 'conversations', label: 'Conversations', status: 'live' },
      { id: 'health', label: 'System Health', status: 'live' }
    ]
  };
}
