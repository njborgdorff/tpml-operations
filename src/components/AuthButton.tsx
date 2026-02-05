"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, User } from "lucide-react"

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <Button variant="ghost" disabled>
        Loading...
      </Button>
    )
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{session.user?.name || session.user?.email}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={() => signIn()}>
      <LogIn className="h-4 w-4 mr-2" />
      Sign In
    </Button>
  )
}