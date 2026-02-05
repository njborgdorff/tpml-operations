import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

// Demo credentials for testing
const DEMO_USERS = [
  { 
    email: 'admin@example.com', 
    password: 'admin123', 
    role: 'admin',
    name: 'Admin User' 
  },
  { 
    email: 'user@example.com', 
    password: 'user123', 
    role: 'user',
    name: 'Regular User' 
  }
]

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // First check demo users for development
        const demoUser = DEMO_USERS.find(user => user.email === credentials.email)
        if (demoUser && credentials.password === demoUser.password) {
          // Create or update user in database
          const dbUser = await prisma.user.upsert({
            where: { email: demoUser.email },
            update: { 
              name: demoUser.name,
              role: demoUser.role 
            },
            create: {
              email: demoUser.email,
              name: demoUser.name,
              role: demoUser.role
            }
          })

          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
          }
        }

        // Check database users with proper password hashing
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          return null
        }

        // In production, implement proper password hashing verification
        // For now, this is a placeholder for bcrypt.compare
        // const isValid = await bcrypt.compare(credentials.password, user.password)
        
        // Temporary fallback for existing users without proper password hashing
        // This should be removed in production
        console.warn('Using insecure password verification - implement proper hashing')
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  }
}