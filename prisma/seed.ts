import { prisma } from "../lib/prisma";

async function main() {
  const users = [
    { email: "alice@test.com", name: "Alice" },
    { email: "bob@test.com", name: "Bob" },
    { email: "carol@test.com", name: "Carol" },
  ] as const;

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: { email: u.email, name: u.name },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
