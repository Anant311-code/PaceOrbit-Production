import { prisma } from "../src/config/prisma.js";

async function seedChallenges() {
  const now = new Date();

  const weekStart = new Date(now);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const challenges = [
    {
      title: "The 20 KM Club",
      description: "Cover 20 kilometres this week. Every step counts.",
      activityType: "All",
      goalDistance: 20,
      startDate: weekStart,
      endDate: weekEnd,
    },
    {
      title: "Runner's Momentum",
      description: "Run 15 kilometres and build your weekly rhythm.",
      activityType: "Running",
      goalDistance: 15,
      startDate: weekStart,
      endDate: weekEnd,
    },
    {
      title: "Pedal Power",
      description: "Cycle 50 kilometres this week.",
      activityType: "Cycling",
      goalDistance: 50,
      startDate: weekStart,
      endDate: weekEnd,
    },
    {
      title: "The 100 KM Journey",
      description: "Accumulate 100 kilometres this month.",
      activityType: "All",
      goalDistance: 100,
      startDate: monthStart,
      endDate: monthEnd,
    },
  ];

  for (const challenge of challenges) {
    const existing = await prisma.challenge.findFirst({
      where: {
        title: challenge.title,
        startDate: challenge.startDate,
      },
    });

    if (!existing) {
      await prisma.challenge.create({
        data: challenge,
      });

      console.log(`Created: ${challenge.title}`);
    } else {
      console.log(`Already exists: ${challenge.title}`);
    }
  }
}

seedChallenges()
  .catch((error) => {
    console.error("Challenge seed error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });