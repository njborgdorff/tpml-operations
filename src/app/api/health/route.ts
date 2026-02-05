import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test database connection
    await prisma.user.findFirst();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: {
        'project-status-tracking': 'implemented',
        'dashboard-ui-status-display': 'implemented', 
        'basic-project-filtering': 'implemented',
        'status-history-logging': 'implemented'
      },
      sprint: 'Sprint 1 - Foundation Complete'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}