/**
 * Script to delete knowledge entries by title pattern
 *
 * Usage:
 *   npx ts-node scripts/delete-knowledge-entry.ts "Implementation Kickoff Checklist"
 *
 * Or with npx tsx:
 *   npx tsx scripts/delete-knowledge-entry.ts "Implementation Kickoff Checklist"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const searchPattern = process.argv[2];

  if (!searchPattern) {
    console.log('Usage: npx tsx scripts/delete-knowledge-entry.ts "<search pattern>"');
    console.log('\nListing all knowledge entries:\n');

    const entries = await prisma.knowledgeEntry.findMany({
      select: {
        id: true,
        title: true,
        sourceRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (entries.length === 0) {
      console.log('No knowledge entries found.');
    } else {
      entries.forEach((e, i) => {
        console.log(`${i + 1}. [${e.sourceRole}] ${e.title}`);
        console.log(`   ID: ${e.id}`);
        console.log(`   Created: ${e.createdAt.toISOString()}\n`);
      });
    }
    return;
  }

  // Find matching entries
  const matches = await prisma.knowledgeEntry.findMany({
    where: {
      title: {
        contains: searchPattern,
        mode: 'insensitive',
      },
    },
  });

  if (matches.length === 0) {
    console.log(`No knowledge entries found matching "${searchPattern}"`);
    return;
  }

  console.log(`Found ${matches.length} matching entries:\n`);
  matches.forEach((e, i) => {
    console.log(`${i + 1}. [${e.sourceRole}] ${e.title}`);
    console.log(`   ID: ${e.id}`);
    console.log(`   Category: ${e.category}`);
    console.log(`   Created: ${e.createdAt.toISOString()}\n`);
  });

  // Delete them
  const result = await prisma.knowledgeEntry.deleteMany({
    where: {
      title: {
        contains: searchPattern,
        mode: 'insensitive',
      },
    },
  });

  console.log(`Deleted ${result.count} knowledge entries.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
