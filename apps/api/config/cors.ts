import { defineConfig } from '@adonisjs/cors';
import env from '#start/env';

const corsConfig = defineConfig({
  enabled: true,
  // The dashboard's origin: the same APP_URL the emailed links point at.
  origin: [new URL(env.get('APP_URL') ?? 'http://localhost:3001').origin],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
});

export default corsConfig;
