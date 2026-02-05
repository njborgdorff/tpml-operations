import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProjectDashboard } from '@/components/project-dashboard';
import { ProjectStatus } from '@prisma/client';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Fetch initial active projects
  const initialProjects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
      status: {
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 12, // Initial load limit
  });

  return (
    <div>
      <ProjectDashboard 
        initialProjects={initialProjects}
        onCreateProject={() => {
          // This would open a modal or navigate to create page
          console.log('Create project clicked');
        }}
      />
    </div>
  );
}