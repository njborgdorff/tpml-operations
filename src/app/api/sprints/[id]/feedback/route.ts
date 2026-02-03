import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { Inngest } from 'inngest';

// Initialize Inngest client for sending events
const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * POST /api/sprints/[id]/feedback
 *
 * Submit feedback for a completed sprint. This triggers the AI team to
 * review the feedback and potentially ask clarifying questions.
 * The dialog is stored in the sprint review for documentation.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { feedback, responseToQuestion } = body;

    if (!feedback && !responseToQuestion) {
      return NextResponse.json(
        { error: 'Feedback or responseToQuestion is required' },
        { status: 400 }
      );
    }

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          include: { client: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (!canAccessProject(sprint.project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get or create the current review's conversation log
    const latestReview = sprint.reviews[0];
    const existingLog = (latestReview?.conversationLog as FeedbackEntry[] | null) || [];

    // Add the new feedback/response to the conversation
    const timestamp = new Date().toISOString();
    const newEntry: FeedbackEntry = responseToQuestion
      ? {
          type: 'human_response',
          from: 'Owner',
          content: responseToQuestion,
          timestamp,
        }
      : {
          type: 'feedback',
          from: 'Owner',
          content: feedback,
          timestamp,
        };

    const updatedLog = [...existingLog, newEntry];

    // Update or create sprint review with the conversation (serialize for Prisma)
    const serializedLog = JSON.parse(JSON.stringify(updatedLog));
    let reviewId: string;
    if (latestReview) {
      await prisma.sprintReview.update({
        where: { id: latestReview.id },
        data: { conversationLog: serializedLog },
      });
      reviewId = latestReview.id;
    } else {
      const newReview = await prisma.sprintReview.create({
        data: {
          sprintId: id,
          conversationLog: serializedLog,
        },
      });
      reviewId = newReview.id;
    }

    // Emit event for AI team to process feedback
    try {
      await inngest.send({
        name: 'sprint/feedback_received',
        data: {
          projectId: sprint.projectId,
          projectName: sprint.project.name,
          projectSlug: sprint.project.slug,
          clientName: sprint.project.client.name,
          sprintId: sprint.id,
          sprintNumber: sprint.number,
          sprintName: sprint.name,
          sprintStatus: sprint.status,
          reviewId,
          feedbackType: responseToQuestion ? 'response' : 'feedback',
          content: responseToQuestion || feedback,
          conversationHistory: updatedLog,
        },
      });
      console.log(`[Sprints] Sent sprint/feedback_received event for ${sprint.project.name} Sprint ${sprint.number}`);
    } catch (err) {
      console.error('[Sprints] Failed to send Inngest event:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback received',
      reviewId,
      conversationLength: updatedLog.length,
    });
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sprints/[id]/feedback
 *
 * Get the feedback conversation history for a sprint.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, ownerId: true, implementerId: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (!canAccessProject(sprint.project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const latestReview = sprint.reviews[0];
    const conversationLog = (latestReview?.conversationLog as FeedbackEntry[] | null) || [];

    // Check if there's a pending question from the AI team
    const lastEntry = conversationLog[conversationLog.length - 1];
    const hasPendingQuestion = lastEntry?.type === 'ai_question';

    return NextResponse.json({
      sprintId: sprint.id,
      sprintNumber: sprint.number,
      sprintName: sprint.name,
      status: sprint.status,
      reviewId: latestReview?.id || null,
      conversation: conversationLog,
      hasPendingQuestion,
      pendingQuestion: hasPendingQuestion ? lastEntry : null,
    });
  } catch (error) {
    console.error('Failed to get feedback:', error);
    return NextResponse.json(
      { error: 'Failed to get feedback' },
      { status: 500 }
    );
  }
}

// Types for the conversation log
interface FeedbackEntry {
  type: 'feedback' | 'ai_question' | 'human_response' | 'ai_acknowledgment';
  from: string; // 'Owner', 'PM', 'CTO', 'Implementer', etc.
  content: string;
  timestamp: string;
  questionId?: string; // For tracking which question a response answers
}
