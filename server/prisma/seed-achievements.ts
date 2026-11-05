
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const achievements = [
  {
    key: "FIRST_STEPS",
    name: "First Steps",
    description: "Complete your first fitness activity.",
    category: "MILESTONE",
    icon: "footprints",
    threshold: 1,
    points: 10,
  },
  {
    key: "TEN_KM",
    name: "10 KM Club",
    description: "Cover 10 kilometres in total.",
    category: "DISTANCE",
    icon: "medal",
    threshold: 10,
    points: 20,
  },
  {
    key: "TWENTY_FIVE_KM",
    name: "25 KM Explorer",
    description: "Reach 25 kilometres of total distance.",
    category: "DISTANCE",
    icon: "compass",
    threshold: 25,
    points: 30,
  },
  {
    key: "FIFTY_KM",
    name: "50 KM Champion",
    description: "Complete 50 kilometres in total.",
    category: "DISTANCE",
    icon: "award",
    threshold: 50,
    points: 50,
  },
  {
    key: "CENTURY_RUNNER",
    name: "Century Runner",
    description: "Reach the 100 kilometre milestone.",
    category: "DISTANCE",
    icon: "trophy",
    threshold: 100,
    points: 100,
  },
  {
    key: "TWO_FIFTY_KM",
    name: "250 KM Legend",
    description: "Cover an incredible 250 kilometres.",
    category: "DISTANCE",
    icon: "crown",
    threshold: 250,
    points: 150,
  },
  {
    key: "FIVE_HUNDRED_KM",
    name: "500 KM Elite",
    description: "Reach 500 kilometres of total distance.",
    category: "DISTANCE",
    icon: "flame",
    threshold: 500,
    points: 250,
  },
  {
    key: "THREE_DAY_STREAK",
    name: "Consistency Starter",
    description: "Stay active for three consecutive days.",
    category: "STREAK",
    icon: "calendar-check",
    threshold: 3,
    points: 30,
  },
  {
    key: "SEVEN_DAY_STREAK",
    name: "Consistency King",
    description: "Stay active for seven consecutive days.",
    category: "STREAK",
    icon: "zap",
    threshold: 7,
    points: 75,
  },
  {
    key: "EARLY_BIRD",
    name: "Early Bird",
    description: "Complete an activity before 7 AM.",
    category: "SPECIAL",
    icon: "sunrise",
    threshold: 7,
    points: 25,
  },
];

async function main() {
  console.log("Seeding PaceOrbit achievements...");

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement,
    });

    console.log(`✓ ${achievement.name}`);
  }

  console.log(`Successfully seeded ${achievements.length} achievements.`);
}

main()
  .catch((error) => {
    console.error("Achievement seed error:", error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });