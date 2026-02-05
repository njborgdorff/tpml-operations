'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FolderOpen } from 'lucide-react'
import { ProjectContextMenu } from '@/components/project-context-menu'
import { useToast } from '@/hooks/use-toast'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'IN_PROGRESS' | 'COMPLETE' | 'APPROVED' | 'FINISHED'
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?view=active')
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project status')
      }

      toast({
        title: 'Status Updated',
        description: `Project status changed to ${newStatus.toLowerCase().replace('_', ' ')}.`,
      })

      fetchProjects()
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update project status',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="default">In Progress</Badge>
      case 'COMPLETE':
        return <Badge variant="secondary">Complete</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
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
          <h1 className="text-3xl font-bold mb-2">Active Projects</h1>
          <p className="text-muted-foreground">Manage your active projects</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Active Projects</h1>
            <p className="text-muted-foreground">
              Manage your active projects ({projects.length} project{projects.length !== 1 ? 's' : ''})
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Projects</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              You don't have any active projects yet. Create your first project to get started.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{project.name}</h3>
                      {getStatusBadge(project.status)}
                    </div>
                    {project.description && (
                      <p className="text-muted-foreground">{project.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDate(project.updatedAt)} • Owner: {project.user.name || project.user.email}
                    </p>
                  </div>
                  <ProjectContextMenu
                    project={project}
                    onStatusChange={handleStatusChange}
                    onRefresh={fetchProjects}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}