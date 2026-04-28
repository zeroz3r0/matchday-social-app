import { describe, it, expect } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import { z, ZodError } from 'zod';
import { errorHandler, AppError } from '../middleware/errorHandler';

function buildApp(throwFn: () => unknown) {
  const app = express();
  app.use(express.json());
  app.get('/boom', (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = throwFn();
      if (result instanceof Promise) {
        result.catch(next);
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler envelope', () => {
  it('AppError → status + envelope { success:false, error:{code,message} }', async () => {
    const app = buildApp(() => {
      throw new AppError(400, 'BAD_INPUT', 'Datos invalidos');
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_INPUT');
    expect(res.body.error.message).toBe('Datos invalidos');
  });

  it('generic Error → 500 envelope with INTERNAL_ERROR code', async () => {
    const app = buildApp(() => {
      throw new Error('boom');
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('ZodError → 400 envelope with VALIDATION_ERROR code and details', async () => {
    const schema = z.object({ email: z.string().email() });
    const app = buildApp(() => {
      try {
        schema.parse({ email: 'not-an-email' });
      } catch (err) {
        if (err instanceof ZodError) throw err;
        throw err;
      }
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details.email).toBeDefined();
    expect(Array.isArray(res.body.error.details.email)).toBe(true);
  });

  it('AppError with data field → propagates data in error response', async () => {
    const app = buildApp(() => {
      throw new AppError(403, 'PROFILE_LOCKED', 'Cuenta bloqueada', undefined, {
        retryAfter: 30,
        reason: 'tos_violation',
      });
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PROFILE_LOCKED');
    expect(res.body.error.data).toEqual({
      retryAfter: 30,
      reason: 'tos_violation',
    });
  });

  it('AppError without data field → no data key in error response', async () => {
    const app = buildApp(() => {
      throw new AppError(400, 'BAD_INPUT', 'msg');
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.error.data).toBeUndefined();
  });
});
