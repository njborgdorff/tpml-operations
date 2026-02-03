import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { PlanReview } from '@/components/features/plan-review';
import { LogoutButton } from '@/components/features/logout-button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectReviewPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { client: true },
  });

  if (!project) {
    notFound();
  }

  if (!canAccessProject(project, session.user.id)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Projects
            </Link>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {session.user.name}
              </p>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PlanReview project={project} />
      </main>
    </div>
  );
}
