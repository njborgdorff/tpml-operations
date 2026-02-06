import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { NavLinks } from '@/components/NavLinks'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finished Project Management',
  description: 'A simple project archiving system for managing completed projects',
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
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <Link href="/dashboard" className="font-semibold text-xl hover:text-foreground transition-colors">
                    Finished Project Management
                  </Link>
                  <NavLinks />
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">
                    Welcome back!
                  </span>
                </div>
              </nav>
            </div>
          </header>
          
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}