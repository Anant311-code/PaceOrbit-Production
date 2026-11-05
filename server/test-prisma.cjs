
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

console.log("Activity delegate:", typeof prisma.activity);

prisma.$disconnect();
