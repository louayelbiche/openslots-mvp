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

// Timezone offsets for cities (hours from UTC, standard time)
const CITY_TIMEZONE_OFFSETS: Record<string, number> = {
  "New York City": -5, // EST (UTC-5)
  "Bali": 8,           // WITA (UTC+8)
  "San Francisco": -8, // PST (UTC-8)
  "Los Angeles": -8,   // PST (UTC-8)
};

function createSlotTime(baseDate: Date, localHour: number, durationMin: number, city: string): { start: Date; end: Date } {
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

// Generate 10 providers per category across 3 cities
// Categories: MASSAGE, NAILS, HAIR, FACIALS_AND_SKIN, ACUPUNCTURE, LASHES_AND_BROWS
const providerData: ProviderSeedData[] = [
  // ==================== MASSAGE (10 providers) ====================
  {
    name: "Zen Flow Massage Studio",
    description: "Premium massage therapy in the heart of Manhattan",
    address: "123 Madison Ave",
    addressLine2: "Suite 400",
    city: "New York City",
    state: "NY",
    zipCode: "10016",
    latitude: 40.7484,
    longitude: -73.9857,
    rating: 4.85,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Deep Tissue Massage", description: "Intense pressure for muscle relief", durationMin: 60, basePrice: 120_00 },
      { name: "Swedish Massage", description: "Relaxing full body massage", durationMin: 60, basePrice: 100_00 },
    ],
  },
  {
    name: "Manhattan Wellness Center",
    description: "Holistic massage and bodywork in Midtown",
    address: "234 W 42nd St",
    city: "New York City",
    state: "NY",
    zipCode: "10036",
    latitude: 40.7580,
    longitude: -73.9855,
    rating: 4.78,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Sports Massage", description: "Therapeutic massage for athletes", durationMin: 60, basePrice: 115_00 },
      { name: "Reflexology", description: "Pressure point foot massage", durationMin: 45, basePrice: 80_00 },
    ],
  },
  {
    name: "Serenity Touch NYC",
    description: "Peaceful retreat in the Upper West Side",
    address: "456 Amsterdam Ave",
    city: "New York City",
    state: "NY",
    zipCode: "10024",
    latitude: 40.7870,
    longitude: -73.9754,
    rating: 4.65,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Hot Stone Massage", description: "Heated stones for deep relaxation", durationMin: 75, basePrice: 140_00 },
      { name: "Prenatal Massage", description: "Gentle massage for expecting mothers", durationMin: 60, basePrice: 105_00 },
    ],
  },
  {
    name: "Brooklyn Bodywork",
    description: "Artisan massage therapy in DUMBO",
    address: "78 Front St",
    city: "New York City",
    state: "NY",
    zipCode: "11201",
    latitude: 40.7025,
    longitude: -73.9897,
    rating: 4.52,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Thai Massage", description: "Traditional Thai stretching massage", durationMin: 90, basePrice: 135_00 },
      { name: "Couples Massage", description: "Side-by-side relaxation", durationMin: 60, basePrice: 200_00 },
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
    name: "Marina Healing Hands",
    description: "Waterfront massage studio with bay views",
    address: "2200 Marina Blvd",
    city: "San Francisco",
    state: "CA",
    zipCode: "94123",
    latitude: 37.8044,
    longitude: -122.4375,
    rating: 4.82,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Aromatherapy Massage", description: "Essential oil enhanced massage", durationMin: 60, basePrice: 120_00 },
      { name: "Shiatsu", description: "Japanese pressure point therapy", durationMin: 60, basePrice: 115_00 },
    ],
  },
  {
    name: "Castro Relaxation Station",
    description: "Inclusive massage therapy in the Castro",
    address: "4100 18th St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94114",
    latitude: 37.7609,
    longitude: -122.4350,
    rating: 4.45,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Swedish Massage", description: "Classic relaxation massage", durationMin: 60, basePrice: 85_00 },
      { name: "Trigger Point Therapy", description: "Targeted muscle release", durationMin: 45, basePrice: 75_00 },
    ],
  },
  {
    name: "Beverly Hills Bodyworks",
    description: "Celebrity-level massage in Beverly Hills",
    address: "456 Rodeo Dr",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90210",
    latitude: 34.0675,
    longitude: -118.4006,
    rating: 4.95,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Signature Luxury Massage", description: "Premium full-body experience", durationMin: 90, basePrice: 250_00 },
      { name: "CBD Massage", description: "Infused with premium CBD oil", durationMin: 60, basePrice: 180_00 },
    ],
  },
  {
    name: "Santa Monica Serenity",
    description: "Beach-side massage therapy",
    address: "1500 Ocean Ave",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90401",
    latitude: 34.0195,
    longitude: -118.4912,
    rating: 4.72,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Beach Recovery Massage", description: "Post-surf muscle relief", durationMin: 60, basePrice: 110_00 },
      { name: "Swedish Massage", description: "Classic relaxation massage", durationMin: 60, basePrice: 95_00 },
    ],
  },
  {
    name: "Echo Park Wellness",
    description: "Hip massage studio in Echo Park",
    address: "2100 Sunset Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90026",
    latitude: 34.0781,
    longitude: -118.2606,
    rating: 4.38,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Deep Tissue Massage", description: "Intense muscle work", durationMin: 60, basePrice: 100_00 },
      { name: "Cupping Therapy", description: "Traditional cupping treatment", durationMin: 45, basePrice: 85_00 },
    ],
  },

  // ==================== NAILS (10 providers) ====================
  {
    name: "Glamour Nails NYC",
    description: "Trendy nail salon in SoHo with expert technicians",
    address: "456 Broadway",
    city: "New York City",
    state: "NY",
    zipCode: "10012",
    latitude: 40.7223,
    longitude: -73.9987,
    rating: 4.72,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Gel Manicure", description: "Long-lasting gel polish manicure", durationMin: 45, basePrice: 55_00 },
      { name: "Classic Pedicure", description: "Relaxing foot treatment", durationMin: 50, basePrice: 60_00 },
    ],
  },
  {
    name: "Queens Boulevard Nails & Spa",
    description: "Full-service nail salon in Rego Park",
    address: "678 Queens Blvd",
    city: "New York City",
    state: "NY",
    zipCode: "11374",
    latitude: 40.7282,
    longitude: -73.8612,
    rating: 4.65,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Express Manicure", description: "Quick polish change", durationMin: 30, basePrice: 25_00 },
      { name: "Deluxe Pedicure", description: "Spa pedicure with massage", durationMin: 60, basePrice: 55_00 },
    ],
  },
  {
    name: "Chelsea Nail Bar",
    description: "Chic nail studio in Chelsea",
    address: "200 W 23rd St",
    city: "New York City",
    state: "NY",
    zipCode: "10011",
    latitude: 40.7440,
    longitude: -73.9969,
    rating: 4.58,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Nail Art Manicure", description: "Custom nail art designs", durationMin: 60, basePrice: 75_00 },
      { name: "Dip Powder Nails", description: "Long-lasting dip powder", durationMin: 60, basePrice: 65_00 },
    ],
  },
  {
    name: "Harlem Nails & Beauty",
    description: "Community nail salon in Harlem",
    address: "2350 Adam Clayton Powell Jr Blvd",
    city: "New York City",
    state: "NY",
    zipCode: "10030",
    latitude: 40.8186,
    longitude: -73.9445,
    rating: 4.42,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Basic Manicure", description: "Classic nail care", durationMin: 30, basePrice: 20_00 },
      { name: "Gel Pedicure", description: "Gel polish pedicure", durationMin: 50, basePrice: 50_00 },
    ],
  },
  {
    name: "Nob Hill Nails",
    description: "Upscale nail salon on Nob Hill",
    address: "1000 California St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94108",
    latitude: 37.7919,
    longitude: -122.4118,
    rating: 4.75,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Luxury Gel Manicure", description: "Premium gel treatment", durationMin: 50, basePrice: 70_00 },
      { name: "Spa Pedicure", description: "Full spa treatment", durationMin: 60, basePrice: 75_00 },
    ],
  },
  {
    name: "Hayes Valley Polish",
    description: "Modern nail studio in Hayes Valley",
    address: "432 Hayes St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    latitude: 37.7765,
    longitude: -122.4234,
    rating: 4.55,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Organic Manicure", description: "Non-toxic polish manicure", durationMin: 45, basePrice: 45_00 },
      { name: "Classic Pedicure", description: "Standard pedicure", durationMin: 45, basePrice: 50_00 },
    ],
  },
  {
    name: "Sunset Nails SF",
    description: "Friendly nail salon in the Sunset",
    address: "1234 Irving St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94122",
    latitude: 37.7637,
    longitude: -122.4695,
    rating: 4.35,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Express Manicure", description: "Quick nail refresh", durationMin: 25, basePrice: 22_00 },
      { name: "Basic Pedicure", description: "Essential foot care", durationMin: 40, basePrice: 38_00 },
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
      { name: "Acrylic Full Set", description: "Acrylic nail extensions", durationMin: 75, basePrice: 65_00 },
    ],
  },
  {
    name: "Hollywood Glamour Nails",
    description: "Star-worthy nails in Hollywood",
    address: "6801 Hollywood Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90028",
    latitude: 34.1016,
    longitude: -118.3389,
    rating: 4.68,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Red Carpet Manicure", description: "Award-show ready nails", durationMin: 60, basePrice: 85_00 },
      { name: "Gel Extensions", description: "Natural-looking extensions", durationMin: 90, basePrice: 110_00 },
    ],
  },
  {
    name: "Silver Lake Nail Studio",
    description: "Artsy nail salon in Silver Lake",
    address: "2856 Sunset Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90026",
    latitude: 34.0839,
    longitude: -118.2736,
    rating: 4.48,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Artistic Nail Design", description: "Hand-painted nail art", durationMin: 75, basePrice: 80_00 },
      { name: "Natural Manicure", description: "Chemical-free nail care", durationMin: 40, basePrice: 40_00 },
    ],
  },

  // ==================== HAIR (10 providers) ====================
  {
    name: "Brooklyn Hair Co",
    description: "Modern hair salon in Williamsburg",
    address: "789 Bedford Ave",
    city: "New York City",
    state: "NY",
    zipCode: "11211",
    latitude: 40.7128,
    longitude: -73.9614,
    rating: 4.55,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Haircut & Style", description: "Precision cut with styling", durationMin: 45, basePrice: 75_00 },
      { name: "Color Treatment", description: "Full color or highlights", durationMin: 120, basePrice: 150_00 },
    ],
  },
  {
    name: "Fifth Avenue Cuts",
    description: "Luxury hair salon on Fifth Avenue",
    address: "500 Fifth Ave",
    city: "New York City",
    state: "NY",
    zipCode: "10110",
    latitude: 40.7549,
    longitude: -73.9840,
    rating: 4.88,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Executive Haircut", description: "Premium cut for professionals", durationMin: 45, basePrice: 95_00 },
      { name: "Blowout", description: "Professional blowout styling", durationMin: 30, basePrice: 55_00 },
    ],
  },
  {
    name: "East Village Styles",
    description: "Edgy hair studio in East Village",
    address: "142 E 7th St",
    city: "New York City",
    state: "NY",
    zipCode: "10009",
    latitude: 40.7264,
    longitude: -73.9846,
    rating: 4.42,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Creative Cut", description: "Avant-garde hairstyling", durationMin: 60, basePrice: 85_00 },
      { name: "Vivid Color", description: "Bold fashion colors", durationMin: 150, basePrice: 200_00 },
    ],
  },
  {
    name: "Tribeca Hair Lounge",
    description: "Sophisticated salon in Tribeca",
    address: "75 Greenwich St",
    city: "New York City",
    state: "NY",
    zipCode: "10006",
    latitude: 40.7095,
    longitude: -74.0135,
    rating: 4.75,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Women's Haircut", description: "Stylish cut and finish", durationMin: 50, basePrice: 90_00 },
      { name: "Keratin Treatment", description: "Smoothing treatment", durationMin: 180, basePrice: 300_00 },
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
      { name: "Balayage Highlights", description: "Hand-painted highlights", durationMin: 150, basePrice: 200_00 },
    ],
  },
  {
    name: "Pacific Heights Hair",
    description: "Elegant salon in Pacific Heights",
    address: "2100 Fillmore St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94115",
    latitude: 37.7899,
    longitude: -122.4346,
    rating: 4.72,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Women's Cut & Style", description: "Full service cut and style", durationMin: 60, basePrice: 110_00 },
      { name: "Brazilian Blowout", description: "Smoothing treatment", durationMin: 120, basePrice: 250_00 },
    ],
  },
  {
    name: "Mission Cuts",
    description: "Diverse hair studio in the Mission",
    address: "2850 Mission St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94110",
    latitude: 37.7504,
    longitude: -122.4184,
    rating: 4.35,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Basic Haircut", description: "Simple cut and style", durationMin: 30, basePrice: 35_00 },
      { name: "Partial Highlights", description: "Face-framing highlights", durationMin: 90, basePrice: 120_00 },
    ],
  },
  {
    name: "Melrose Hair Studio",
    description: "Trendy salon on Melrose Avenue",
    address: "7400 Melrose Ave",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90046",
    latitude: 34.0836,
    longitude: -118.3505,
    rating: 4.62,
    category: ServiceCategory.HAIR,
    services: [
      { name: "LA Cut & Style", description: "California-cool haircut", durationMin: 45, basePrice: 80_00 },
      { name: "Sun-Kissed Highlights", description: "Natural beach highlights", durationMin: 120, basePrice: 180_00 },
    ],
  },
  {
    name: "Beverly Hills Hair Design",
    description: "Celebrity stylist salon",
    address: "9100 Wilshire Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90212",
    latitude: 34.0679,
    longitude: -118.3956,
    rating: 4.92,
    category: ServiceCategory.HAIR,
    services: [
      { name: "VIP Haircut", description: "A-list styling experience", durationMin: 60, basePrice: 150_00 },
      { name: "Color Correction", description: "Expert color fixing", durationMin: 240, basePrice: 400_00 },
    ],
  },
  {
    name: "Downtown LA Cuts",
    description: "Urban hair studio in DTLA",
    address: "800 S Broadway",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90014",
    latitude: 34.0438,
    longitude: -118.2551,
    rating: 4.28,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Quick Trim", description: "Fast haircut", durationMin: 25, basePrice: 30_00 },
      { name: "Single Process Color", description: "All-over color", durationMin: 90, basePrice: 100_00 },
    ],
  },

  // ==================== FACIALS_AND_SKIN (10 providers) ====================
  {
    name: "Fifth Avenue Glow",
    description: "Luxury facials and skincare in Upper East Side",
    address: "890 Fifth Ave",
    city: "New York City",
    state: "NY",
    zipCode: "10065",
    latitude: 40.7730,
    longitude: -73.9650,
    rating: 4.88,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "European Facial", description: "Classic deep cleansing facial", durationMin: 60, basePrice: 140_00 },
      { name: "Anti-Aging Treatment", description: "Collagen-boosting facial", durationMin: 75, basePrice: 180_00 },
    ],
  },
  {
    name: "SoHo Skin Studio",
    description: "Minimalist skincare in SoHo",
    address: "120 Prince St",
    city: "New York City",
    state: "NY",
    zipCode: "10012",
    latitude: 40.7253,
    longitude: -73.9986,
    rating: 4.65,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Express Facial", description: "Quick skin refresh", durationMin: 30, basePrice: 75_00 },
      { name: "Acne Treatment", description: "Deep pore cleansing", durationMin: 60, basePrice: 120_00 },
    ],
  },
  {
    name: "Midtown Derma Spa",
    description: "Clinical skincare in Midtown",
    address: "350 Madison Ave",
    city: "New York City",
    state: "NY",
    zipCode: "10017",
    latitude: 40.7563,
    longitude: -73.9787,
    rating: 4.78,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Chemical Peel", description: "Exfoliating peel treatment", durationMin: 45, basePrice: 150_00 },
      { name: "Microneedling", description: "Collagen induction therapy", durationMin: 60, basePrice: 250_00 },
    ],
  },
  {
    name: "Brooklyn Glow Bar",
    description: "Natural skincare in Brooklyn Heights",
    address: "150 Montague St",
    city: "New York City",
    state: "NY",
    zipCode: "11201",
    latitude: 40.6942,
    longitude: -73.9922,
    rating: 4.52,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Organic Facial", description: "All-natural skincare", durationMin: 60, basePrice: 110_00 },
      { name: "Hydrating Mask", description: "Intensive moisture treatment", durationMin: 45, basePrice: 85_00 },
    ],
  },
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
    name: "Union Square Skin",
    description: "Downtown skincare destination",
    address: "100 Powell St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    latitude: 37.7852,
    longitude: -122.4078,
    rating: 4.58,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Brightening Facial", description: "Vitamin C infused treatment", durationMin: 60, basePrice: 125_00 },
      { name: "LED Light Therapy", description: "Rejuvenating light treatment", durationMin: 30, basePrice: 80_00 },
    ],
  },
  {
    name: "Noe Valley Skin Care",
    description: "Neighborhood skincare in Noe Valley",
    address: "4000 24th St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94114",
    latitude: 37.7516,
    longitude: -122.4330,
    rating: 4.42,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Classic Facial", description: "Standard facial treatment", durationMin: 50, basePrice: 90_00 },
      { name: "Back Facial", description: "Back cleansing treatment", durationMin: 45, basePrice: 85_00 },
    ],
  },
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
      { name: "Oxygen Facial", description: "Rejuvenating oxygen infusion", durationMin: 60, basePrice: 200_00 },
    ],
  },
  {
    name: "West Hollywood Skin Lab",
    description: "Cutting-edge skincare in WeHo",
    address: "8500 Sunset Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90069",
    latitude: 34.0901,
    longitude: -118.3758,
    rating: 4.72,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Vampire Facial", description: "PRP facial treatment", durationMin: 90, basePrice: 350_00 },
      { name: "Dermaplaning", description: "Exfoliating blade treatment", durationMin: 45, basePrice: 120_00 },
    ],
  },
  {
    name: "Pasadena Skin Wellness",
    description: "Holistic skincare in Old Town",
    address: "45 S Raymond Ave",
    city: "Los Angeles",
    state: "CA",
    zipCode: "91105",
    latitude: 34.1456,
    longitude: -118.1489,
    rating: 4.48,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Calming Facial", description: "Soothing sensitive skin treatment", durationMin: 60, basePrice: 100_00 },
      { name: "Enzyme Peel", description: "Gentle exfoliating peel", durationMin: 45, basePrice: 95_00 },
    ],
  },

  // ==================== ACUPUNCTURE (10 providers) ====================
  {
    name: "East Meets West Acupuncture",
    description: "Traditional Chinese medicine in Chinatown",
    address: "65 Mott St",
    city: "New York City",
    state: "NY",
    zipCode: "10013",
    latitude: 40.7155,
    longitude: -73.9981,
    rating: 4.82,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Traditional Acupuncture", description: "Classic needle therapy", durationMin: 60, basePrice: 120_00 },
      { name: "Cupping Therapy", description: "Traditional cupping treatment", durationMin: 45, basePrice: 80_00 },
    ],
  },
  {
    name: "Upper East Acupuncture",
    description: "Upscale acupuncture on the Upper East Side",
    address: "1100 Park Ave",
    city: "New York City",
    state: "NY",
    zipCode: "10128",
    latitude: 40.7847,
    longitude: -73.9534,
    rating: 4.75,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Cosmetic Acupuncture", description: "Facial rejuvenation needling", durationMin: 75, basePrice: 175_00 },
      { name: "Pain Management", description: "Targeted pain relief", durationMin: 60, basePrice: 130_00 },
    ],
  },
  {
    name: "Park Slope Wellness",
    description: "Community acupuncture in Park Slope",
    address: "200 7th Ave",
    city: "New York City",
    state: "NY",
    zipCode: "11215",
    latitude: 40.6722,
    longitude: -73.9797,
    rating: 4.55,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Community Acupuncture", description: "Affordable group session", durationMin: 45, basePrice: 40_00 },
      { name: "Private Session", description: "One-on-one treatment", durationMin: 60, basePrice: 95_00 },
    ],
  },
  {
    name: "Flatiron Healing Arts",
    description: "Integrative acupuncture in Flatiron",
    address: "25 W 23rd St",
    city: "New York City",
    state: "NY",
    zipCode: "10010",
    latitude: 40.7420,
    longitude: -73.9909,
    rating: 4.68,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Stress Relief Acupuncture", description: "Calming needle therapy", durationMin: 60, basePrice: 110_00 },
      { name: "Fertility Support", description: "Reproductive wellness", durationMin: 75, basePrice: 150_00 },
    ],
  },
  {
    name: "Golden Gate Acupuncture",
    description: "Holistic healing near the park",
    address: "3200 Clement St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94121",
    latitude: 37.7827,
    longitude: -122.4956,
    rating: 4.62,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Full Body Acupuncture", description: "Comprehensive treatment", durationMin: 60, basePrice: 100_00 },
      { name: "Moxibustion", description: "Heat therapy treatment", durationMin: 45, basePrice: 75_00 },
    ],
  },
  {
    name: "Embarcadero Healing Center",
    description: "Downtown acupuncture for professionals",
    address: "2 Embarcadero Center",
    city: "San Francisco",
    state: "CA",
    zipCode: "94111",
    latitude: 37.7947,
    longitude: -122.3989,
    rating: 4.48,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Lunch Break Acupuncture", description: "Quick midday session", durationMin: 30, basePrice: 65_00 },
      { name: "Executive Stress Relief", description: "Targeted relaxation", durationMin: 60, basePrice: 120_00 },
    ],
  },
  {
    name: "Mission TCM",
    description: "Traditional Chinese Medicine in the Mission",
    address: "2700 Mission St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94110",
    latitude: 37.7535,
    longitude: -122.4189,
    rating: 4.38,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Sliding Scale Acupuncture", description: "Affordable treatment", durationMin: 45, basePrice: 35_00 },
      { name: "Herbal Consultation", description: "Chinese herb prescription", durationMin: 30, basePrice: 50_00 },
    ],
  },
  {
    name: "LA Acupuncture Collective",
    description: "Modern acupuncture in Arts District",
    address: "453 S Hewitt St",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90013",
    latitude: 34.0407,
    longitude: -118.2324,
    rating: 4.58,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Auricular Acupuncture", description: "Ear point therapy", durationMin: 30, basePrice: 55_00 },
      { name: "Full Treatment", description: "Comprehensive acupuncture", durationMin: 60, basePrice: 105_00 },
    ],
  },
  {
    name: "Santa Monica Integrative",
    description: "Beach-side healing center",
    address: "1600 Montana Ave",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90403",
    latitude: 34.0330,
    longitude: -118.4897,
    rating: 4.78,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Wellness Acupuncture", description: "Preventive health treatment", durationMin: 60, basePrice: 125_00 },
      { name: "Electroacupuncture", description: "Stimulated needle therapy", durationMin: 60, basePrice: 135_00 },
    ],
  },
  {
    name: "Koreatown Healing",
    description: "Korean-style acupuncture in K-Town",
    address: "3500 Wilshire Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90010",
    latitude: 34.0618,
    longitude: -118.3099,
    rating: 4.42,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Korean Hand Therapy", description: "Hand point acupuncture", durationMin: 45, basePrice: 70_00 },
      { name: "Body Acupuncture", description: "Full body treatment", durationMin: 60, basePrice: 90_00 },
    ],
  },

  // ==================== LASHES_AND_BROWS (10 providers) ====================
  {
    name: "NYC Lash Lounge",
    description: "Premier lash studio in Midtown",
    address: "315 W 39th St",
    city: "New York City",
    state: "NY",
    zipCode: "10018",
    latitude: 40.7559,
    longitude: -73.9928,
    rating: 4.85,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Classic Lash Extensions", description: "Natural lash look", durationMin: 90, basePrice: 150_00 },
      { name: "Brow Lamination", description: "Fluffy brow treatment", durationMin: 45, basePrice: 75_00 },
    ],
  },
  {
    name: "Brow Bar Brooklyn",
    description: "Expert brow styling in Williamsburg",
    address: "234 N 7th St",
    city: "New York City",
    state: "NY",
    zipCode: "11211",
    latitude: 40.7166,
    longitude: -73.9582,
    rating: 4.68,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Brow Shaping", description: "Precision brow design", durationMin: 30, basePrice: 35_00 },
      { name: "Brow Tint", description: "Color enhancement", durationMin: 20, basePrice: 25_00 },
    ],
  },
  {
    name: "Flatiron Lashes",
    description: "Volume lash specialists",
    address: "920 Broadway",
    city: "New York City",
    state: "NY",
    zipCode: "10010",
    latitude: 40.7397,
    longitude: -73.9893,
    rating: 4.72,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Volume Lashes", description: "Full dramatic lashes", durationMin: 120, basePrice: 200_00 },
      { name: "Lash Lift", description: "Natural lash curl", durationMin: 60, basePrice: 95_00 },
    ],
  },
  {
    name: "Upper West Brows",
    description: "Brow artistry on the Upper West Side",
    address: "2140 Broadway",
    city: "New York City",
    state: "NY",
    zipCode: "10023",
    latitude: 40.7816,
    longitude: -73.9812,
    rating: 4.55,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Microblading", description: "Semi-permanent brows", durationMin: 120, basePrice: 350_00 },
      { name: "Brow Wax & Tint", description: "Shape and color combo", durationMin: 35, basePrice: 50_00 },
    ],
  },
  {
    name: "Marina Lash Studio",
    description: "Luxury lash extensions in the Marina",
    address: "2222 Union St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94123",
    latitude: 37.7976,
    longitude: -122.4367,
    rating: 4.78,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Hybrid Lash Set", description: "Mix of classic and volume", durationMin: 105, basePrice: 175_00 },
      { name: "Lash Fill", description: "Maintenance appointment", durationMin: 60, basePrice: 85_00 },
    ],
  },
  {
    name: "SOMA Brow Bar",
    description: "Quick brow services downtown",
    address: "600 Howard St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    latitude: 37.7862,
    longitude: -122.3991,
    rating: 4.45,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Express Brow Wax", description: "Quick brow cleanup", durationMin: 15, basePrice: 20_00 },
      { name: "Brow Threading", description: "Precise hair removal", durationMin: 20, basePrice: 25_00 },
    ],
  },
  {
    name: "Castro Lash & Brow",
    description: "Inclusive beauty in the Castro",
    address: "520 Castro St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94114",
    latitude: 37.7609,
    longitude: -122.4350,
    rating: 4.52,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Classic Lashes", description: "Natural enhancement", durationMin: 90, basePrice: 140_00 },
      { name: "Brow Sculpting", description: "Custom brow design", durationMin: 40, basePrice: 45_00 },
    ],
  },
  {
    name: "Hollywood Lash Studio",
    description: "Celebrity lash artist in Hollywood",
    address: "1750 N Vine St",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90028",
    latitude: 34.1027,
    longitude: -118.3267,
    rating: 4.88,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Mega Volume Lashes", description: "Maximum drama", durationMin: 150, basePrice: 275_00 },
      { name: "Lash & Brow Combo", description: "Full eye makeover", durationMin: 135, basePrice: 180_00 },
    ],
  },
  {
    name: "West Hollywood Brows",
    description: "Brow perfection in WeHo",
    address: "8600 Santa Monica Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90069",
    latitude: 34.0899,
    longitude: -118.3772,
    rating: 4.65,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Powder Brows", description: "Ombre brow tattoo", durationMin: 120, basePrice: 400_00 },
      { name: "Brow Mapping", description: "Perfect shape design", durationMin: 30, basePrice: 40_00 },
    ],
  },
  {
    name: "Venice Lash Bar",
    description: "Beachy lash looks in Venice",
    address: "1416 Abbot Kinney Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90291",
    latitude: 33.9918,
    longitude: -118.4653,
    rating: 4.42,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Natural Lash Set", description: "Subtle enhancement", durationMin: 75, basePrice: 120_00 },
      { name: "Lash Removal", description: "Safe extension removal", durationMin: 30, basePrice: 35_00 },
    ],
  },

  // ==================== BALI PROVIDERS ====================
  // MASSAGE
  {
    name: "Ubud Healing Sanctuary",
    description: "Traditional Balinese massage in the heart of Ubud",
    address: "Jl. Raya Ubud No. 23",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80571",
    latitude: -8.5069,
    longitude: 115.2625,
    rating: 4.92,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Balinese Massage", description: "Traditional healing massage", durationMin: 60, basePrice: 45_00 },
      { name: "Hot Stone Therapy", description: "Volcanic stone treatment", durationMin: 90, basePrice: 65_00 },
    ],
  },
  {
    name: "Seminyak Spa Retreat",
    description: "Luxury beachside spa experience",
    address: "Jl. Kayu Aya No. 88",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80361",
    latitude: -8.6875,
    longitude: 115.1563,
    rating: 4.85,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Deep Tissue Massage", description: "Intensive muscle relief", durationMin: 60, basePrice: 55_00 },
      { name: "Aromatherapy Massage", description: "Essential oil relaxation", durationMin: 75, basePrice: 60_00 },
    ],
  },
  {
    name: "Canggu Wellness Center",
    description: "Modern wellness in surf paradise",
    address: "Jl. Pantai Batu Bolong No. 45",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80351",
    latitude: -8.6478,
    longitude: 115.1385,
    rating: 4.78,
    category: ServiceCategory.MASSAGE,
    services: [
      { name: "Sports Massage", description: "Recovery for active lifestyles", durationMin: 60, basePrice: 50_00 },
      { name: "Thai Massage", description: "Stretching and pressure", durationMin: 90, basePrice: 55_00 },
    ],
  },
  // NAILS
  {
    name: "Bali Nail Lounge",
    description: "Premium nail care in Seminyak",
    address: "Jl. Oberoi No. 12",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80361",
    latitude: -8.6912,
    longitude: 115.1578,
    rating: 4.82,
    category: ServiceCategory.NAILS,
    services: [
      { name: "Gel Manicure", description: "Long-lasting gel polish", durationMin: 45, basePrice: 25_00 },
      { name: "Spa Pedicure", description: "Luxury foot treatment", durationMin: 60, basePrice: 35_00 },
    ],
  },
  // FACIALS_AND_SKIN
  {
    name: "Ubud Skin Studio",
    description: "Natural skincare in the rice terraces",
    address: "Jl. Suweta No. 15",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80571",
    latitude: -8.5023,
    longitude: 115.2578,
    rating: 4.88,
    category: ServiceCategory.FACIALS_AND_SKIN,
    services: [
      { name: "Balinese Herbal Facial", description: "Traditional ingredients", durationMin: 60, basePrice: 40_00 },
      { name: "Anti-Aging Treatment", description: "Rejuvenating therapy", durationMin: 75, basePrice: 55_00 },
    ],
  },
  // HAIR
  {
    name: "Seminyak Hair Studio",
    description: "International styling in Bali",
    address: "Jl. Laksmana No. 55",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80361",
    latitude: -8.6845,
    longitude: 115.1612,
    rating: 4.75,
    category: ServiceCategory.HAIR,
    services: [
      { name: "Haircut & Style", description: "Expert cut and styling", durationMin: 45, basePrice: 30_00 },
      { name: "Hair Treatment", description: "Deep conditioning", durationMin: 60, basePrice: 40_00 },
    ],
  },
  // ACUPUNCTURE
  {
    name: "Ubud Traditional Healing",
    description: "Ancient acupuncture techniques in Ubud",
    address: "Jl. Hanoman No. 44",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80571",
    latitude: -8.5089,
    longitude: 115.2645,
    rating: 4.90,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Traditional Acupuncture", description: "Classic needle therapy", durationMin: 60, basePrice: 50_00 },
      { name: "Cupping Therapy", description: "Traditional cupping treatment", durationMin: 45, basePrice: 40_00 },
    ],
  },
  {
    name: "Sanur Wellness Acupuncture",
    description: "Holistic healing by the beach",
    address: "Jl. Danau Tamblingan No. 78",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80228",
    latitude: -8.6783,
    longitude: 115.2631,
    rating: 4.82,
    category: ServiceCategory.ACUPUNCTURE,
    services: [
      { name: "Pain Relief Acupuncture", description: "Targeted pain treatment", durationMin: 60, basePrice: 55_00 },
      { name: "Stress Relief Session", description: "Relaxation focused", durationMin: 75, basePrice: 60_00 },
    ],
  },
  // LASHES_AND_BROWS
  {
    name: "Bali Lash Studio",
    description: "Premium lash extensions in Seminyak",
    address: "Jl. Petitenget No. 99",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80361",
    latitude: -8.6756,
    longitude: 115.1589,
    rating: 4.85,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Classic Lash Extensions", description: "Natural lash enhancement", durationMin: 90, basePrice: 45_00 },
      { name: "Brow Shaping", description: "Perfect brow design", durationMin: 30, basePrice: 20_00 },
    ],
  },
  {
    name: "Canggu Brow Bar",
    description: "Trendy brow studio for surfers",
    address: "Jl. Batu Mejan No. 22",
    city: "Bali",
    state: "Indonesia",
    zipCode: "80351",
    latitude: -8.6512,
    longitude: 115.1356,
    rating: 4.72,
    category: ServiceCategory.LASHES_AND_BROWS,
    services: [
      { name: "Brow Lamination", description: "Fluffy brow treatment", durationMin: 45, basePrice: 35_00 },
      { name: "Lash Lift & Tint", description: "Natural lash curl", durationMin: 60, basePrice: 40_00 },
    ],
  },
];

// Slot configuration: varied discounts and time windows
interface SlotConfig {
  hourOffset: number; // Hour of day (9-19)
  discountPercent: number; // 0.10 to 0.30
  dayOffset: number; // 0 = today, 1 = tomorrow
}

// Extended slot configurations for all time windows with varied discounts
const slotConfigs: SlotConfig[] = [
  // Morning slots (9am-12pm) - 6 configs
  { hourOffset: 9, discountPercent: 0.15, dayOffset: 0 },
  { hourOffset: 9, discountPercent: 0.25, dayOffset: 1 },
  { hourOffset: 10, discountPercent: 0.20, dayOffset: 0 },
  { hourOffset: 10, discountPercent: 0.30, dayOffset: 1 },
  { hourOffset: 11, discountPercent: 0.18, dayOffset: 0 },
  { hourOffset: 11, discountPercent: 0.22, dayOffset: 1 },
  // Afternoon slots (12pm-4pm) - 6 configs
  { hourOffset: 12, discountPercent: 0.12, dayOffset: 0 },
  { hourOffset: 12, discountPercent: 0.28, dayOffset: 1 },
  { hourOffset: 13, discountPercent: 0.10, dayOffset: 0 },
  { hourOffset: 14, discountPercent: 0.15, dayOffset: 1 },
  { hourOffset: 15, discountPercent: 0.30, dayOffset: 0 },
  { hourOffset: 15, discountPercent: 0.20, dayOffset: 1 },
  // Evening slots (4pm-8pm) - 6 configs
  { hourOffset: 16, discountPercent: 0.12, dayOffset: 0 },
  { hourOffset: 16, discountPercent: 0.25, dayOffset: 1 },
  { hourOffset: 17, discountPercent: 0.18, dayOffset: 0 },
  { hourOffset: 18, discountPercent: 0.22, dayOffset: 0 },
  { hourOffset: 18, discountPercent: 0.28, dayOffset: 1 },
  { hourOffset: 19, discountPercent: 0.15, dayOffset: 1 },
];

