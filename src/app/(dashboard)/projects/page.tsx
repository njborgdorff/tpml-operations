import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id, status: { not: 'FINISHED' } },
    include: { client: true },
    orderBy: { updatedAt: 'desc' },
  });

  const pendingDecisions = projects.filter(
    (p) => p.status === 'REVIEW' && p.approvalStatus === 'PENDING'
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your AI-staffed software development projects
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Pending Decisions Alert */}
      {pendingDecisions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-800">
              {pendingDecisions.length} Decision{pendingDecisions.length > 1 ? 's' : ''} Waiting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {pendingDecisions.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.slug}/review`}
                    className="text-orange-700 hover:underline"
                  >
                    {project.name} — Review plan and approve
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No projects yet. Create your first project to get started.
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const href = project.status === 'REVIEW' && project.approvalStatus === 'PENDING'
              ? `/projects/${project.slug}/review`
              : `/projects/${project.slug}`;
            return (
              <Link key={project.id} href={href}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.client.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={project.status} />
                      <span className="text-sm text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    INTAKE: 'bg-gray-100 text-gray-800',
    PLANNING: 'bg-blue-100 text-blue-800',
    REVIEW: 'bg-orange-100 text-orange-800',
    APPROVED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    ACTIVE: 'bg-purple-100 text-purple-800',
    COMPLETE: 'bg-teal-100 text-teal-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    FINISHED: 'bg-slate-100 text-slate-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}
