const path = require('path');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient(
  process.env.DATABASE_URL ? { datasources: { db: { url: process.env.DATABASE_URL } } } : undefined,
);

async function main() {
  const email = 'tdst68@gmail.com';
  const password = 'Zyra@123456';

  console.log('=== Password Reset for', email, '===');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  // Find the user first
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('ERROR: User not found!');
    return;
  }
  console.log('User found:', user.email, '| ID:', user.id, '| Status:', user.status);
  console.log('Old hash (first 20 chars):', user.passwordHash.substring(0, 20) + '...');

  // Hash with bcrypt cost 10 (same as authController.js)
  const passwordHash = await bcrypt.hash(password, 10);
  console.log('New hash (first 20 chars):', passwordHash.substring(0, 20) + '...');

  // Update the user
  const updated = await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      status: 'active',
    },
  });
  console.log('Password reset successful for:', updated.email);
  console.log('Status:', updated.status);

  // Verify bcrypt compare
  const isValid = await bcrypt.compare(password, passwordHash);
  console.log('\n=== Verification ===');
  console.log('bcrypt.compare("Zyra@123456", newHash):', isValid);

  // Re-read from DB to confirm persistence
  const reread = await prisma.user.findUnique({ where: { email } });
  const isValidFromDb = await bcrypt.compare(password, reread.passwordHash);
  console.log('bcrypt.compare("Zyra@123456", hashFromDB):', isValidFromDb);

  console.log('\n=== All Users ===');
  const users = await prisma.user.findMany({ select: { email: true, status: true } });
  users.forEach(u => console.log(`  ${u.email} (${u.status})`));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
