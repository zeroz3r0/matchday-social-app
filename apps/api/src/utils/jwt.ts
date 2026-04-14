// ============================================================================
// JWT Utilities
// ============================================================================

import jwt from 'jsonwebtoken';

const JWT_SECRET: jwt.Secret = process.env['JWT_SECRET'] || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  nickname: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
