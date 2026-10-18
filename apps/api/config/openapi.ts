import { defineConfig } from '@foadonis/openapi';

/**
 * API docs at GET /api/docs (Scalar UI) and /api/docs.json, generated from the
 * routes in start/routes.ts and the @Api* decorators on the controllers.
 */
export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'MockFlow API',
      version: '1.0.0',
      description:
        'Collaborative API mock server. Sign in with POST /api/auth/login and send the returned token as `Authorization: Bearer <token>`. Mock endpoints answer at `/mock/{projectSlug}/…`.',
    },
    components: {
      securitySchemes: {
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description: 'Access token from POST /api/auth/login or /api/auth/register',
        },
      },
    },
  },
});
