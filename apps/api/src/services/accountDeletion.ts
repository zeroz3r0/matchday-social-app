// ============================================================================
// Account Deletion Service — anonymization + hard-delete (REQ-AD-7)
//
// Behavior matches design §4.3:
//
//   anonymizeUser(userId, tx)
//     1. Mutate the User row in place — scrub personal fields, but keep the id
//        so all FK references (Match.createdById, MatchStat.playerId,
//        PlayerVote.voterId/targetPlayerId, Competition.createdById,
//        StatConfirmation.userId) stay valid. Match history survives.
//     2. Delete ClubMember rows — membership ENDS with the account.
//
//   hardDeleteUser(userId, prisma)
//     Wraps anonymizeUser in a Serializable transaction with a 60-second
//     timeout (cron-vs-cancel race protection).
//
// The DB-level nickname becomes `usuario_eliminado_<shortId>` because the
// User.nickname column has a unique constraint. The public-friendly
// `"Usuario eliminado"` label is applied at READ time by
// `userPublicProjection` (see utils/userPublicProjection.ts).
// ============================================================================

import type { PrismaClient } from '@prisma/client';

// Prisma's transaction callback receives a TransactionClient — we do not
// import that type directly because it lives behind a generic. The narrow
// shape we actually use is captured here: just the methods we call.
type TxClient = {
  user: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  };
  clubMember: {
    deleteMany: (args: { where: { userId: string } }) => Promise<{ count: number }>;
  };
  pushToken: {
    deleteMany: (args: { where: { userId: string } }) => Promise<{ count: number }>;
  };
};

const ANON_NICKNAME_PREFIX = 'usuario_eliminado_';
const ANON_EMAIL_DOMAIN = '@matchday.local';

export async function anonymizeUser(userId: string, tx: TxClient): Promise<void> {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Unique-safe nickname — the User.nickname column has a unique constraint,
  // so we can't reuse the literal "Usuario eliminado" string across multiple
  // anonymized rows. Truncated id keeps the value short + searchable.
  const shortId = user.id.substring(0, 8).toLowerCase();

  await tx.user.update({
    where: { id: userId },
    data: {
      nickname: `${ANON_NICKNAME_PREFIX}${shortId}`,
      email: `deleted-${userId}${ANON_EMAIL_DOMAIN}`,
      avatarUrl: null,
      bio: null,
      city: null,
      latitude: null,
      longitude: null,
    },
  });

  // Membership rows DIE with the account — these aren't part of the historical
  // record (Match/Stat/Vote rows ARE, and stay).
  await tx.clubMember.deleteMany({ where: { userId } });

  // PushToken rows DIE with the account. The User row stays (FK preservation
  // for Match/Stat history), so the FK cascade never fires on delete — we
  // explicitly purge tokens here. Stops the anonymized account from receiving
  // any further pushes (REQ Migrate Legacy Call Sites + push-notifications-
  // real-impl D.6).
  await tx.pushToken.deleteMany({ where: { userId } });
}

export async function hardDeleteUser(userId: string, prisma: PrismaClient): Promise<void> {
  // Serializable isolation prevents the cron-vs-cancel race: if a user calls
  // /me/delete/cancel concurrently, one branch retries/fails and the cron
  // treats failed-due-to-cancel as a no-op (handled by caller).
  await prisma.$transaction(
    async (tx) => {
      await anonymizeUser(userId, tx as unknown as TxClient);
    },
    { isolationLevel: 'Serializable', timeout: 60_000 },
  );
}
