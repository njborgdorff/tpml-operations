'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ProjectDashboard } from '@/components/project-dashboard';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';

export default function DemoPage() {
  const { data: session, status } = useSession();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-4">
            You need to be authenticated to access the project dashboard.
          </p>
          <Button onClick={() => window.location.href = '/auth/signin'}>
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                TPML Project Management
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {session?.user?.name || session?.user?.email}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => signOut()}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectDashboard 
          onCreateProject={() => setCreateDialogOpen(true)}
        />
        
        <CreateProjectDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </main>
    </div>
  );
}