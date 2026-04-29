import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import { LATEST_TOS_VERSION, LATEST_PRIVACY_VERSION } from '../services/legal';

describe('Legal Routes', () => {
  describe('GET /api/legal/tos', () => {
    it('returns 200 with envelope { success, data: { version, content } } (no auth)', async () => {
      const res = await request(app).get('/api/legal/tos');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe('v1');
      expect(res.body.data.content).toContain('# Términos de Servicio');
    });

    it('data.version matches LATEST_TOS_VERSION()', async () => {
      const res = await request(app).get('/api/legal/tos');

      expect(res.body.data.version).toBe(LATEST_TOS_VERSION());
    });

    it('sets Cache-Control: max-age=300', async () => {
      const res = await request(app).get('/api/legal/tos');

      expect(res.headers['cache-control']).toBe('max-age=300');
    });
  });

  describe('GET /api/legal/privacy', () => {
    it('returns 200 with envelope { success, data: { version, content } } (no auth)', async () => {
      const res = await request(app).get('/api/legal/privacy');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe('v1');
      expect(res.body.data.content).toContain('# Política de Privacidad');
    });

    it('data.version matches LATEST_PRIVACY_VERSION()', async () => {
      const res = await request(app).get('/api/legal/privacy');

      expect(res.body.data.version).toBe(LATEST_PRIVACY_VERSION());
    });

    it('sets Cache-Control: max-age=300', async () => {
      const res = await request(app).get('/api/legal/privacy');

      expect(res.headers['cache-control']).toBe('max-age=300');
    });
  });
});
