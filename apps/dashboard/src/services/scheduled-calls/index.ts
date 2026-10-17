import httpClient from '@/http-client';
import type { ScheduledCall, ScheduledCallInput, ScheduledCallRun, SchedulerStatus } from '@/types';

export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  const { data } = await httpClient.get<SchedulerStatus>('/api/scheduler/status');
  return data;
}

export async function getScheduledCalls(projectId: string): Promise<ScheduledCall[]> {
  const { data } = await httpClient.get<ScheduledCall[]>(
    `/api/projects/${projectId}/scheduled-calls`
  );
  return data;
}

export async function createScheduledCall(
  projectId: string,
  body: ScheduledCallInput
): Promise<ScheduledCall> {
  const { data } = await httpClient.post<ScheduledCall>(
    `/api/projects/${projectId}/scheduled-calls`,
    body
  );
  return data;
}

export async function deleteScheduledCall(id: string): Promise<void> {
  await httpClient.delete(`/api/scheduled-calls/${id}`);
}

export async function pauseScheduledCall(id: string): Promise<ScheduledCall> {
  const { data } = await httpClient.post<ScheduledCall>(`/api/scheduled-calls/${id}/pause`, {});
  return data;
}

export async function resumeScheduledCall(id: string): Promise<ScheduledCall> {
  const { data } = await httpClient.post<ScheduledCall>(`/api/scheduled-calls/${id}/resume`, {});
  return data;
}

export async function runScheduledCall(id: string): Promise<ScheduledCall> {
  const { data } = await httpClient.post<ScheduledCall>(`/api/scheduled-calls/${id}/run`, {});
  return data;
}

export async function getScheduledCallRuns(id: string): Promise<ScheduledCallRun[]> {
  const { data } = await httpClient.get<ScheduledCallRun[]>(`/api/scheduled-calls/${id}/runs`);
  return data;
}
