// ============================================================================
// Auth Routes — Registro y Login
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';

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
