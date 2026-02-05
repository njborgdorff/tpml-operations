import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { SignInForm } from "@/components/SignInForm"

export default async function SignInPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/")
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account to continue
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}