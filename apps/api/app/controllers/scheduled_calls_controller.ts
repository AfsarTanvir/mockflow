import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as ScheduledCallService from '#services/scheduled_call_service';
import { createScheduledCallValidator } from '#validators/scheduled_call_validator';

export default class ScheduledCallsController {
  /** GET /api/scheduler/status — can scheduling be offered right now? Cached 10 min. */
  async schedulerStatus({ response }: HttpContext) {
    return response.ok(await ScheduledCallService.schedulerStatus());
  }

  /** GET /api/projects/:projectId/scheduled-calls — viewer+, with live scheduler state. */
  async index({ auth, params, response }: HttpContext) {
    try {
      const calls = await ScheduledCallService.listForProject(params.projectId, auth.user!.id);
      return response.ok(calls);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/projects/:projectId/scheduled-calls — member+. */
  async store({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(createScheduledCallValidator);
    try {
      const call = await ScheduledCallService.createScheduledCall(
        params.projectId,
        auth.user!.id,
        data
      );
      return response.created(call);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/scheduled-calls/:id — member+. */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      await ScheduledCallService.deleteScheduledCall(params.id, auth.user!.id);
      return response.ok({ message: 'Scheduled call deleted' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/scheduled-calls/:id/pause — member+. */
  async pause({ auth, params, response }: HttpContext) {
    try {
      return response.ok(
        await ScheduledCallService.setScheduledCallActive(params.id, auth.user!.id, false)
      );
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/scheduled-calls/:id/resume — member+. */
  async resume({ auth, params, response }: HttpContext) {
    try {
      return response.ok(
        await ScheduledCallService.setScheduledCallActive(params.id, auth.user!.id, true)
      );
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/scheduled-calls/:id/run — member+. 202: the run happens in the background. */
  async run({ auth, params, response }: HttpContext) {
    try {
      return response.accepted(
        await ScheduledCallService.runScheduledCallNow(params.id, auth.user!.id)
      );
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/scheduled-calls/:id/runs — viewer+, newest first (last 20). */
  async runs({ auth, params, response }: HttpContext) {
    try {
      return response.ok(await ScheduledCallService.listRuns(params.id, auth.user!.id));
    } catch (error) {
      return respondError(error, response);
    }
  }
}
