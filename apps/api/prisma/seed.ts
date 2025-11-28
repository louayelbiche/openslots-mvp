/// <reference types="node" />

import "dotenv/config";
import { PrismaClient, ServiceCategory, Prisma } from "@prisma/client";
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

// Helper to compute maxDiscountedPrice
function computeMaxDiscountedPrice(basePrice: number, maxDiscount: number): number {
  return Math.round(basePrice * (1 - maxDiscount));
}

// Helper to create slot time from base date and hour
// Timezone offsets for US cities (hours from UTC, standard time)
const CITY_TIMEZONE_OFFSETS: Record<string, number> = {
  "New York": -5,      // EST (UTC-5)
  "San Francisco": -8, // PST (UTC-8)
  "Los Angeles": -8,   // PST (UTC-8)
};

function createSlotTime(baseDate: Date, localHour: number, durationMin: number, city: string): { start: Date; end: Date } {
  // Convert local hour to UTC by subtracting the timezone offset
  // Example: 5pm (17) in PST (UTC-8) = 17 - (-8) = 25 = 1am next day UTC
  const timezoneOffset = CITY_TIMEZONE_OFFSETS[city] || 0;
  const utcHour = localHour - timezoneOffset;

  const start = new Date(baseDate.getTime() + utcHour * 60 * 60 * 1000);
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  return { start, end };
}

// Provider seed data structure
interface ProviderSeedData {
  name: string;
  description: string;
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  rating: number;
  category: ServiceCategory;
  services: Array<{
    name: string;
    description: string;
    durationMin: number;
    basePrice: number; // in cents
  }>;
}

// Seed data for 8 providers across 3 cities
const providerData: ProviderSeedData[] = [
  // NEW YORK - 3 providers
  {
    name: "Zen Flow Massage Studio",
    description: "Premium massage therapy in the heart of Manhattan",
    address: "123 Madison Ave",
    addressLine2: "Suite 400",
    city: "New York",
    state: "NY",
    zipCode: "10016",
    latitude: 40.7484,
    longitude: -73.9857,
    rating: 4.85,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Deep Tissue Massage", description: "Intense pressure for muscle relief", durationMin: 60, basePrice: 120_00 },
      { name: "Swedish Massage", description: "Relaxing full body massage", durationMin: 60, basePrice: 100_00 },
      { name: "Hot Stone Massage", description: "Heated stones for deep relaxation", durationMin: 75, basePrice: 150_00 },
    ],
  },
  {
    name: "Glamour Nails NYC",
    description: "Trendy nail salon in SoHo with expert technicians",
    address: "456 Broadway",
    city: "New York",
    state: "NY",
    zipCode: "10012",
    latitude: 40.7223,
    longitude: -73.9987,
    rating: 4.72,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Gel Manicure", description: "Long-lasting gel polish manicure", durationMin: 45, basePrice: 55_00 },
      { name: "Classic Pedicure", description: "Relaxing foot treatment", durationMin: 50, basePrice: 60_00 },
      { name: "Gel Nails Full Set", description: "Full set of gel extensions", durationMin: 90, basePrice: 85_00 },
    ],
  },
  {
    name: "Brooklyn Hair Co",
    description: "Modern hair salon in Williamsburg",
    address: "789 Bedford Ave",
    city: "New York",
    state: "NY",
    zipCode: "11211",
    latitude: 40.7128,
    longitude: -73.9614,
    rating: 4.55,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Haircut & Style", description: "Precision cut with styling", durationMin: 45, basePrice: 75_00 },
      { name: "Color Treatment", description: "Full color or highlights", durationMin: 120, basePrice: 150_00 },
      { name: "Blowout", description: "Professional blowout styling", durationMin: 30, basePrice: 45_00 },
    ],
  },

  // SAN FRANCISCO - 3 providers
  {
    name: "Pacific Glow Spa",
    description: "Luxury facial treatments in the Marina District",
    address: "2100 Chestnut St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94123",
    latitude: 37.8004,
    longitude: -122.4375,
    rating: 4.92,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Signature Facial", description: "Deep cleansing facial treatment", durationMin: 60, basePrice: 130_00 },
      { name: "Microdermabrasion", description: "Exfoliating skin renewal", durationMin: 45, basePrice: 110_00 },
    ],
  },
  {
    name: "Mission Massage Therapy",
    description: "Community-focused massage in the Mission",
    address: "3456 Valencia St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94110",
    latitude: 37.7516,
    longitude: -122.4205,
    rating: 4.68,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Swedish Massage", description: "Classic relaxation massage", durationMin: 60, basePrice: 90_00 },
      { name: "Deep Tissue Massage", description: "Therapeutic deep tissue work", durationMin: 60, basePrice: 110_00 },
    ],
  },
  {
    name: "SOMA Style Lounge",
    description: "Hip hair salon near the tech hub",
    address: "555 Folsom St",
    addressLine2: "Floor 2",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    latitude: 37.7875,
    longitude: -122.3918,
    rating: 4.45,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Men's Haircut", description: "Classic men's cut", durationMin: 30, basePrice: 40_00 },
      { name: "Women's Cut & Style", description: "Full service cut and style", durationMin: 60, basePrice: 95_00 },
      { name: "Balayage Highlights", description: "Hand-painted highlights", durationMin: 150, basePrice: 200_00 },
    ],
  },

  // LOS ANGELES - 2 providers
  {
    name: "Beverly Hills Skin Institute",
    description: "Celebrity-grade skincare in Beverly Hills",
    address: "9876 Wilshire Blvd",
    addressLine2: "Penthouse",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90210",
    latitude: 34.0696,
    longitude: -118.4052,
    rating: 4.95,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Hydrafacial", description: "Ultimate hydration treatment", durationMin: 60, basePrice: 180_00 },
      { name: "LED Light Therapy", description: "Rejuvenating light treatment", durationMin: 30, basePrice: 95_00 },
    ],
  },
  {
    name: "Venice Beach Nails",
    description: "Beachside nail bar with ocean views",
    address: "1234 Ocean Front Walk",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90291",
    latitude: 33.9850,
    longitude: -118.4695,
    rating: 4.32,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Beach Ready Mani", description: "Quick manicure with polish", durationMin: 30, basePrice: 35_00 },
      { name: "Spa Pedicure Deluxe", description: "Full spa pedicure experience", durationMin: 60, basePrice: 70_00 },
      { name: "Acrylic Full Set", description: "Acrylic nail extensions", durationMin: 75, basePrice: 65_00 },
    ],
  },
];

