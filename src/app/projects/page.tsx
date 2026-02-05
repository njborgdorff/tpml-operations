"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Users, Calendar, MoreHorizontal } from "lucide-react"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  createdBy: {
    name: string | null
    email: string
  }
  members: Array<{
    user: {
      name: string | null
      email: string
    }
  }>
  taskStats: {
    total: number
    todo: number
    inProgress: number
    done: number
  }
}

export default function ProjectsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
    
    if (status === "authenticated") {
      fetchProjects()
    }
  }, [status, router])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectCreated = () => {
    setShowCreateDialog(false)
    fetchProjects()
  }

  const getProgressPercentage = (taskStats: Project["taskStats"]) => {
    if (taskStats.total === 0) return 0
    return Math.round((taskStats.done / taskStats.total) * 100)
  }

  if (status === "loading" || isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-gray-600 mt-2">Manage and track your projects</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first project</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{getProgressPercentage(project.taskStats)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(project.taskStats)} />
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <div className="text-center">
                      <div className="font-medium">{project.taskStats.total}</div>
                      <div className="text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{project.taskStats.todo}</div>
                      <div className="text-gray-500">Todo</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{project.taskStats.inProgress}</div>
                      <div className="text-gray-500">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{project.taskStats.done}</div>
                      <div className="text-gray-500">Done</div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="mr-1 h-4 w-4" />
                  {project.members.length} member{project.members.length !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="mr-1 h-4 w-4" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  )
}