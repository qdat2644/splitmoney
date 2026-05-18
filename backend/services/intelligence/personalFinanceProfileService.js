import prisma from '../../utils/db.js';
import { inferProfile } from './profileInferenceEngine.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Ensures the financial profile is up to date, regenerates if stale.
 * Uses a lazy refresh strategy based on lastComputedAt.
 */
async function getOrRefreshProfile(userId, force = false) {
  let profileRecord = await prisma.financialProfile.findUnique({
    where: { userId }
  });

  const now = new Date();
  const isStale = !profileRecord || (now.getTime() - new Date(profileRecord.lastComputedAt).getTime() > CACHE_TTL_MS);

  if (force || isStale) {
    // 1. Fetch user data (raw deterministic facts)
    const [expenses, budgets, plans, paymentsFrom, paymentsTo] = await Promise.all([
      // Only consider expenses paid by the user or where user is a participant
      prisma.expense.findMany({
        where: {
          OR: [
            { paidByUserId: userId },
            { participants: { some: { userId } } }
          ]
        },
        include: { participants: true },
        orderBy: { date: 'asc' }
      }),
      prisma.budget.findMany({
        where: { userId }
      }),
      prisma.plan.findMany({
        where: { createdByUserId: userId },
        include: { expenses: true }
      }),
      prisma.payment.findMany({
        where: { fromUserId: userId },
        orderBy: { paidAt: 'asc' }
      }),
      prisma.payment.findMany({
        where: { toUserId: userId },
        orderBy: { paidAt: 'asc' }
      })
    ]);

    // 2. Infer Profile deterministically
    const newProfile = inferProfile({
      userId,
      expenses,
      budgets,
      plans,
      payments: { from: paymentsFrom, to: paymentsTo }
    });

    const serializedData = JSON.stringify(newProfile);

    // 3. Store / Update Profile
    profileRecord = await prisma.financialProfile.upsert({
      where: { userId },
      update: {
        profileData: serializedData,
        lastComputedAt: now
      },
      create: {
        userId,
        profileData: serializedData,
        lastComputedAt: now
      }
    });
  }

  return JSON.parse(profileRecord.profileData);
}

/**
 * Triggers an invalidation of the cache so it will be regenerated on next request.
 * Should be called after significant mutations.
 */
async function invalidateProfileCache(userId) {
  // We can just set lastComputedAt to far past to force next read to recompute
  await prisma.financialProfile.updateMany({
    where: { userId },
    data: { lastComputedAt: new Date(0) }
  });
}

export {
  getOrRefreshProfile,
  invalidateProfileCache
};
