import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { ToastProvider } from "@/components/providers/ToastProvider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Finished Project Management",
  description: "Manage your projects and track their progress",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  )
}