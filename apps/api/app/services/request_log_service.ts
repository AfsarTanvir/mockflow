import * as AccessService from '#services/access_service';
import * as RequestLogQueries from '#queries/request_log_queries';

const MAX_LOGS = 100;

/** Latest request logs for a project. Any team member (viewer+). */
export async function listForProject(projectId: string, userId: string) {
  await AccessService.assertProjectAccess(projectId, userId, 'viewer');
  return RequestLogQueries.listForProject(projectId, MAX_LOGS);
}
