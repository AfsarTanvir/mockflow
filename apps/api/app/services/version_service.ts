import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import Endpoint from '#models/endpoint';
import VersionHistory from '#models/version_history';
import * as AccessService from '#services/access_service';
import * as cache from '#services/cache_service';
import * as EndpointQueries from '#queries/endpoint_queries';
import * as VersionQueries from '#queries/version_queries';
import { cursorPage, resolveKeyset, type CursorInput } from '#queries/pagination';

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

  const endpoints = await EndpointQueries.listForProject(project.id);

  const snapshot = {
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
      isActive: e.isActive,
    })),
  };

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

/** Replace the project's current endpoints with a snapshot, atomically. Owner/admin only. */
export async function restoreVersion(projectId: string, userId: string, versionId: string) {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');

  const version = await VersionQueries.findForProject(projectId, versionId);
  if (!version) {
    throw new Exception('Version not found', { status: 404, code: 'E_VERSION_NOT_FOUND' });
  }

  const { snapshot } = version;

  await db.transaction(async (trx) => {
    project.useTransaction(trx);
    project.name = snapshot.project.name;
    project.basePath = snapshot.project.basePath;
    project.isPublic = snapshot.project.isPublic;
    project.settings = snapshot.project.settings;
    await project.save();

    await EndpointQueries.deleteForProject(project.id, trx);

    for (const ep of snapshot.endpoints) {
      await Endpoint.create(
        {
          projectId: project.id,
          method: ep.method,
          path: ep.path,
          statusCode: ep.statusCode,
          responseBody: ep.responseBody,
          responseHeaders: ep.responseHeaders,
          delayMs: ep.delayMs,
          isActive: ep.isActive,
          createdBy: userId,
        },
        { client: trx }
      );
    }
  });

  // Restore rewrites settings + all endpoints → rebuild the mock blueprint.
  await cache.invalidateMock(project.id);

  return {
    message: 'Project restored to selected version',
    versionId: version.id,
    endpointCount: snapshot.endpoints.length,
  };
}
