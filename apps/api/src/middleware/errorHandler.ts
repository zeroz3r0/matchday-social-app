// ============================================================================
// Global Error Handler
//
// Envelope contract (REQ-BS-4 — preserved):
//   { success: false, error: { code, message, details?, data? } }
//
// `details` is reserved for ZodError-shaped validation issues
// (`Record<string, string[]>`). `data` is a free-form payload propagated
// from `AppError` for richer context (e.g. retryAfter, lock reason).
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err }, 'request_error');

  // ─── App Errors (known) ─────────────────────────────────────────────
  if (err instanceof AppError) {
    const body: {
      success: false;
      error: {
        code: string;
        message: string;
        details?: Record<string, string[]>;
        data?: unknown;
      };
    } = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details !== undefined) body.error.details = err.details;
    if (err.data !== undefined) body.error.data = err.data;
    res.status(err.statusCode).json(body);
    return;
  }

  // ─── Zod Validation Errors ──────────────────────────────────────────
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!details[path]) details[path] = [];
      details[path]!.push(e.message);
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada invalidos',
        details,
      },
    });
    return;
  }

  // ─── Prisma Errors ─────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.['target'] as string[]) || ['campo'];
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: `Ya existe un registro con ese ${target.join(', ')}`,
          },
        });
        return;
      }
      case 'P2025':
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Registro no encontrado',
          },
        });
        return;
    }
  }

  // ─── Unknown Errors ─────────────────────────────────────────────────
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env['NODE_ENV'] === 'production' ? 'Error interno del servidor' : err.message,
    },
  });
}
