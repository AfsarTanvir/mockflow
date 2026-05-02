import router from '@adonisjs/core/services/router';
import { middleware } from './kernel.js';

const AuthController = () => import('../app/controllers/auth_controller.js');

/*
|--------------------------------------------------------------------------
| Auth Routes (Public)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.post('/register', [AuthController, 'register']);
    router.post('/login', [AuthController, 'login']);
    router.post('/refresh', [AuthController, 'refresh']);
  })
  .prefix('/api/auth');

/*
|--------------------------------------------------------------------------
| Auth Routes (Protected)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('/me', [AuthController, 'me']);
    router.post('/logout', [AuthController, 'logout']);
  })
  .prefix('/api/auth')
  .use(middleware.auth());

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
router.get('/health', async ({ response }) => {
  return response.ok({ status: 'ok', timestamp: new Date().toISOString() });
});
