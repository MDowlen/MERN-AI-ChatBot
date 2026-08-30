import { getDeploymentOverview } from './deployments.js';
import { getEngineeringOverview, getPullRequestOverview } from './engineering.js';

const ALLOWED_SURFACES = new Set([
  'overview',
  'repositories',
  'pr-risk',
  'deployments',
  'incidents',
  'conversations',
  'health'
]);

function compactRepository(repo) {
  return {
    name: repo.name,
    repo: repo.repo,
    role: repo.role,
    status: repo.status,
    defaultBranch: repo.defaultBranch,
    latestCommit: repo.latestCommit
  };
}

function compactPr(pr) {
  return {
    number: pr.number,
    title: pr.title,
    draft: pr.draft,
    base: pr.base,
    head: pr.head,
    changedFiles: pr.changedFiles,
    additions: pr.additions,
    deletions: pr.deletions,
    combinedStatus: pr.combinedStatus,
    deterministicRisk: pr.deterministicRisk
  };
}

function compactDeployment(item) {
  if (!item) return null;
  return {
    environment: item.environment,
    shortSha: item.shortSha,
    state: item.state,
    ref: item.ref,
    createdAt: item.createdAt,
    environmentUrl: item.environmentUrl
  };
}

export async function buildCommandContext(requestedSurface = 'conversations') {
  const surface = ALLOWED_SURFACES.has(requestedSurface) ? requestedSurface : 'conversations';
  const context = {
    surface,
    generatedAt: new Date().toISOString(),
    authority: {
      deterministicFacts: 'Treat API-derived repository, PR, deployment, and health values as facts.',
      modelJudgment: 'Treat model explanations, recommendations, and causal interpretations as advisory unless separately verified.'
    }
  };

  if (surface === 'overview' || surface === 'repositories' || surface === 'health') {
    const overview = await getEngineeringOverview();
    context.repositories = overview.repositories.map(compactRepository);
    context.summary = overview.summary;
  }

  if (surface === 'pr-risk') {
    const prs = await getPullRequestOverview();
    context.pullRequests = prs.items.map(compactPr);
    context.prBoundary = prs.boundary;
  }

  if (surface === 'deployments') {
    const deployments = await getDeploymentOverview();
    context.deployments = {
      production: compactDeployment(deployments.latest.production),
      preview: compactDeployment(deployments.latest.preview),
      facts: deployments.facts,
      sampling: deployments.sampling,
      boundary: deployments.boundary
    };
  }

  if (surface === 'incidents') {
    context.incidentSpecialist = {
      name: 'ForgeIncident',
      runtime: 'Python',
      endpoint: '/api/incident',
      capability: 'signal correlation, evidence-backed RCA, falsifiers, and approval-aware remediation',
      contextMode: 'The current serverless profile can run signal-only RCA; repository context is an optional heavier profile.'
    };
  }

  if (surface === 'conversations') {
    context.note = 'No specialist surface was selected. Answer as the Nexa engineering command interface and distinguish known project facts from general guidance.';
  }

  return context;
}
