import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create owner user
  const passwordHash = await bcrypt.hash('owner123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'njborgdorff@totalproductmgmt.com' },
    update: {},
    create: {
      email: 'njborgdorff@totalproductmgmt.com',
      name: 'Nick Borgdorff',
      passwordHash,
      role: 'OWNER',
    },
  });

  console.log('Created owner user:', owner.email);

  // Create default clients
  const clients = [
    { name: 'SBE Medical, Inc.', slug: 'sbe-medical' },
    { name: 'TPML (Internal)', slug: 'tpml-internal' },
  ];

  for (const client of clients) {
    await prisma.client.upsert({
      where: { slug: client.slug },
      update: {},
      create: client,
    });
    console.log('Created client:', client.name);
  }

  console.log('\nSeed complete!');
  console.log('Login with:');
  console.log('  Email: nick@totalproductmgmt.com');
  console.log('  Password: owner123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
