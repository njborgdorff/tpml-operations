import { PrismaClient, ProjectStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const passwordHash = await bcrypt.hash('password123', 10)

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      passwordHash,
      name: 'John Doe',
      role: 'OWNER',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      passwordHash,
      name: 'Jane Smith',
      role: 'OWNER',
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  // Create test client
  const client = await prisma.client.upsert({
    where: { slug: 'tpml' },
    update: {},
    create: {
      name: 'TPML',
      slug: 'tpml',
    },
  })

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { slug: 'website-redesign' },
    update: {},
    create: {
      name: 'Website Redesign',
      slug: 'website-redesign',
      description: 'Complete overhaul of the company website with modern design and improved UX',
      status: ProjectStatus.IN_PROGRESS,
      intakeData: { projectType: 'NEW_PROJECT', name: 'Website Redesign', client: 'TPML', problemStatement: 'Website needs modernization' },
      clientId: client.id,
      ownerId: user1.id,
    },
  })

  const project2 = await prisma.project.upsert({
    where: { slug: 'mobile-app-development' },
    update: {},
    create: {
      name: 'Mobile App Development',
      slug: 'mobile-app-development',
      description: 'Native mobile application for iOS and Android platforms',
      status: ProjectStatus.COMPLETE,
      intakeData: { projectType: 'NEW_PROJECT', name: 'Mobile App', client: 'TPML', problemStatement: 'Need mobile presence' },
      clientId: client.id,
      ownerId: user2.id,
    },
  })

  const project3 = await prisma.project.upsert({
    where: { slug: 'database-migration' },
    update: {},
    create: {
      name: 'Database Migration',
      slug: 'database-migration',
      description: 'Migrate legacy database to new cloud infrastructure',
      status: ProjectStatus.APPROVED,
      intakeData: { projectType: 'NEW_PROJECT', name: 'DB Migration', client: 'TPML', problemStatement: 'Legacy DB needs migration' },
      clientId: client.id,
      ownerId: admin.id,
    },
  })

  const project4 = await prisma.project.upsert({
    where: { slug: 'marketing-campaign' },
    update: {},
    create: {
      name: 'Marketing Campaign',
      slug: 'marketing-campaign',
      description: 'Q4 digital marketing campaign for product launch',
      status: ProjectStatus.FINISHED,
      archivedAt: new Date(),
      intakeData: { projectType: 'NEW_PROJECT', name: 'Marketing Campaign', client: 'TPML', problemStatement: 'Q4 campaign needed' },
      clientId: client.id,
      ownerId: user1.id,
    },
  })

  // Create status history entries
  await prisma.projectStatusHistory.createMany({
    data: [
      {
        projectId: project2.id,
        oldStatus: ProjectStatus.IN_PROGRESS,
        newStatus: ProjectStatus.COMPLETE,
        changedBy: user2.id,
      },
      {
        projectId: project3.id,
        oldStatus: ProjectStatus.COMPLETE,
        newStatus: ProjectStatus.APPROVED,
        changedBy: admin.id,
      },
      {
        projectId: project4.id,
        oldStatus: ProjectStatus.APPROVED,
        newStatus: ProjectStatus.FINISHED,
        changedBy: user1.id,
      },
    ],
    skipDuplicates: true,
  })

  console.log('Database seeded successfully!')
  console.log('Test users created:')
  console.log('- john@example.com (John Doe)')
  console.log('- jane@example.com (Jane Smith)')
  console.log('- admin@example.com (Admin User)')
  console.log('Sample projects created with various statuses.')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
