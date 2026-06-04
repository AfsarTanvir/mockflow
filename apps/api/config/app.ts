import { Secret } from '@adonisjs/core/helpers';
import { defineConfig } from '@adonisjs/core/http';
import env from '#start/env';

export const appKey = new Secret(env.get('APP_SECRET'));

export const http = defineConfig({
  generateRequestId: true,
  allowMethodSpoofing: false,
  useAsyncLocalStorage: false,
  trustProxy: false,
  subdomainOffset: 2,
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  },
});
