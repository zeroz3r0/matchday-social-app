// ============================================================================
// Auth Routes — Registro y Login + Password Recovery (forgot/reset)
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { sendEmail } from '../services/email';
import { createTokenForUser, consumeToken, TokenInvalidError } from '../services/passwordReset';
import { logger } from '../utils/logger';
import { Sentry } from '../lib/sentry';

export const authRoutes = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nickname: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .max(24, 'Maximo 24 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo letras, numeros, puntos, guiones y guiones bajos'),
  position: z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

// ─── POST /api/auth/register ────────────────────────────────────────────────

authRoutes.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nickname: data.nickname,
        position: data.position,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        position: true,
        avatarUrl: true,
        bio: true,
        city: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });

    res.status(201).json({
      success: true,
      data: { user, token },
      message: 'Usuario registrado correctamente',
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────

authRoutes.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' },
      });
      return;
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' },
      });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          position: user.position,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          city: user.city,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Password Recovery ──────────────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const VAGUE_FORGOT_MESSAGE = 'Si tu email está registrado, recibirás un email';

// Per-email rate limiter for forgot-password (AR-3): 3 calls/hour/email.
// Using `express-rate-limit` with `keyGenerator: req.body.email`. NOTE: this
// means malformed bodies hit the limiter too, but Zod validation runs AFTER
// the limiter — fine, since malformed emails are rejected with 400 anyway.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
    return `forgot:${email}`;
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Demasiadas peticiones, intenta de nuevo más tarde',
    },
  },
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────

authRoutes.post(
  '/forgot-password',
  forgotPasswordLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    let parsed: z.infer<typeof forgotPasswordSchema>;
    try {
      parsed = forgotPasswordSchema.parse(req.body);
    } catch (err) {
      // Validation errors propagate to the global error handler — preserves
      // the standard VALIDATION_ERROR envelope shape.
      next(err);
      return;
    }

    // Anti-enumeration (AR-1): regardless of whether the user exists, OR
    // whether token creation / email send fails internally, ALWAYS respond
    // with the same vague success message. Internal errors are captured to
    // Sentry but never leak to the response.
    try {
      const user = await prisma.user.findUnique({
        where: { email: parsed.email },
      });

      if (user) {
        const plaintext = await createTokenForUser(user.id);
        const baseUrl = process.env['APP_RESET_URL_BASE'] ?? 'https://matchday.app';
        const link = `${baseUrl}/reset?token=${plaintext}`;
        const html =
          `<p>Hola ${user.nickname}, hacé click acá para resetear tu contraseña: ` +
          `<a href="${link}">${link}</a>.</p>` +
          `<p>Si no fuiste vos, ignorá este email. El link expira en 1 hora.</p>`;

        try {
          await sendEmail({
            to: user.email,
            subject: 'Restablece tu contraseña en matchday',
            html,
          });
        } catch (emailErr) {
          // Email transport failures must not leak as success/failure
          // signals — log + capture, then continue with vague success.
          logger.error({ err: emailErr }, 'forgot_password_email_failed');
          Sentry.captureException(emailErr);
        }
      }
    } catch (internalErr) {
      logger.error({ err: internalErr }, 'forgot_password_internal_error');
      Sentry.captureException(internalErr);
      // Fall through to vague success.
    }

    res.json({
      success: true,
      data: { message: VAGUE_FORGOT_MESSAGE },
    });
  },
);

// ─── POST /api/auth/reset-password ──────────────────────────────────────────

authRoutes.post(
  '/reset-password',
  async (req: Request, res: Response, next: NextFunction) => {
    let parsed: z.infer<typeof resetPasswordSchema>;
    try {
      parsed = resetPasswordSchema.parse(req.body);
    } catch (err) {
      next(err);
      return;
    }

    try {
      await consumeToken(parsed.token, parsed.newPassword);
      res.json({ success: true, data: { message: 'Contraseña actualizada' } });
    } catch (err) {
      if (err instanceof TokenInvalidError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token inválido o expirado',
          },
        });
        return;
      }
      logger.error({ err }, 'reset_password_internal_error');
      Sentry.captureException(err);
      next(err);
    }
  },
);
