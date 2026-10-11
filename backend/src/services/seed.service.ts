import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

export async function seedDummyUsers() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const dummyUsers = [
    {
      username: 'admin',
      email: 'admin@browseros.local',
      passwordHash,
      preferences: {
        create: {
          theme: 'dark',
          wallpaper: 'default-wallpaper',
          fontSize: 14,
        },
      },
    },
    {
      username: 'demo',
      email: 'demo@browseros.local',
      passwordHash,
      preferences: {
        create: {
          theme: 'dark',
          wallpaper: 'default-wallpaper',
          fontSize: 14,
        },
      },
    },
  ];

  for (const dummy of dummyUsers) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: dummy.email }, { username: dummy.username }],
      },
    });

    if (!existing) {
      const user = await prisma.user.create({
        data: dummy,
      });
      console.log(`[Seed] Created dummy user: ${user.username} (${user.email}) / password123`);
    }
  }
}
