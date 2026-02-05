import { Suspense } from "react"
import { db } from "@/lib/db"
import { ProjectDashboard } from "@/components/project-dashboard"
import { RefreshCw } from "lucide-react"

// Mock current user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "user_1"

async function getProjects() {
  try {
    const projects = await db.project.findMany({
      where: {
        userId: MOCK_USER_ID
      },
      include: {
        user: true,
        statusHistory: {
          include: {
            user: true
          },
          orderBy: {
            changedAt: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    return projects
  } catch (error) {
    console.error("Error fetching projects:", error)
    return []
  }
}

async function ensureMockUser() {
  try {
    const existingUser = await db.user.findUnique({
      where: { id: MOCK_USER_ID }
    })

    if (!existingUser) {
      await db.user.create({
        data: {
          id: MOCK_USER_ID,
          email: "demo@tpml.com",
          name: "Demo User",
          role: "user"
        }
      })
    }
  } catch (error) {
    console.error("Error ensuring mock user:", error)
  }
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="inline-flex items-center text-muted-foreground">
        <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
        Loading dashboard...
      </div>
    </div>
  )
}

export default async function HomePage() {
  // Ensure mock user exists for demo purposes
  await ensureMockUser()
  
  const projects = await getProjects()

  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={<LoadingSpinner />}>
        <ProjectDashboard 
          initialProjects={projects} 
          currentUserId={MOCK_USER_ID}
        />
      </Suspense>
    </main>
  )
}