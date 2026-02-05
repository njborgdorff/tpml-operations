'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Archive, FolderOpen } from 'lucide-react'
import { ProjectContextMenu } from '@/components/project-context-menu'
import { useToast } from '@/hooks/use-toast'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'FINISHED'
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function FinishedPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchFinishedProjects = async () => {
    try {
      const response = await fetch('/api/projects?view=finished')
      if (!response.ok) {
        throw new Error('Failed to fetch finished projects')
      }
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load finished projects',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFinishedProjects()
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Finished Projects</h1>
          <p className="text-muted-foreground">Your archived and completed projects</p>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Archive className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-bold">Finished Projects</h1>
        </div>
        <p className="text-muted-foreground">
          Your archived and completed projects ({projects.length} project{projects.length !== 1 ? 's' : ''})
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Finished Projects</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You haven't archived any projects yet. Projects that are marked as "Approved" 
              can be moved to the Finished folder from the main dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{project.name}</h3>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                        <Archive className="h-3 w-3 mr-1" />
                        Finished
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-muted-foreground">{project.description}</p>
                    )}
                  </div>
                  <ProjectContextMenu
                    project={project}
                    onRefresh={fetchFinishedProjects}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    <span>Archived: {formatDate(project.archivedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Owner: {project.user.name || project.user.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}