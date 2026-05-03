import router from '@adonisjs/core/services/router';
import { middleware } from './kernel.js';

const AuthController = () => import('../app/controllers/auth_controller.js');
const ProjectsController = () => import('../app/controllers/projects_controller.js');
const EndpointsController = () => import('../app/controllers/endpoints_controller.js');
const MockController = () => import('../app/controllers/mock_controller.js');

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
| Project Routes (Protected)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('/', [ProjectsController, 'index']);
    router.post('/', [ProjectsController, 'store']);
    router.get('/:id', [ProjectsController, 'show']);
    router.put('/:id', [ProjectsController, 'update']);
    router.delete('/:id', [ProjectsController, 'destroy']);
  })
  .prefix('/api/projects')
  .use(middleware.auth());

/*
|--------------------------------------------------------------------------
| Endpoint Routes (Protected)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('/api/projects/:projectId/endpoints', [EndpointsController, 'index']);
    router.post('/api/projects/:projectId/endpoints', [EndpointsController, 'store']);
    router.get('/api/endpoints/:id', [EndpointsController, 'show']);
    router.put('/api/endpoints/:id', [EndpointsController, 'update']);
    router.delete('/api/endpoints/:id', [EndpointsController, 'destroy']);
    router.patch('/api/endpoints/:id/toggle', [EndpointsController, 'toggle']);
  })
  .use(middleware.auth());

/*
|--------------------------------------------------------------------------
| Mock Execution (Public)
|--------------------------------------------------------------------------
*/
router.any('/mock/:projectSlug/*', [MockController, 'execute']);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
router.get('/health', async ({ response }) => {
  return response.ok({ status: 'ok', timestamp: new Date().toISOString() });
});
