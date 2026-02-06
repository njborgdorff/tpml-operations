import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function FinishedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id, status: 'FINISHED' },
    include: { client: true },
    orderBy: { archivedAt: 'desc' },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finished Projects</h1>
        <p className="text-muted-foreground">
          Archived projects ({projects.length})
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No finished projects yet. Use &quot;Move to Finished&quot; on a project to archive it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>{project.client.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      FINISHED
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {project.archivedAt
                        ? new Date(project.archivedAt).toLocaleDateString()
                        : new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
