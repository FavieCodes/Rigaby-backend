import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create test users with wallets
  const user1 = await prisma.user.upsert({
    where: { email: 'test1@rigaby.com' },
    update: {},
    create: {
      email: 'test1@rigaby.com',
      password: '$2b$12$hashedpassword', // Use bcrypt hash in real scenario
      firstName: 'Test',
      lastName: 'User1',
      wallet: {
        create: {
          balance: 100.50,
          locked: 25.00,
        },
      },
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'test2@rigaby.com' },
    update: {},
    create: {
      email: 'test2@rigaby.com',
      password: '$2b$12$hashedpassword',
      firstName: 'Test',
      lastName: 'User2',
      wallet: {
        create: {
          balance: 50.00,
          locked: 0,
        },
      },
    },
  });

  console.log('Test users created:', { user1: user1.email, user2: user2.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // To run this seed script, use the command:
  // pnpx ts-node src/prisma/seed.ts