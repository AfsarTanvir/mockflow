import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as ProjectService from '#services/project_service';
import { createProjectValidator, updateProjectValidator } from '#validators/project_validator';

export default class ProjectsController {
  /** GET /api/projects — projects the current user can see. */
  async index({ auth, response }: HttpContext) {
    const projects = await ProjectService.listForUser(auth.user!.id);
    return response.ok(projects);
  }

  /** POST /api/projects */
  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createProjectValidator);
    const project = await ProjectService.createProject(auth.user!.id, data);
    return response.created(project);
  }

  /** GET /api/teams/:teamId/projects — team members or company owner/admin. */
  async teamProjects({ auth, params, response }: HttpContext) {
    try {
      return response.ok(await ProjectService.listTeamProjects(auth.user!.id, params.teamId));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/teams/:teamId/projects — company owner/admin or team admin. */
  async createTeamProject({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(createProjectValidator);
    try {
      const project = await ProjectService.createTeamProject(auth.user!.id, params.teamId, data);
      return response.created(project);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/companies/:companyId/projects — company owner/admin (portfolio). */
  async companyProjects({ auth, params, response }: HttpContext) {
    try {
      return response.ok(await ProjectService.listCompanyProjects(auth.user!.id, params.companyId));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/projects/:id — any team member (viewer+). */
  async show({ auth, params, response }: HttpContext) {
    try {
      const project = await ProjectService.getForUser(params.id, auth.user!.id);
      return response.ok(project);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** PUT /api/projects/:id — admin and owner. */
  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateProjectValidator);
    try {
      const project = await ProjectService.updateProject(params.id, auth.user!.id, data);
      return response.ok(project);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/projects/:id — owner only. */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      await ProjectService.deleteProject(params.id, auth.user!.id);
      return response.ok({ message: 'Project deleted' });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
