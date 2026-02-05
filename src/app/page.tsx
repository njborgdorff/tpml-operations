'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectsDashboard } from '@/components/projects/projects-dashboard';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';

// Create a client
const queryClient = new QueryClient();

export default function HomePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <ProjectsDashboard 
          onCreateProject={() => setIsCreateDialogOpen(true)} 
        />
        
        <CreateProjectDialog 
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    </QueryClientProvider>
  );
}