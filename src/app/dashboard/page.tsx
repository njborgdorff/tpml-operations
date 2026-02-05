"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  FolderOpen, 
  CheckSquare, 
  Clock, 
  Users,
  Plus,
  ArrowRight
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
}

interface RecentProject {
  id: string
  name: string
  status: string
  taskStats: {
    total: number
    done: number
  }
}

interface RecentTask {
  id: string
  title: string
  status: string
  priority: string
  project: {
    name: string
    id: string
  }
  dueDate: string | null
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
  })
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
    
    if (status === "authenticated") {
      fetchDashboardData()
    }
  }, [status, router])

  const fetchDashboardData = async () => {
    try {
      const [projectsResponse, tasksResponse] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/tasks")
      ])

      if (projectsResponse.ok && tasksResponse.ok) {
        const projects = await projectsResponse.json()
        const tasks = await tasksResponse.json()

        // Calculate stats
        const totalProjects = projects.length
        const activeProjects = projects.filter((p: any) => p.status === "ACTIVE").length
        const totalTasks = tasks.length
        const completedTasks = tasks.filter((t: any) => t.status === "DONE").length
        const pendingTasks = tasks.filter((t: any) => t.status !== "DONE").length
        const overdueTasks = tasks.filter((t: any) => {
          if (!t.dueDate || t.status === "DONE") return false
          return new Date(t.dueDate) < new Date()
        }).length

        setStats({
          totalProjects,
          activeProjects,
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
        })

        // Set recent projects (limit to 3)
        setRecentProjects(projects.slice(0, 3).map((p: any) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          taskStats: p.taskStats
        })))

        // Set recent tasks (limit to 5)
        setRecentTasks(tasks.slice(0, 5))
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading" || isLoading) {
    return <LoadingSpinner />
  }

  const getProgressPercentage = (done: number, total: number) => {
    if (total === 0) return 0
    return Math.round((done / total) * 100)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 text-red-800"
      case "HIGH": return "bg-orange-100 text-orange-800"
      case "MEDIUM": return "bg-blue-100 text-blue-800"
      case "LOW": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {session?.user?.name || session?.user?.email}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeProjects} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueTasks} overdue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall progress
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Projects</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              Your most recently updated projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No projects yet</p>
                <Link href="/projects">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                        {project.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                          {project.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {project.taskStats.total} tasks
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {getProgressPercentage(project.taskStats.done, project.taskStats.total)}%
                        </div>
                        <Progress 
                          value={getProgressPercentage(project.taskStats.done, project.taskStats.total)} 
                          className="w-16 h-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Tasks</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              Your most recent task activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No tasks yet</p>
                <Link href="/projects">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <Link href={`/projects/${task.project.id}`} className="font-medium hover:underline text-sm">
                        {task.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        in {task.project.name}
                      </p>
                    </div>
                    {task.dueDate && (
                      <div className="text-xs text-gray-500">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}