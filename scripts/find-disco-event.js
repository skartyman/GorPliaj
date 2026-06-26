const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const events = await prisma.event.findMany();
  console.log(JSON.stringify(events.map(e => ({ id: e.id, slug: e.slug, title: e.title })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
