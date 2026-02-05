import { PrismaClient, ProjectStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      role: 'user',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      role: 'user',
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    },
  })

  // Create sample projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with modern design and improved UX',
      status: ProjectStatus.IN_PROGRESS,
      userId: user1.id,
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Native mobile application for iOS and Android platforms',
      status: ProjectStatus.COMPLETE,
      userId: user2.id,
    },
  })

  const project3 = await prisma.project.create({
    data: {
      name: 'Database Migration',
      description: 'Migrate legacy database to new cloud infrastructure',
      status: ProjectStatus.APPROVED,
      userId: admin.id,
    },
  })

  const project4 = await prisma.project.create({
    data: {
      name: 'Marketing Campaign',
      description: 'Q4 digital marketing campaign for product launch',
      status: ProjectStatus.FINISHED,
      archivedAt: new Date(),
      userId: user1.id,
    },
  })

  // Create status history entries
  await prisma.projectStatusHistory.create({
    data: {
      projectId: project2.id,
      oldStatus: ProjectStatus.IN_PROGRESS,
      newStatus: ProjectStatus.COMPLETE,
      changedBy: user2.id,
    },
  })

  await prisma.projectStatusHistory.create({
    data: {
      projectId: project3.id,
      oldStatus: ProjectStatus.COMPLETE,
      newStatus: ProjectStatus.APPROVED,
      changedBy: admin.id,
    },
  })

  await prisma.projectStatusHistory.create({
    data: {
      projectId: project4.id,
      oldStatus: ProjectStatus.APPROVED,
      newStatus: ProjectStatus.FINISHED,
      changedBy: user1.id,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('Test users created:')
  console.log('- john@example.com (John Doe)')
  console.log('- jane@example.com (Jane Smith)')
  console.log('- admin@example.com (Admin User)')
  console.log('Sample projects created with various statuses.')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })