import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finished Project Management',
  description: 'Simple project archiving system for managing completed projects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {/* Navigation */}
          <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <Link href="/dashboard" className="text-xl font-bold">
                    Project Management
                  </Link>
                  <div className="hidden sm:flex space-x-4">
                    <Link href="/dashboard">
                      <Button variant="ghost">Dashboard</Button>
                    </Link>
                    <Link href="/dashboard?filter=ACTIVE">
                      <Button variant="ghost">Active Projects</Button>
                    </Link>
                    <Link href="/dashboard?filter=FINISHED">
                      <Button variant="ghost">Finished Projects</Button>
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Settings
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-8">
            <div className="container mx-auto px-4 py-6">
              <div className="text-center text-sm text-muted-foreground">
                © 2026 TPML (Total Product Management, Ltd.) - Finished Project Management System
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}