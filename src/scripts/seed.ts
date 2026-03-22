import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Starting database seeding...");

  const passwordHash = await bcrypt.hash("Password123", 10);

  // ==========================
  // 1. Seed Admin
  // ==========================
  const admin = await prisma.user.upsert({
    where: { email: "admin@courtconnect.com" },
    update: {},
    create: {
      email: "admin@courtconnect.com",
      name: "Super Admin",
      role: "ADMIN",
      emailVerified: true,
      isApproved: true,
      accounts: {
        create: {
          accountId: "admin@courtconnect.com",
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
  console.log(`✅ Admin user created/verified: ${admin.email}`);

  // ==========================
  // 2. Seed Organizer
  // ==========================
  const organizer = await prisma.user.upsert({
    where: { email: "organizer@courtconnect.com" },
    update: {},
    create: {
      email: "organizer@courtconnect.com",
      name: "Demo Organizer",
      role: "ORGANIZER",
      emailVerified: true,
      isApproved: true,
      accounts: {
        create: {
          accountId: "organizer@courtconnect.com",
          providerId: "credential",
         password: passwordHash,
        },
      },
      organizerProfile: {
        create: {
          businessName: "Elite Sports Agency",
          phoneNumber: "1234567890",
          bio: "Managing premium courts since 2024.",
          address: "123 Organizer Avenue",
        },
      },
    },
  });
  console.log(`✅ Organizer user created/verified: ${organizer.email}`);

  console.log("Seeding completed successfully! 🎉");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
