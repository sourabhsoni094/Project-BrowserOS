import { seedDummyUsers } from '../src/services/seed.service.js';
import { prisma } from '../src/config/db.js';

async function main() {
  console.log('[Seed] Seeding dummy users...');
  await seedDummyUsers();
  console.log('[Seed] Seeding completed.');
}

main()
  .catch((err) => {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
