/// <reference types="node" />

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Read and validate the connection string once
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in apps/api/.env");
}

// Strongly typed Pool config, no eslint "unsafe" complaints
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding OpenSlots dev data...");

  // Wipe existing data
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.service.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();

  const consumerUser = await prisma.user.create({
    data: {
      email: "test+consumer@openslots.dev",
      name: "Test Consumer",
      role: "CONSUMER",
    },
  });

  const providerOwnerUser = await prisma.user.create({
    data: {
      email: "test+provider@openslots.dev",
      name: "Test Provider Owner",
      role: "PROVIDER",
    },
  });

  const provider = await prisma.provider.create({
    data: {
      name: "Zen Flow Massage Studio",
      description: "City center massage studio focused on last minute bookings",
      location: "NYC",
      ownerId: providerOwnerUser.id,
    },
  });

  const massage60 = await prisma.service.create({
    data: {
      name: "60 min deep tissue massage",
      description: "Focus on neck, shoulders and back",
      durationMin: 60,
      basePrice: 90_00,
      providerId: provider.id,
    },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const slot1Start = new Date(today.getTime() + 17 * 60 * 60 * 1000); // 17:00
  const slot1End = new Date(today.getTime() + 18 * 60 * 60 * 1000);   // 18:00

  const slot2Start = new Date(today.getTime() + 18 * 60 * 60 * 1000); // 18:00
  const slot2End = new Date(today.getTime() + 19 * 60 * 60 * 1000);   // 19:00

  const slot3Start = new Date(today.getTime() + 20 * 60 * 60 * 1000); // 20:00
  const slot3End = new Date(today.getTime() + 21 * 60 * 60 * 1000);   // 21:00

  await prisma.slot.createMany({
    data: [
      {
        serviceId: massage60.id,
        providerId: provider.id,
        startTime: slot1Start,
        endTime: slot1End,
        status: "OPEN",
        minPriceCents: 60_00,
        maxPriceCents: 90_00,
      },
      {
        serviceId: massage60.id,
        providerId: provider.id,
        startTime: slot2Start,
        endTime: slot2End,
        status: "OPEN",
        minPriceCents: 65_00,
        maxPriceCents: 95_00,
      },
      {
        serviceId: massage60.id,
        providerId: provider.id,
        startTime: slot3Start,
        endTime: slot3End,
        status: "OPEN",
        minPriceCents: 55_00,
        maxPriceCents: 85_00,
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });