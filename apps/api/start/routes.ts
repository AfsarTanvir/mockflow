import router from '@adonisjs/core/services/router';
import { middleware } from './kernel.js';

const AuthController = () => import('../app/controllers/auth_controller.js');
const ProjectsController = () => import('../app/controllers/projects_controller.js');
const EndpointsController = () => import('../app/controllers/endpoints_controller.js');
const MockController = () => import('../app/controllers/mock_controller.js');
const TeamController = () => import('../app/controllers/team_controller.js');
const InviteController = () => import('../app/controllers/invite_controller.js');
const VersionController = () => import('../app/controllers/version_controller.js');
const RequestLogsController = () => import('../app/controllers/request_logs_controller.js');
const ExportController = () => import('../app/controllers/export_controller.js');
const ImportController = () => import('../app/controllers/import_controller.js');
const ScenariosController = () => import('../app/controllers/scenarios_controller.js');
const RulesController = () => import('../app/controllers/rules_controller.js');
const CompaniesController = () => import('../app/controllers/companies_controller.js');
const ProfilesController = () => import('../app/controllers/profiles_controller.js');
const TeamsController = () => import('../app/controllers/teams_controller.js');
const TeamMembershipsController = () => import('../app/controllers/team_memberships_controller.js');
const AdminController = () => import('../app/controllers/admin_controller.js');
const AdminCacheController = () => import('../app/controllers/admin_cache_controller.js');
const UploadsController = () => import('../app/controllers/uploads_controller.js');

/*
|--------------------------------------------------------------------------
| Uploads (Public) — serves stored avatar images
|--------------------------------------------------------------------------
*/
router.get('/uploads/avatars/:file', [UploadsController, 'avatar']);

/*
|--------------------------------------------------------------------------
| Auth Routes (Public)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    // Throttle the unauthenticated, abuse-prone endpoints (per IP + route):
    // brute-force on login, account/mail flooding on register + forgot-password.
    router
      .post('/register', [AuthController, 'register'])
      .use(middleware.throttle({ max: 5, windowMs: 60_000 }));
    router
      .post('/login', [AuthController, 'login'])
      .use(middleware.throttle({ max: 10, windowMs: 60_000 }));
    router.post('/refresh', [AuthController, 'refresh']);
    router.post('/verify/:token', [AuthController, 'verifyEmail']);
    router
      .post('/forgot-password', [AuthController, 'forgotPassword'])
      .use(middleware.throttle({ max: 5, windowMs: 60_000 }));
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
    router.post('/avatar', [AuthController, 'uploadAvatar']);
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

    // Scenarios
    router.get('/api/endpoints/:endpointId/scenarios', [ScenariosController, 'index']);
    router.post('/api/endpoints/:endpointId/scenarios', [ScenariosController, 'store']);
    router.post('/api/endpoints/:endpointId/scenarios/deactivate-all', [
      ScenariosController,
      'deactivateAll',
    ]);
    router.get('/api/scenarios/:id', [ScenariosController, 'show']);
    router.put('/api/scenarios/:id', [ScenariosController, 'update']);
    router.delete('/api/scenarios/:id', [ScenariosController, 'destroy']);
    router.post('/api/scenarios/:id/activate', [ScenariosController, 'activate']);

    // Scenario rules
    router.get('/api/scenarios/:scenarioId/rules', [RulesController, 'index']);
    router.post('/api/scenarios/:scenarioId/rules', [RulesController, 'store']);
    router.put('/api/rules/:id', [RulesController, 'update']);
    router.delete('/api/rules/:id', [RulesController, 'destroy']);
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

    // Export
    router.get('/:id/export/openapi', [ExportController, 'openapi']);
    router.get('/:id/export/postman', [ExportController, 'postman']);

    // Import
    router.post('/:id/import/openapi/preview', [ImportController, 'openapiPreview']);
    router.post('/:id/import/openapi/apply', [ImportController, 'openapiApply']);
    router.post('/:id/import/postman/preview', [ImportController, 'postmanPreview']);
    router.post('/:id/import/postman/apply', [ImportController, 'postmanApply']);
  })
  .prefix('/api/projects')
  .use(middleware.auth());

/*
|--------------------------------------------------------------------------
| Company Routes
|--------------------------------------------------------------------------
*/
// Public — visibility-gated inside the controller
router.get('/api/companies/:slug', [CompaniesController, 'show']);

