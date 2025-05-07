// app/dashboard/sessionCache.ts
export let sessionCache: any[] = [];

export function setSessionCache(sessions: any[]) {
  sessionCache = sessions;
}