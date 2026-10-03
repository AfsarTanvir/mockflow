import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import Endpoint from '#models/endpoint';
import EndpointScenario from '#models/endpoint_scenario';
import ScenarioRule from '#models/scenario_rule';
import type Project from '#models/project';
import VersionHistory, { type VersionSnapshot } from '#models/version_history';
import * as AccessService from '#services/access_service';
import * as cache from '#services/cache_service';
import * as EndpointQueries from '#queries/endpoint_queries';
import * as ScenarioQueries from '#queries/scenario_queries';
import * as VersionQueries from '#queries/version_queries';
import { cursorPage, resolveKeyset, type CursorInput } from '#queries/pagination';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/**
 * Capture a project's full mock state: settings + every endpoint (active or
 * not) with its random delay, scenarios and their rules. Pass `client` to read
 * inside a transaction (the pre-restore backup does).
 */
async function buildSnapshot(
  project: Project,
  client?: TransactionClientContract
): Promise<VersionSnapshot> {
  const endpoints = await EndpointQueries.listForProject(project.id, client);
  const scenarios = endpoints.length
    ? await ScenarioQueries.listForEndpointsWithRules(
        endpoints.map((e) => e.id),
        client
      )
    : [];

  const byEndpoint = new Map<string, EndpointScenario[]>();
  for (const sc of scenarios) {
    byEndpoint.set(sc.endpointId, [...(byEndpoint.get(sc.endpointId) ?? []), sc]);
  }

  return {
    format: 2,
    project: {
      name: project.name,
      slug: project.slug,
      basePath: project.basePath,
      isPublic: project.isPublic,
      settings: project.settings,
    },
    endpoints: endpoints.map((e) => ({
      method: e.method,
      path: e.path,
      statusCode: e.statusCode,
      responseBody: e.responseBody,
      responseHeaders: e.responseHeaders,
      delayMs: e.delayMs,
      delayMaxMs: e.delayMaxMs,
      isActive: e.isActive,
      scenarios: (byEndpoint.get(e.id) ?? []).map((sc) => ({
        name: sc.name,
        description: sc.description,
        statusCode: sc.statusCode,
        responseBody: sc.responseBody,
        responseHeaders: sc.responseHeaders,
        delayMs: sc.delayMs,
        delayMaxMs: sc.delayMaxMs,
        isActive: sc.isActive,
        priority: sc.priority,
        rules: (sc.rules ?? []).map((r) => ({
          source: r.source,
          field: r.field,
          operator: r.operator,
          value: r.value,
        })),
      })),
    })),
  };
}

const countScenarios = (snapshot: VersionSnapshot) =>
  snapshot.endpoints.reduce((n, e) => n + (e.scenarios?.length ?? 0), 0);

/**
 * One page of version history as lightweight summaries, newest first. Viewer+.
 *
 * Keyset-paginated: snapshots are append-only, so a cursor page can never drift
 * as new ones land, and history is unbounded rather than the former hard 50.
 */
export async function listForProject(projectId: string, userId: string, input: CursorInput) {
  await AccessService.assertProjectAccess(projectId, userId, 'viewer');

  const keyset = resolveKeyset(input);
  const versions = await VersionQueries.listForProject(projectId, keyset);
  return cursorPage(versions, keyset, (v) => ({
    id: v.id,
    message: v.message,
    createdAt: v.createdAt,
    createdBy: v.author ? { id: v.author.id, name: v.author.name } : null,
    // Counted in SQL — the list query does not select the snapshot blob.
    endpointCount: Number(v.$extras[VersionQueries.ENDPOINT_COUNT_COLUMN] ?? 0),
  }));
}

/**
 * Snapshot the current project + endpoints as a new version. Owner/admin only.
 *
 * `authorName` comes from the controller (same pattern as the invite flow) so the
 * response can carry a complete `createdBy` — the dashboard prepends this object
 * straight into the cached first page, and a half-filled row would render
 * without its author until the next refetch.
 */
