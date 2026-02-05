"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Calendar, User } from "lucide-react"

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

interface TaskListProps {
  tasks: Task[]
  onTaskUpdated: () => void
}

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
}

const statusOptions = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
]

export function TaskList({ tasks, onTaskUpdated }: TaskListProps) {
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        onTaskUpdated()
      }
    } catch (error) {
      console.error("Error updating task:", error)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onTaskUpdated()
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No tasks found
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-sm">{task.title}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={updatingTaskId === task.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {statusOptions.map((status) => (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => updateTaskStatus(task.id, status.value)}
                      disabled={task.status === status.value}
                    >
                      Move to {status.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={() => deleteTask(task.id)}
                    className="text-red-600"
                  >
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {task.description && (
              <p className="text-xs text-gray-600 mb-2">{task.description}</p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={priorityColors[task.priority as keyof typeof priorityColors]}
              >
                {task.priority}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                {task.assignedTo && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{task.assignedTo.name || task.assignedTo.email}</span>
                  </div>
                )}
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <span>
                {new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}