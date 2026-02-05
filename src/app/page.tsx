'use client';

import React, { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { ProjectDashboard } from '@/components/project-dashboard';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Plus } from 'lucide-react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-3xl font-bold text-gray-900">
            TPML Project Management
          </h1>
          <p className="text-muted-foreground">
            Track your project status from In Progress to Approved with comprehensive filtering and history tracking.
          </p>
          <div className="space-y-2">
            <h3 className="font-semibold">Sprint 1 Features:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Project status tracking (In Progress → Complete → Approved → Finished)</li>
              <li>✓ Dashboard with status visualization</li>
              <li>✓ Filter projects by status and Active/Finished views</li>
              <li>✓ Status change history logging</li>
            </ul>
          </div>
          <Button onClick={() => signIn()} size="lg" className="mt-6">
            Sign In to View Demo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
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
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Project
              </Button>
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">Sprint 1 Implementation Complete</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h3 className="font-medium mb-1">✓ P0 Features:</h3>
                <ul className="space-y-1 text-xs">
                  <li>• Project status tracking system</li>
                  <li>• Dashboard UI with status display</li>
                  <li>• Status update functionality</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-1">✓ P1 Features:</h3>
                <ul className="space-y-1 text-xs">
                  <li>• Basic project filtering</li>
                  <li>• Active vs Finished project views</li>
                  <li>• Status change history</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

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