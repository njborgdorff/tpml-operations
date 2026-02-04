import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

/**
 * POST /api/deploy
 *
 * Trigger deployment by merging the feature branch to master.
 * This endpoint can be extended to support different deployment methods:
 * - Vercel deploy hooks
 * - GitHub Actions
 * - Custom CI/CD webhooks
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { branch = 'claude/review-changes-slack-bot-3S6bK' } = body;

    // Check for Vercel deploy hook first
    const vercelDeployHook = process.env.VERCEL_DEPLOY_HOOK;
    if (vercelDeployHook) {
      // Trigger Vercel deployment
      const response = await fetch(vercelDeployHook, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Vercel deploy hook failed: ${response.status}`);
      }

      return NextResponse.json({
        success: true,
        method: 'vercel',
        message: 'Vercel deployment triggered',
      });
    }

    // Check for GitHub token to merge PR
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO; // e.g., "njborgdorff/tpml-operations"

    if (githubToken && githubRepo) {
      // Try to merge the branch via GitHub API
      const mergeResponse = await fetch(
        `https://api.github.com/repos/${githubRepo}/merges`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            base: 'master',
            head: branch,
            commit_message: `Deploy: Merge ${branch} to master`,
          }),
        }
      );

      if (!mergeResponse.ok) {
        const error = await mergeResponse.json();
        throw new Error(error.message || `GitHub merge failed: ${mergeResponse.status}`);
      }

      const mergeResult = await mergeResponse.json();

      return NextResponse.json({
        success: true,
        method: 'github',
        message: `Branch ${branch} merged to master`,
        sha: mergeResult.sha,
      });
    }

    // No deployment method configured
    return NextResponse.json({
      success: false,
      error: 'No deployment method configured',
      help: 'Set VERCEL_DEPLOY_HOOK or GITHUB_TOKEN + GITHUB_REPO environment variables',
      manualSteps: [
        `1. Go to GitHub: https://github.com/${githubRepo || 'your-repo'}/pulls`,
        `2. Create PR from ${branch} to master`,
        '3. Merge the PR',
        '4. Deployment will trigger automatically (if CI/CD is configured)',
      ],
    }, { status: 400 });
  } catch (error) {
    console.error('Deploy failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deploy
 *
 * Get deployment status and configuration info
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasVercelHook = !!process.env.VERCEL_DEPLOY_HOOK;
    const hasGithubToken = !!process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;

    return NextResponse.json({
      configured: hasVercelHook || hasGithubToken,
      methods: {
        vercel: hasVercelHook,
        github: hasGithubToken && !!githubRepo,
      },
      repo: githubRepo || null,
    });
  } catch (error) {
    console.error('Deploy status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check deployment status' },
      { status: 500 }
    );
  }
}
