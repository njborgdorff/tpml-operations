import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoutButton } from '@/components/features/logout-button';
import {
  Megaphone,
  Code2,
  ArrowRight,
  BarChart3,
  Users,
  Zap,
} from 'lucide-react';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const tiles = [
    {
      title: 'Marketing Campaigns',
      description: 'Manage marketing campaigns, content strategies, and brand initiatives',
      href: 'https://marketing.totalproductmgmt.com',
      icon: Megaphone,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200 hover:border-pink-400',
      features: ['Campaign Management', 'Content Calendar', 'Analytics Dashboard'],
      external: true,
    },
    {
      title: 'AI Projects',
      description: 'Manage AI-staffed software development projects with autonomous implementation',
      href: '/projects',
      icon: Code2,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200 hover:border-blue-400',
      features: ['Project Intake', 'Sprint Management', 'Code Review Workflow'],
      external: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TPML Dashboard</h1>
                <p className="text-xs text-gray-500">Total Product Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                <p className="text-xs text-gray-500">{session.user.email}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {session.user.name?.split(' ')[0]}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage your AI-staffed organization. Choose a department to get started.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const CardWrapper = tile.external ? 'a' : Link;
            const linkProps = tile.external
              ? { href: tile.href, target: '_blank', rel: 'noopener noreferrer' }
              : { href: tile.href };

            return (
              <CardWrapper key={tile.title} {...linkProps}>
                <Card className={`group cursor-pointer transition-all duration-300 ${tile.borderColor} hover:shadow-xl hover:-translate-y-1`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${tile.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <CardTitle className="text-2xl mt-4">{tile.title}</CardTitle>
                    <CardDescription className="text-base">
                      {tile.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`${tile.bgColor} rounded-lg p-4`}>
                      <ul className="space-y-2">
                        {tile.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                            <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${tile.color}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {tile.external && (
                      <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                        Opens in new tab
                      </p>
                    )}
                  </CardContent>
                </Card>
              </CardWrapper>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-16 grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
          <Card className="bg-white/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">AI-Powered</p>
                  <p className="text-sm text-gray-500">Autonomous Operations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">AI Team</p>
                  <p className="text-sm text-gray-500">PM, CTO, Dev, QA</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">Human-in-Loop</p>
                  <p className="text-sm text-gray-500">You decide, AI executes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mt-16 py-8 border-t bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            Total Product Management, Ltd. — AI-Staffed Business Operations
          </p>
        </div>
      </footer>
    </div>
  );
}
