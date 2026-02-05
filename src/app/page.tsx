import { ProjectDashboard } from '@/components/project-dashboard'

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Finished Project Management</h1>
        <p className="text-muted-foreground">
          Track, organize, and archive your completed projects
        </p>
      </div>
      
      <ProjectDashboard />
    </div>
  )
}