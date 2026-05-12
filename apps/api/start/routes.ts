import router from '@adonisjs/core/services/router';
import { middleware } from './kernel.js';

const AuthController = () => import('../app/controllers/auth_controller.js');
const ProjectsController = () => import('../app/controllers/projects_controller.js');
const EndpointsController = () => import('../app/controllers/endpoints_controller.js');
const MockController = () => import('../app/controllers/mock_controller.js');
const TeamController = () => import('../app/controllers/team_controller.js');
const InviteController = () => import('../app/controllers/invite_controller.js');
const VersionController = () => import('../app/controllers/version_controller.js')
const RequestLogsController = () => import('../app/controllers/request_logs_controller.js');

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
    router.post('/verify/:token', [AuthController, 'verifyEmail']);
    router.post('/forgot-password', [AuthController, 'forgotPassword']);
    router.post('/reset-password/:token', [AuthController, 'resetPassword']);
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
    router.patch('/profile', [AuthController, 'updateProfile']);
    router.post('/resend-verification', [AuthController, 'resendVerification']);
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
| Team Routes (Protected)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('/:projectId/team', [TeamController, 'index']);
    router.post('/:projectId/team/invite', [TeamController, 'invite']);
    router.put('/:projectId/team/:memberId/role', [TeamController, 'updateRole']);
    router.delete('/:projectId/team/:memberId', [TeamController, 'removeMember']);
    router.delete('/:projectId/invites/:inviteId', [TeamController, 'revokeInvite']);
  })
  .prefix('/api/projects')
  .use(middleware.auth());

/*
|--------------------------------------------------------------------------
| My Memberships - GET /api/team
|--------------------------------------------------------------------------
*/
router.get('/api/team', [TeamController, 'myMemberships']).use(middleware.auth());

/*
|--------------------------------------------------------------------------
| Version History Routes (Protected)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('/:projectId/versions', [VersionController, 'index']);
    router.post('/:projectId/versions', [VersionController, 'store']);
    router.get('/:projectId/versions/:id', [VersionController, 'show']);
    router.post('/:projectId/versions/:id/restore', [VersionController, 'restore']);
    router.get('/:projectId/request-logs', [RequestLogsController, 'index']);
  })
  .prefix('/api/projects')
  .use(middleware.auth());

/*
|--------------------------------------------------------------------------
| Invite Routes
|--------------------------------------------------------------------------
*/
router.get('/api/invites/pending', [InviteController, 'pending']).use(middleware.auth());
router.get('/api/invites/:token', [InviteController, 'show']);
router.post('/api/invites/:token/accept', [InviteController, 'accept']).use(middleware.auth());

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
