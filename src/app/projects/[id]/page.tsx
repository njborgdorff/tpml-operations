"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, ArrowLeft, Users, Calendar } from "lucide-react"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { TaskList } from "@/components/tasks/task-list"
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
    role: string
  }>
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  createdAt: string
  dueDate: string | null
  assignedTo: {
    name: string | null
    email: string
  } | null
  project: {
    name: string
    id: string
  }
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
    
    if (status === "authenticated") {
      fetchProject()
      fetchTasks()
    }
  }, [status, router, params.id])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      } else if (response.status === 404) {
        router.push("/projects")
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?projectId=${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskCreated = () => {
    setShowCreateTaskDialog(false)
    fetchTasks()
  }

  const handleTaskUpdated = () => {
    fetchTasks()
  }

  const todoTasks = tasks.filter(task => task.status === "TODO")
  const inProgressTasks = tasks.filter(task => task.status === "IN_PROGRESS")
  const doneTasks = tasks.filter(task => task.status === "DONE")

  if (status === "loading" || isLoading) {
    return <LoadingSpinner />
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Project not found</h1>
          <p className="text-gray-500 mt-2">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => router.push("/projects")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/projects")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
          </div>
          <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
            {project.status}
          </Badge>
        </div>

        <div className="flex gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Users className="mr-1 h-4 w-4" />
            {project.members.length} member{project.members.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            Created {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="list">Task List</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>
          <Button onClick={() => setShowCreateTaskDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  To Do
                  <Badge variant="secondary">{todoTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList tasks={todoTasks} onTaskUpdated={handleTaskUpdated} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  In Progress
                  <Badge variant="secondary">{inProgressTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList tasks={inProgressTasks} onTaskUpdated={handleTaskUpdated} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Done
                  <Badge variant="secondary">{doneTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList tasks={doneTasks} onTaskUpdated={handleTaskUpdated} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Tasks ({tasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList tasks={tasks} onTaskUpdated={handleTaskUpdated} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Project Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.members.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{member.user.name || member.user.email}</div>
                      <div className="text-sm text-gray-500">{member.user.email}</div>
                    </div>
                    <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateTaskDialog
        open={showCreateTaskDialog}
        onOpenChange={setShowCreateTaskDialog}
        onTaskCreated={handleTaskCreated}
        projectId={params.id}
        projectMembers={project.members}
      />
    </div>
  )
}