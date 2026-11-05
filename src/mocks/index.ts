export async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return;
  const { worker } = await import('./browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
