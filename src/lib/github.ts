/**
 * GitHub repository creation for new projects.
 *
 * Uses GITHUB_TOKEN and derives the owner from GITHUB_REPO (owner/repo format).
 * Repos are created as private under the same owner/org.
 */

interface CreateRepoResult {
  url: string; // html_url e.g. https://github.com/owner/repo
  cloneUrl: string;
  fullName: string; // owner/repo
}

/**
 * Create a new private GitHub repository for a project.
 * Returns null (with a console warning) if GitHub is not configured.
 */
export async function createGitHubRepo(
  repoName: string,
  description: string
): Promise<CreateRepoResult | null> {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO; // e.g. "njborgdorff/tpml-operations"

  if (!githubToken || !githubRepo) {
    console.warn(
      '[GitHub] GITHUB_TOKEN or GITHUB_REPO not configured — skipping repo creation'
    );
    return null;
  }

  const owner = githubRepo.split('/')[0];
  if (!owner) {
    console.warn('[GitHub] Could not parse owner from GITHUB_REPO');
    return null;
  }

  // Determine whether the owner is an org or a user.
  // Try org endpoint first; if it 404s, fall back to user endpoint.
  let apiUrl: string;
  let isOrg = false;

  try {
    const orgCheck = await fetch(`https://api.github.com/orgs/${owner}`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    isOrg = orgCheck.ok;
  } catch {
    // Network error — assume user account
  }

  if (isOrg) {
    apiUrl = `https://api.github.com/orgs/${owner}/repos`;
  } else {
    apiUrl = 'https://api.github.com/user/repos';
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      description,
      private: true,
      auto_init: true, // creates an initial commit with README
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub repo creation failed (${response.status}): ${error}`);
  }

  const data = await response.json();

  return {
    url: data.html_url,
    cloneUrl: data.clone_url,
    fullName: data.full_name,
  };
}
