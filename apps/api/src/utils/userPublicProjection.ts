// ============================================================================
// userPublicProjection — read-time anonymization for soft-deleted users
//
// REQ-AD-5 + REQ-AD-7: when a user has `deletedAt` set, public-facing endpoints
// must show `nickname = "Usuario eliminado"` and null out personal fields
// (avatar, bio, city). FK references stay intact so match history, votes and
// stats keep their links — only the projected SHAPE changes at read time.
//
// The DB row itself only changes during anonymization (see services/
// accountDeletion.ts), where `nickname` becomes a unique-safe value like
// `usuario_eliminado_<shortId>`. This projection rewrites that to the
// public-friendly "Usuario eliminado" label whenever it sees `deletedAt`.
// ============================================================================

export type UserDbShape = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  bio?: string | null;
  city?: string | null;
  deletedAt: Date | null;
};

export type UserPublicShape = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
};

const ANON_NICKNAME = 'Usuario eliminado';

export function userPublicProjection(user: UserDbShape): UserPublicShape {
  if (user.deletedAt) {
    return {
      id: user.id,
      nickname: ANON_NICKNAME,
      avatarUrl: null,
      bio: null,
      city: null,
    };
  }
  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    bio: user.bio ?? null,
    city: user.city ?? null,
  };
}
