import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 12)

  const user1 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: hashedPassword,
      role: 'USER',
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
      role: 'USER',
    },
  })

  console.log('Created users:', { user1, user2, user3 })

  // Create demo projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete redesign of the company website with modern UI/UX',
      status: 'ACTIVE',
      createdById: user1.id,
      members: {
        create: [
          { userId: user1.id, role: 'OWNER' },
          { userId: user2.id, role: 'MEMBER' },
          { userId: user3.id, role: 'MEMBER' },
        ]
      }
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Native mobile app for iOS and Android platforms',
      status: 'ACTIVE',
      createdById: user2.id,
      members: {
        create: [
          { userId: user2.id, role: 'OWNER' },
          { userId: user1.id, role: 'ADMIN' },
        ]
      }
    },
  })

  const project3 = await prisma.project.create({
    data: {
      name: 'Database Migration',
      description: 'Migrate legacy database to new PostgreSQL setup',
      status: 'COMPLETED',
      createdById: user3.id,
      members: {
        create: [
          { userId: user3.id, role: 'OWNER' },
          { userId: user1.id, role: 'MEMBER' },
        ]
      }
    },
  })

  console.log('Created projects:', { project1, project2, project3 })

  // Create demo tasks
  const tasks = await prisma.task.createMany({
    data: [
      // Website Redesign tasks
      {
        title: 'Design homepage mockups',
        description: 'Create wireframes and mockups for the new homepage design',
        status: 'DONE',
        priority: 'HIGH',
        projectId: project1.id,
        assignedToId: user3.id,
        dueDate: new Date('2024-03-15'),
      },
      {
        title: 'Implement responsive navigation',
        description: 'Build responsive navigation component with mobile support',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        projectId: project1.id,
        assignedToId: user2.id,
        dueDate: new Date('2024-03-20'),
      },
      {
        title: 'Setup contact form',
        description: 'Create contact form with validation and email integration',
        status: 'TODO',
        priority: 'LOW',
        projectId: project1.id,
        assignedToId: user2.id,
        dueDate: new Date('2024-03-25'),
      },
      {
        title: 'Performance optimization',
        description: 'Optimize website performance and loading speeds',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: project1.id,
        dueDate: new Date('2024-04-01'),
      },

      // Mobile App tasks
      {
        title: 'Setup React Native project',
        description: 'Initialize React Native project with navigation',
        status: 'DONE',
        priority: 'HIGH',
        projectId: project2.id,
        assignedToId: user2.id,
      },
      {
        title: 'Design app screens',
        description: 'Create designs for all main app screens',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: project2.id,
        assignedToId: user1.id,
        dueDate: new Date('2024-03-18'),
      },
      {
        title: 'Implement authentication',
        description: 'Add login/signup functionality with JWT',
        status: 'TODO',
        priority: 'URGENT',
        projectId: project2.id,
        assignedToId: user2.id,
        dueDate: new Date('2024-03-22'),
      },

      // Database Migration tasks
      {
        title: 'Export legacy data',
        description: 'Export all data from legacy MySQL database',
        status: 'DONE',
        priority: 'HIGH',
        projectId: project3.id,
        assignedToId: user3.id,
      },
      {
        title: 'Setup PostgreSQL instance',
        description: 'Configure new PostgreSQL database instance',
        status: 'DONE',
        priority: 'HIGH',
        projectId: project3.id,
        assignedToId: user1.id,
      },
      {
        title: 'Data migration scripts',
        description: 'Write scripts to migrate data to new schema',
        status: 'DONE',
        priority: 'MEDIUM',
        projectId: project3.id,
        assignedToId: user3.id,
      },
    ],
  })

  console.log('Created tasks:', tasks)

  console.log('Seeding finished.')
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