/**
 * Test utility: Fake expert ages for expiry engine testing.
 * Sets created_at, last_contact_update, and private_expires_at to the past
 * so the 30-day expiry rule triggers immediately.
 *
 * Usage:
 *   npm run expiry:fake-age [expertId] [daysAgo]
 *   npm run expiry:fake-age                    # ages up to 10 private experts with no verified contacts
 *   npm run expiry:fake-age abc123 45         # age expert abc123 by 45 days
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const expertId = process.argv[2];
  const daysAgo = parseInt(process.argv[3] ?? '35', 10);

  const past = new Date();
  past.setDate(past.getDate() - daysAgo);

  if (expertId) {
    const expert = await prisma.expert.findUnique({
      where: { id: expertId },
      include: { contacts: true },
    });
    if (!expert) {
      console.error('Expert not found:', expertId);
      process.exit(1);
    }
    const hasVerified = expert.contacts.some((c) => c.isVerified);
    if (hasVerified) {
      console.error(
        'Expert has verified contacts - will not be expired. Remove verification first.'
      );
      process.exit(1);
    }
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE experts
        SET created_at = ${past},
            last_contact_update = ${past},
            private_expires_at = ${past}
        WHERE id = ${expertId}
      `
    );
    console.log(
      `Aged expert ${expertId} by ${daysAgo} days. Run: GET /api/cron/expire-ownership`
    );
    return;
  }

  const candidates = await prisma.expert.findMany({
    where: {
      visibilityStatus: 'PRIVATE',
      contacts: {
        none: { isVerified: true },
      },
    },
    select: { id: true, name: true },
    take: 10,
  });

  if (candidates.length === 0) {
    console.log('No private experts without verified contacts. Create one first.');
    return;
  }

  for (const e of candidates) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE experts
        SET created_at = ${past},
            last_contact_update = ${past},
            private_expires_at = ${past}
        WHERE id = ${e.id}
      `
    );
    console.log(`Aged: ${e.name} (${e.id})`);
  }
  console.log(
    `\nAged ${candidates.length} expert(s) by ${daysAgo} days. Run the expiry cron to test.`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