export async function createVersion(
  projectId: string,
  userId: string,
  authorName: string,
  message: string | null
) {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');

  const snapshot = await buildSnapshot(project);

  const version = await VersionHistory.create({
    projectId: project.id,
    snapshot,
    message,
    createdBy: userId,
  });

  return {
    id: version.id,
    message: version.message,
    createdAt: version.createdAt,
    createdBy: { id: userId, name: authorName },
    endpointCount: snapshot.endpoints.length,
  };
}

/** A single version with its full snapshot. Viewer+. */
export async function getVersion(projectId: string, userId: string, versionId: string) {
  await AccessService.assertProjectAccess(projectId, userId, 'viewer');

  const version = await VersionQueries.findForProject(projectId, versionId);
  if (!version) {
    throw new Exception('Version not found', { status: 404, code: 'E_VERSION_NOT_FOUND' });
  }

  return {
    id: version.id,
    message: version.message,
    createdAt: version.createdAt,
    createdBy: version.author ? { id: version.author.id, name: version.author.name } : null,
    snapshot: version.snapshot,
  };
}

/**
 * Restore a snapshot, atomically. Owner/admin only.
 *
 * In the same transaction, the project's CURRENT state is first saved as a new
 * "Auto-saved before restore" version, so a restore can always be undone — even
 * when restoring an older snapshot that predates scenario capture (format < 2),
 * which brings back endpoints without scenarios.
 */
export async function restoreVersion(projectId: string, userId: string, versionId: string) {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');

  const version = await VersionQueries.findForProject(projectId, versionId);
  if (!version) {
    throw new Exception('Version not found', { status: 404, code: 'E_VERSION_NOT_FOUND' });
  }

  const { snapshot } = version;
  const label = version.message ? `"${version.message}"` : version.createdAt.toISO();

  const backup = await db.transaction(async (trx) => {
    // 1. Back up what is about to be overwritten.
    project.useTransaction(trx);
    const current = await buildSnapshot(project, trx);
    const backupVersion = await VersionHistory.create(
      {
        projectId: project.id,
        snapshot: current,
        message: `Auto-saved before restoring ${label}`.slice(0, 500),
        createdBy: userId,
      },
      { client: trx }
    );

    // 2. Project fields.
    project.name = snapshot.project.name;
    project.basePath = snapshot.project.basePath;
    project.isPublic = snapshot.project.isPublic;
    project.settings = snapshot.project.settings;
    await project.save();

    // 3. Replace endpoints (cascades their scenarios + rules), then recreate
    //    endpoints → scenarios → rules from the snapshot.
    await EndpointQueries.deleteForProject(project.id, trx);

    for (const ep of snapshot.endpoints) {
      const endpoint = await Endpoint.create(
        {
          projectId: project.id,
          method: ep.method,
          path: ep.path,
          statusCode: ep.statusCode,
          responseBody: ep.responseBody,
          responseHeaders: ep.responseHeaders,
          delayMs: ep.delayMs,
          delayMaxMs: ep.delayMaxMs ?? null,
          isActive: ep.isActive,
          createdBy: userId,
        },
        { client: trx }
      );

      for (const sc of ep.scenarios ?? []) {
        const scenario = await EndpointScenario.create(
          {
            endpointId: endpoint.id,
            name: sc.name,
            description: sc.description,
            statusCode: sc.statusCode,
            responseBody: sc.responseBody,
            responseHeaders: sc.responseHeaders,
            delayMs: sc.delayMs,
            delayMaxMs: sc.delayMaxMs,
            isActive: sc.isActive,
            priority: sc.priority,
          },
          { client: trx }
        );
        if (sc.rules.length) {
          await ScenarioRule.createMany(
            sc.rules.map((r) => ({ scenarioId: scenario.id, ...r })),
            { client: trx }
          );
        }
      }
    }

    return backupVersion;
  });

  // Restore rewrites settings + all endpoints → rebuild the mock blueprint.
  await cache.invalidateMock(project.id);

  return {
    message: 'Project restored to selected version',
    versionId: version.id,
    endpointCount: snapshot.endpoints.length,
    scenarioCount: countScenarios(snapshot),
    backupVersionId: backup.id,
  };
}
