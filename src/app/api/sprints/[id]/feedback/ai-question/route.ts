import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/sprints/[id]/feedback/ai-question
 *
 * Internal endpoint for AI roles to add questions or acknowledgments
 * to the sprint review conversation log.
 *
 * Note: This is called by Inngest functions, not directly by users.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reviewId, role, question, acknowledgment } = body;

    if (!reviewId || !role) {
      return NextResponse.json(
        { error: 'reviewId and role are required' },
        { status: 400 }
      );
    }

    if (!question && !acknowledgment) {
      return NextResponse.json(
        { error: 'Either question or acknowledgment is required' },
        { status: 400 }
      );
    }

    // Verify sprint exists
    const sprint = await prisma.sprint.findUnique({
      where: { id },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Get the review
    const review = await prisma.sprintReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Get existing conversation log
    const existingLog = (review.conversationLog as FeedbackEntry[] | null) || [];
    const timestamp = new Date().toISOString();

    // Add the new entry
    const newEntry: FeedbackEntry = question
      ? {
          type: 'ai_question',
          from: role,
          content: question,
          timestamp,
          questionId: `q_${Date.now()}`,
        }
      : {
          type: 'ai_acknowledgment',
          from: role,
          content: acknowledgment,
          timestamp,
        };

    const updatedLog = [...existingLog, newEntry];

    // Update the review (serialize to JSON-compatible format for Prisma)
    await prisma.sprintReview.update({
      where: { id: reviewId },
      data: { conversationLog: JSON.parse(JSON.stringify(updatedLog)) },
    });

    return NextResponse.json({
      success: true,
      entryType: question ? 'question' : 'acknowledgment',
      conversationLength: updatedLog.length,
    });
  } catch (error) {
    console.error('Failed to add AI entry to feedback:', error);
    return NextResponse.json(
      { error: 'Failed to add AI entry' },
      { status: 500 }
    );
  }
}

// Types for the conversation log
interface FeedbackEntry {
  type: 'feedback' | 'ai_question' | 'human_response' | 'ai_acknowledgment';
  from: string;
  content: string;
  timestamp: string;
  questionId?: string;
}
