import { PrismaClient, ProjectStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: 'user_1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    },
  })

  // Create sample projects with different statuses
  const projects = [
    {
      name: 'Website Redesign',
      description: 'Complete overhaul of company website',
      status: ProjectStatus.IN_PROGRESS,
    },
    {
      name: 'Mobile App Development',
      description: 'iOS and Android app for customers',
      status: ProjectStatus.COMPLETE,
    },
    {
      name: 'Database Migration',
      description: 'Move from MySQL to PostgreSQL',
      status: ProjectStatus.APPROVED,
    },
    {
      name: 'Marketing Campaign Q4',
      description: 'Holiday marketing push',
      status: ProjectStatus.FINISHED,
      archivedAt: new Date('2023-12-31'),
    },
    {
      name: 'Security Audit',
      description: 'Comprehensive security review',
      status: ProjectStatus.IN_PROGRESS,
    },
    {
      name: 'Documentation Update',
      description: 'Update all technical documentation',
      status: ProjectStatus.COMPLETE,
    },
  ]

  for (const projectData of projects) {
    const project = await prisma.project.upsert({
      where: { name: projectData.name },
      update: {},
      create: {
        ...projectData,
        userId: user.id,
      },
    })

    // Create initial status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: project.id,
        oldStatus: null,
        newStatus: projectData.status,
        changedBy: user.id,
      },
    })
  }

  console.log('Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })