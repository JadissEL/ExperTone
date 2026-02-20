/**
 * System Genesis 10.3 — Initialization seed.
 * Populates 5 experts with *expired* ownership so the Step 7 Cron Job
 * (GET /api/cron/expire-ownership) can transition them to Global Pool immediately.
 *
 * Run: npx tsx scripts/seed.ts
 * Then: GET /api/cron/expire-ownership (with CRON_SECRET) to test expiry.
 */

import { prisma } from '../lib/prisma';

const PAST_DAYS = 35;

async function main() {
  const past = new Date();
  past.setDate(past.getDate() - PAST_DAYS);

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'seed-owner@example.com',
        role: 'CSA',
      },
    });
    console.log('Created seed user:', user.email);
  }

  const names = [
    'Dr. Sarah Chen',
    'James Okonkwo',
    'Marie Dubois',
    'Hans Mueller',
    'Yuki Tanaka',
  ];

  const industrySubs = [
    { industry: 'Technology', sub: 'Semiconductors' },
    { industry: 'Healthcare', sub: 'Pharma' },
    { industry: 'Finance', sub: 'Asset Management' },
    { industry: 'Energy', sub: 'Renewables' },
    { industry: 'Retail', sub: 'E-commerce' },
  ];

  for (let i = 0; i < 5; i++) {
    const item = industrySubs[i];
    const name = names[i];
    if (!item || !name) continue;
    const { industry, sub } = item;
    const expert = await prisma.expert.create({
      data: {
        name,
        industry,
        subIndustry: sub,
        country: 'United States',
        region: 'North America',
        seniorityScore: 50 + i * 10,
        yearsExperience: 5 + i,
        predictedRate: 150 + i * 25,
        ownerId: user.id,
        visibilityStatus: 'PRIVATE',
        privateExpiresAt: past,
        lastContactUpdate: past,
        totalEngagements: 0,
      },
    });
    console.log('Created expired-ownership expert:', expert.name, expert.id);
  }

  console.log('\nDone. 5 experts created with last_contact_update and private_expires_at', PAST_DAYS, 'days ago.');
  console.log('Run the expiry cron to move them to Global Pool: GET /api/cron/expire-ownership');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
