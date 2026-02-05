import { PrismaClient, ProjectStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: hashedPassword,
      role: 'USER',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
      role: 'USER',
    },
  })

  // Create sample projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete redesign of the company website',
      status: ProjectStatus.IN_PROGRESS,
      userId: user1.id,
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Build a mobile app for iOS and Android',
      status: ProjectStatus.COMPLETE,
      userId: user1.id,
    },
  })

  const project3 = await prisma.project.create({
    data: {
      name: 'Database Migration',
      description: 'Migrate legacy database to PostgreSQL',
      status: ProjectStatus.APPROVED,
      userId: user2.id,
    },
  })

  // Create status history entries
  await prisma.projectStatusHistory.create({
    data: {
      projectId: project1.id,
      oldStatus: null,
      newStatus: ProjectStatus.IN_PROGRESS,
      changedBy: user1.id,
    },
  })

  await prisma.projectStatusHistory.createMany({
    data: [
      {
        projectId: project2.id,
        oldStatus: null,
        newStatus: ProjectStatus.IN_PROGRESS,
        changedBy: user1.id,
      },
      {
        projectId: project2.id,
        oldStatus: ProjectStatus.IN_PROGRESS,
        newStatus: ProjectStatus.COMPLETE,
        changedBy: user1.id,
      },
    ],
  })

  await prisma.projectStatusHistory.createMany({
    data: [
      {
        projectId: project3.id,
        oldStatus: null,
        newStatus: ProjectStatus.IN_PROGRESS,
        changedBy: user2.id,
      },
      {
        projectId: project3.id,
        oldStatus: ProjectStatus.IN_PROGRESS,
        newStatus: ProjectStatus.COMPLETE,
        changedBy: user2.id,
      },
      {
        projectId: project3.id,
        oldStatus: ProjectStatus.COMPLETE,
        newStatus: ProjectStatus.APPROVED,
        changedBy: user2.id,
      },
    ],
  })

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })