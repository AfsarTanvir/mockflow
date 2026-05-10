import type { HttpContext } from '@adonisjs/core/http';
import Project from '../models/project.js';
import RequestLog from '../models/request_log.js';
import TeamMember from '../models/team_member.js';

export default class RequestLogsController {
  async index({ auth, params, response }: HttpContext) {
    const project = await Project.find(params.projectId);
    if (!project) return response.notFound({ message: 'Project not found' });

    const userId = auth.user!.id;
    const isOwner = project.ownerId === userId;
    if (!isOwner) {
      const member = await TeamMember.query()
        .where('project_id', project.id)
        .where('user_id', userId)
        .first();
      if (!member) return response.forbidden({ message: 'Access denied' });
    }

    const logs = await RequestLog.query()
      .where('project_id', project.id)
      .orderBy('created_at', 'desc')
      .limit(100);

    return response.ok(logs);
  }
}