async function main() {
  console.log("Seeding OpenSlots dev data with 10 providers per category...");

  // Wipe existing data in correct order (respecting foreign keys)
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
  const categoryCounts: Record<string, number> = {};

  for (const pData of providerData) {
    // Track category counts
    categoryCounts[pData.category] = (categoryCounts[pData.category] || 0) + 1;

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
    console.log(`Created provider: ${provider.name} (${provider.city}, ${pData.category})`);

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

      // Create 4-6 slots per service spread across time windows
      // Use stratified distribution to ensure Morning, Afternoon, and Evening slots
      const slotsPerService = 4 + (providerIndex % 3); // 4, 5, or 6 slots
      const serviceIndex = pData.services.indexOf(sData);

      // Create slots spread across Morning (0-5), Afternoon (6-11), Evening (12-17)
      for (let i = 0; i < slotsPerService; i++) {
        // Distribute across time windows: Morning, Afternoon, Evening
        const timeWindowIndex = i % 3; // 0=Morning, 1=Afternoon, 2=Evening
        const configOffset = timeWindowIndex * 6; // Each window has 6 configs
        const withinWindowIndex = Math.floor(i / 3) + (providerIndex + serviceIndex) % 6;
        const configIndex = configOffset + (withinWindowIndex % 6);
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
  console.log(`- Providers per category:`);
  for (const [category, count] of Object.entries(categoryCounts)) {
    console.log(`  - ${category}: ${count}`);
  }
  console.log(`- Covering cities: New York, San Francisco, Los Angeles`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
