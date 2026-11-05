import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
  if (!email || !password || password.length < 12) {
    throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres) no .env');
  }
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('Administrador já existe: não alteramos senha nem papel automaticamente.');
      return;
    }
    await prisma.user.create({ data: { email, name, role: Role.SYSTEM, passwordHash: await hash(password, 12) } });
    console.log('Administrador inicial criado.');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
