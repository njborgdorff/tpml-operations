import { Inngest } from 'inngest';
import { prisma } from '@/lib/db/prisma';
import { NextResponse } from 'next/server';
import {
  success,
  notFound,
  validationError,
  internalError,
} from '@/lib/api/responses';

// Create Inngest client
const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * GET /api/workflow/qa-verify
 *
 * Handles QA verification from Slack button clicks.
 * Query params: projectId, sprintNumber, verified
 *
 * If verified=true: sends event and shows confirmation
 * If verified=false: shows form to enter issue details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const sprintNumberStr = searchParams.get('sprintNumber');
    const verifiedStr = searchParams.get('verified');

    if (!projectId) {
      return new NextResponse(renderHtmlPage('Error', '<p>Missing projectId parameter</p>'), {
        headers: { 'Content-Type': 'text/html' },
        status: 400,
      });
    }

    const verified = verifiedStr === 'true';
    const sprintNumber = sprintNumberStr ? parseInt(sprintNumberStr, 10) : undefined;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        slug: true,
        name: true,
        sprints: {
          where: sprintNumber ? { number: sprintNumber } : { status: 'IN_PROGRESS' },
          take: 1,
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!project) {
      return new NextResponse(renderHtmlPage('Error', '<p>Project not found</p>'), {
        headers: { 'Content-Type': 'text/html' },
        status: 404,
      });
    }

    const sprint = project.sprints[0];
    const actualSprintNumber = sprint?.number || sprintNumber || 1;

    if (verified) {
      // QA passed - send event immediately
      await inngest.send({
        name: 'qa/verified',
        data: {
          projectId,
          projectSlug: project.slug,
          projectName: project.name,
          sprintNumber: actualSprintNumber,
          sprintId: sprint?.id,
          verified: true,
          notes: '',
          issuesFound: '',
          verifiedAt: new Date().toISOString(),
        },
      });

      console.log(`[QA Verify] Project: ${project.name}, Sprint: ${actualSprintNumber}, Verified: true`);

      return new NextResponse(renderHtmlPage(
        'QA Verified ✅',
        `
        <div style="text-align: center; padding: 40px;">
          <h1 style="color: #22c55e; font-size: 48px; margin-bottom: 20px;">✅</h1>
          <h2>QA Verification Confirmed</h2>
          <p><strong>${project.name}</strong> - Sprint ${actualSprintNumber}</p>
          <p style="color: #666; margin-top: 20px;">The workflow will now continue to deployment preparation.</p>
          <p style="margin-top: 30px;"><a href="javascript:window.close()" style="color: #0066cc;">Close this window</a></p>
        </div>
        `
      ), {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      // QA failed - show form to enter issues
      return new NextResponse(renderHtmlPage(
        'Report QA Issues',
        `
        <div style="max-width: 600px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #ef4444;">🐛 Report QA Issues</h1>
          <p><strong>${project.name}</strong> - Sprint ${actualSprintNumber}</p>

          <form method="POST" action="/api/workflow/qa-verify" style="margin-top: 30px;">
            <input type="hidden" name="projectId" value="${projectId}" />
            <input type="hidden" name="sprintNumber" value="${actualSprintNumber}" />
            <input type="hidden" name="verified" value="false" />

            <div style="margin-bottom: 20px;">
              <label for="issuesFound" style="display: block; font-weight: bold; margin-bottom: 8px;">
                Describe the issues found:
              </label>
              <textarea
                id="issuesFound"
                name="issuesFound"
                rows="6"
                style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; font-size: 14px;"
                placeholder="What issues did you find during testing? Be specific about steps to reproduce..."
                required
              ></textarea>
            </div>

            <div style="margin-bottom: 20px;">
              <label for="notes" style="display: block; font-weight: bold; margin-bottom: 8px;">
                Additional notes (optional):
              </label>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; font-size: 14px;"
                placeholder="Any additional context or suggestions..."
              ></textarea>
            </div>

            <button
              type="submit"
              style="background: #ef4444; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold;"
            >
              Submit Issues
            </button>
          </form>
        </div>
        `
      ), {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  } catch (error) {
    console.error('QA verify GET failed:', error);
    return new NextResponse(renderHtmlPage('Error', '<p>An error occurred processing your request.</p>'), {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
  }
}

function renderHtmlPage(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - TPML QA</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
  `;
}

/**
 * POST /api/workflow/qa-verify
 *
 * Endpoint for human QA verification. Called when the human submits
 * the issues form or via API.
 *
 * Request body (form or JSON):
 * {
 *   projectId: string,       // Required: Project ID
 *   sprintNumber: number,    // Required: Sprint number
 *   verified: boolean,       // Required: Whether QA passed (true) or issues found (false)
 *   notes?: string,          // Optional: Notes from the tester
 *   issuesFound?: string,    // Optional: Description of issues (if verified=false)
 * }
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let projectId: string;
    let sprintNumber: number | undefined;
    let verified: boolean;
    let notes: string = '';
    let issuesFound: string = '';
    let isFormSubmission = false;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Handle form data from HTML form submission
      isFormSubmission = true;
      const formData = await request.formData();
      projectId = formData.get('projectId') as string;
      const sprintNumberStr = formData.get('sprintNumber') as string;
      sprintNumber = sprintNumberStr ? parseInt(sprintNumberStr, 10) : undefined;
      verified = formData.get('verified') === 'true';
      notes = (formData.get('notes') as string) || '';
      issuesFound = (formData.get('issuesFound') as string) || '';
    } else {
      // Handle JSON body
      const body = await request.json();
      projectId = body.projectId;
      sprintNumber = body.sprintNumber;
      verified = body.verified;
      notes = body.notes || '';
      issuesFound = body.issuesFound || '';
    }

    // Validate required fields
    if (!projectId) {
      if (isFormSubmission) {
        return new NextResponse(renderHtmlPage('Error', '<p>Missing projectId</p>'), {
          headers: { 'Content-Type': 'text/html' },
          status: 400,
        });
      }
      return validationError('projectId is required');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        slug: true,
        name: true,
        sprints: {
          where: sprintNumber ? { number: sprintNumber } : { status: 'IN_PROGRESS' },
          take: 1,
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!project) {
      if (isFormSubmission) {
        return new NextResponse(renderHtmlPage('Error', '<p>Project not found</p>'), {
          headers: { 'Content-Type': 'text/html' },
          status: 404,
        });
      }
      return notFound('Project');
    }

    const sprint = project.sprints[0];
    const actualSprintNumber = sprint?.number || sprintNumber || 1;

    // Send the QA verification event to Inngest
    await inngest.send({
      name: 'qa/verified',
      data: {
        projectId,
        projectSlug: project.slug,
        projectName: project.name,
        sprintNumber: actualSprintNumber,
        sprintId: sprint?.id,
        verified,
        notes,
        issuesFound: verified ? '' : issuesFound,
        verifiedAt: new Date().toISOString(),
      },
    });

    // Log the verification
    console.log(`[QA Verify] Project: ${project.name}, Sprint: ${actualSprintNumber}, Verified: ${verified}`);

    // Return HTML confirmation for form submissions
    if (isFormSubmission) {
      const title = verified ? 'QA Verified' : 'Issues Reported';
      const icon = verified ? '✅' : '🐛';
      const color = verified ? '#22c55e' : '#ef4444';
      const message = verified
        ? 'The workflow will now continue to deployment preparation.'
        : 'The issues have been reported. The workflow will loop back to the Implementer to fix them.';

      return new NextResponse(renderHtmlPage(
        title,
        `
        <div style="text-align: center; padding: 40px;">
          <h1 style="color: ${color}; font-size: 48px; margin-bottom: 20px;">${icon}</h1>
          <h2>${title}</h2>
          <p><strong>${project.name}</strong> - Sprint ${actualSprintNumber}</p>
          ${issuesFound ? `<div style="text-align: left; background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong>Issues reported:</strong><br/>${issuesFound.replace(/\n/g, '<br/>')}</div>` : ''}
          <p style="color: #666; margin-top: 20px;">${message}</p>
          <p style="margin-top: 30px;"><a href="javascript:window.close()" style="color: #0066cc;">Close this window</a></p>
        </div>
        `
      ), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return success({
      message: verified ? 'QA verification confirmed' : 'QA issues reported',
      projectId,
      projectName: project.name,
      sprintNumber: actualSprintNumber,
      verified,
      eventSent: 'qa/verified',
    });
  } catch (error) {
    console.error('QA verify endpoint failed:', error);
    return internalError('Failed to process QA verification');
  }
}
