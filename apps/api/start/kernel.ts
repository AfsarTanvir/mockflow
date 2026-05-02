import router from '@adonisjs/core/services/router';
import server from '@adonisjs/core/services/server';

server.errorHandler(() => import('../app/exceptions/handler.js'));

server.use([() => import('@adonisjs/core/bodyparser_middleware')]);

router.use([() => import('@adonisjs/auth/initialize_auth_middleware')]);

export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
});
