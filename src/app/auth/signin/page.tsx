"use client";

import { getProviders, signIn, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  type: string;
}

const ProviderIcons: Record<string, React.ComponentType<any>> = {
  github: Github,
};

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push("/");
        return;
      }
      
      const availableProviders = await getProviders();
      setProviders(availableProviders);
      setIsLoading(false);
    };

    checkSession();
  }, [router]);

  const handleSignIn = (providerId: string) => {
    signIn(providerId, { callbackUrl: "/" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to Project Manager</CardTitle>
          <CardDescription>
            Choose your preferred sign-in method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers &&
            Object.values(providers).map((provider) => {
              const Icon = ProviderIcons[provider.id];
              
              return (
                <Button
                  key={provider.name}
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSignIn(provider.id)}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  Sign in with {provider.name}
                </Button>
              );
            })}
            
          {(!providers || Object.keys(providers).length === 0) && (
            <div className="text-center text-muted-foreground">
              No authentication providers configured
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}