// ============================================================================
// Database Seed — Dev data
// ============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test users
  const password = await bcrypt.hash('password123', 12);

  const user1 = await prisma.user.upsert({
    where: { email: 'carlos@test.com' },
    update: {},
    create: {
      email: 'carlos@test.com',
      password,
      nickname: 'CarlosGol',
      position: 'FORWARD',
      bio: 'Delantero nato. F7 todos los jueves.',
      latitude: 40.4168,
      longitude: -3.7038,
      city: 'Madrid',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'marta@test.com' },
    update: {},
    create: {
      email: 'marta@test.com',
      password,
      nickname: 'MartaMuro',
      position: 'DEFENDER',
      bio: 'Defensa central. No paso ni una.',
      latitude: 41.3851,
      longitude: 2.1734,
      city: 'Barcelona',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'david@test.com' },
    update: {},
    create: {
      email: 'david@test.com',
      password,
      nickname: 'DavidMago',
      position: 'MIDFIELDER',
      bio: 'Centrocampista creativo.',
      latitude: 40.4168,
      longitude: -3.7038,
      city: 'Madrid',
    },
  });

  // Create a club
  const club = await prisma.club.upsert({
    where: { name: 'Los Cracks FC' },
    update: {},
    create: {
      name: 'Los Cracks FC',
      description: 'Equipo de F7 de Madrid',
      preferredFormation: '1-3-2-1',
      createdById: user1.id,
      members: {
        create: [
          { userId: user1.id, role: 'ADMIN' },
          { userId: user2.id, role: 'CAPTAIN' },
          { userId: user3.id, role: 'PLAYER' },
        ],
      },
    },
  });

  console.log('Seed complete:', { user1: user1.nickname, user2: user2.nickname, user3: user3.nickname, club: club.name });
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
