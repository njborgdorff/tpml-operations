import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finished Project Management',
  description: 'Manage and archive your completed projects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <Providers>
          <main className="min-h-full bg-background">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}