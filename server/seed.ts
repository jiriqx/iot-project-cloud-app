import { PrismaClient } from './app/generated/prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const zone = await prisma.zone.create({
    data: {
      name: 'Testovací zóna',
      timeoutSeconds: 30,
      sensorSensitivity: 'MEDIUM',
      lightingMode: 'automatic',
    },
  });

  const node = await prisma.node.create({
    data: {
      zoneId: zone.id,
      externalId: 'gateway-1/light-1',
      status: 'active',
    },
  });

  const light = await prisma.light.create({
    data: {
      nodeId: node.id,
      status: 'off',
      controlMode: 'auto',
      label: 'Světlo 1',
    },
  });

  console.log('OK', { zone: zone.id, node: node.id, light: light.id });
  await prisma.$disconnect();
}

seed().catch(console.error);