// Slot configuration: varied discounts and time windows
interface SlotConfig {
  hourOffset: number; // Hour of day (9-19)
  discountPercent: number; // 0.10 to 0.30
  dayOffset: number; // 0 = today, 1 = tomorrow
}

// Predefined slot configurations for variety
const slotConfigs: SlotConfig[] = [
  // Morning slots (9am-12pm)
  { hourOffset: 9, discountPercent: 0.15, dayOffset: 0 },
  { hourOffset: 10, discountPercent: 0.20, dayOffset: 0 },
  { hourOffset: 11, discountPercent: 0.25, dayOffset: 1 },
  // Afternoon slots (12pm-4pm)
  { hourOffset: 13, discountPercent: 0.10, dayOffset: 0 },
  { hourOffset: 14, discountPercent: 0.15, dayOffset: 1 },
  { hourOffset: 15, discountPercent: 0.30, dayOffset: 0 },
  // Evening slots (4pm-8pm)
  { hourOffset: 16, discountPercent: 0.12, dayOffset: 0 },
  { hourOffset: 17, discountPercent: 0.18, dayOffset: 1 },
  { hourOffset: 18, discountPercent: 0.22, dayOffset: 0 },
  { hourOffset: 19, discountPercent: 0.28, dayOffset: 1 },
];

async function main() {
  console.log("Seeding OpenSlots dev data with rich discovery dataset...");

  // Wipe existing data in correct order (respecting foreign keys)
  // Skip negotiation tables for now - not needed for discovery MVP
  // await prisma.negotiationOffer.deleteMany();
  // await prisma.booking.deleteMany();
  // await prisma.negotiation.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.service.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();

  // Create test consumer user
  const consumerUser = await prisma.user.create({
    data: {
      email: "test+consumer@openslots.dev",
      name: "Alex Consumer",
      role: "CONSUMER",
      selectedCity: "New York",
      selectedZipCode: "10016",
    },
  });
  console.log(`Created consumer: ${consumerUser.email}`);

  // Get current date at midnight UTC for slot calculations
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  let totalSlots = 0;
  let providerIndex = 0;

  for (const pData of providerData) {
    // Create provider owner user
    const ownerEmail = `provider${providerIndex + 1}@openslots.dev`;
    const providerOwner = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `${pData.name} Owner`,
        role: "PROVIDER",
      },
    });

    // Create provider with full address and geo data
    const provider = await prisma.provider.create({
      data: {
        name: pData.name,
        description: pData.description,
        address: pData.address,
        addressLine2: pData.addressLine2,
        city: pData.city,
        state: pData.state,
        zipCode: pData.zipCode,
        latitude: new Prisma.Decimal(pData.latitude),
        longitude: new Prisma.Decimal(pData.longitude),
        rating: new Prisma.Decimal(pData.rating),
        ownerId: providerOwner.id,
      },
    });
    console.log(`Created provider: ${provider.name} (${provider.city})`);

    // Create services for this provider
    for (const sData of pData.services) {
      const service = await prisma.service.create({
        data: {
          name: sData.name,
          description: sData.description,
          category: pData.category,
          durationMin: sData.durationMin,
          basePrice: sData.basePrice,
          providerId: provider.id,
        },
      });

      // Create 3-5 slots per service using stratified distribution
      // Ensure each provider gets slots across Morning, Afternoon, and Evening time windows
      const slotsPerService = 3 + (providerIndex % 3); // 3, 4, or 5 slots
      const serviceIndex = pData.services.indexOf(sData);

      for (let i = 0; i < slotsPerService; i++) {
        // Stratified round-robin: cycle through time windows for better distribution
        // This ensures providers get slots from Morning (0-2), Afternoon (3-5), and Evening (6-9) ranges
        const configIndex = (i * 3 + providerIndex + serviceIndex) % slotConfigs.length;
        const config = slotConfigs[configIndex];

        const baseDate = config.dayOffset === 0 ? today : tomorrow;
        const { start, end } = createSlotTime(baseDate, config.hourOffset, sData.durationMin, pData.city);

        const basePrice = sData.basePrice;
        const maxDiscount = config.discountPercent;
        const maxDiscountedPrice = computeMaxDiscountedPrice(basePrice, maxDiscount);

        await prisma.slot.create({
          data: {
            startTime: start,
            endTime: end,
            status: "OPEN",
            basePrice: basePrice,
            maxDiscount: new Prisma.Decimal(maxDiscount),
            maxDiscountedPrice: maxDiscountedPrice,
            serviceId: service.id,
            providerId: provider.id,
          },
        });
        totalSlots++;
      }
    }

    providerIndex++;
  }

  console.log(`\nSeed complete!`);
  console.log(`- Created ${providerData.length} providers`);
  console.log(`- Created ${totalSlots} slots`);
  console.log(`- Covering cities: New York, San Francisco, Los Angeles`);
  console.log(`- Categories: MASSAGE, NAILS, HAIR, FACIALS_AND_SKIN`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });