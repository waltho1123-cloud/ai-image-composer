export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('@/services/worker');
    const { startCleanup } = await import('@/services/cleanup');
    startWorker();
    startCleanup();
  }
}