// Auth-required
router
  .group(() => {
    router.get('/', [CompaniesController, 'index']);
    router.post('/', [CompaniesController, 'store']);
    router.put('/:id', [CompaniesController, 'update']);
    router.post('/:id/avatar', [CompaniesController, 'uploadAvatar']);
    router.delete('/:id', [CompaniesController, 'destroy']);
    router.post('/:id/transfer-ownership', [CompaniesController, 'transferOwnership']);

    // Profiles nested under a company
    router.get('/:companyId/profiles', [ProfilesController, 'index']);

    // Teams nested under a company
    router.get('/:companyId/teams', [TeamsController, 'index']);
    router.post('/:companyId/teams', [TeamsController, 'store']);

    // Company-wide project portfolio (owner/admin)
    router.get('/:companyId/projects', [ProjectsController, 'companyProjects']);
  })
  .prefix('/api/companies')
  .use(middleware.auth());

/*
|--------------------------------------------------------------------------
| Team Routes (workspace)
|--------------------------------------------------------------------------
*/
// Public — visibility-gated inside the controller
router.get('/api/teams/:id', [TeamsController, 'show']);

// Auth-required
router
  .group(() => {
    router.put('/:id', [TeamsController, 'update']);
    router.delete('/:id', [TeamsController, 'destroy']);

    // Team memberships nested under a team
    router.get('/:teamId/members', [TeamMembershipsController, 'index']);
    router.post('/:teamId/members', [TeamMembershipsController, 'store']);
    router.patch('/:teamId/members/:profileId', [TeamMembershipsController, 'updateRole']);
    router.delete('/:teamId/members/:profileId', [TeamMembershipsController, 'destroy']);

    // Projects owned by a team
    router.get('/:teamId/projects', [ProjectsController, 'teamProjects']);
    router.post('/:teamId/projects', [ProjectsController, 'createTeamProject']);
  })
  .prefix('/api/teams')
  .use(middleware.auth());

/*
|--------------------------------------------------------------------------
| Profile Routes
|--------------------------------------------------------------------------
*/
// Auth-required — must be registered before the public `:id` route, otherwise
// `:id` captures the literal "me" and Profile.find('me') fails on a uuid column.
router.get('/api/profiles/me', [ProfilesController, 'me']).use(middleware.auth());

// Public — visibility-gated inside the controller
router.get('/api/profiles/:id', [ProfilesController, 'show']);

// Auth-required
router
  .group(() => {
    router.patch('/:id', [ProfilesController, 'update']);
    router.post('/:id/avatar', [ProfilesController, 'uploadAvatar']);
    router.patch('/:id/role', [ProfilesController, 'updateRole']);
    router.post('/:id/suspend', [ProfilesController, 'suspend']);
    router.post('/:id/reactivate', [ProfilesController, 'reactivate']);
    router.post('/:id/leave', [ProfilesController, 'leave']);
    router.delete('/:id', [ProfilesController, 'destroy']);
  })
  .prefix('/api/profiles')
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
| Platform Admin — /api/admin/* (super-admin only: master-company members)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    // reads (unscoped, paginated)
    router.get('/stats', [AdminController, 'stats']);
    router.get('/users', [AdminController, 'users']);
    router.get('/companies', [AdminController, 'companies']);
    router.get('/profiles', [AdminController, 'profiles']);
    router.get('/teams', [AdminController, 'teams']);
    router.get('/projects', [AdminController, 'projects']);
    router.get('/endpoints', [AdminController, 'endpoints']);
    router.get('/request-logs', [AdminController, 'requestLogs']);
    // company management (reuses actor-agnostic CompanyService)
    router.put('/companies/:id', [AdminController, 'updateCompany']);
    router.delete('/companies/:id', [AdminController, 'deleteCompany']);
    router.post('/companies/:id/transfer-ownership', [AdminController, 'transferOwnership']);
    // profile management (admin-bypass variants)
    router.post('/profiles/:id/suspend', [AdminController, 'suspendProfile']);
    router.post('/profiles/:id/reactivate', [AdminController, 'reactivateProfile']);
    router.patch('/profiles/:id/role', [AdminController, 'changeProfileRole']);
    router.delete('/profiles/:id', [AdminController, 'deleteProfile']);
    // impersonation
    router.post('/impersonate/:userId', [AdminController, 'impersonate']);
    // redis cache console
    router.get('/cache', [AdminCacheController, 'overview']);
    router.get('/cache/keys', [AdminCacheController, 'keys']);
    router.get('/cache/entry', [AdminCacheController, 'entry']);
    router.delete('/cache/entry', [AdminCacheController, 'deleteEntry']);
    router.delete('/cache/section/:section', [AdminCacheController, 'deleteSection']);
    router.delete('/cache', [AdminCacheController, 'flush']);
  })
  .prefix('/api/admin')
  .use([middleware.auth(), middleware.superAdmin()]);

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
