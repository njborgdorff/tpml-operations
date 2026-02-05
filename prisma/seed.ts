import { PrismaClient, ProjectStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@tpml.com' },
    update: {},
    create: {
      email: 'test@tpml.com',
      name: 'Test User',
      role: 'USER',
    },
  })

  console.log('Created test user:', testUser)

  // Create sample projects
  const sampleProjects = [
    {
      name: 'Website Redesign',
      description: 'Complete redesign of the company website',
      status: ProjectStatus.IN_PROGRESS,
    },
    {
      name: 'Mobile App Development',
      description: 'Native mobile app for iOS and Android',
      status: ProjectStatus.COMPLETE,
    },
    {
      name: 'Database Migration',
      description: 'Migrate legacy database to new system',
      status: ProjectStatus.APPROVED,
    },
    {
      name: 'Marketing Campaign',
      description: 'Q1 marketing campaign planning and execution',
      status: ProjectStatus.IN_PROGRESS,
    },
  ]

  for (const projectData of sampleProjects) {
    const project = await prisma.project.create({
      data: {
        ...projectData,
        userId: testUser.id,
      },
    })

    // Create initial status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: project.id,
        oldStatus: null,
        newStatus: project.status,
        changedBy: testUser.id,
      },
    })

    console.log('Created project:', project.name)
  }
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