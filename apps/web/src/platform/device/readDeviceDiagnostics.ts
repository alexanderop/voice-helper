export type DeviceDiagnostics = {
  readonly crossOriginIsolated: boolean
  readonly webGpu: boolean
  readonly deviceMemoryGb: number | null
  readonly jsHeapMb: number | null
  readonly storageUsageMb: number | null
  readonly storageQuotaMb: number | null
  readonly persisted: boolean | null
  readonly microphone: PermissionState | 'unknown'
  readonly userAgent: string
}

const megabytes = (bytes: number | undefined) =>
  bytes === undefined ? null : Math.round(bytes / 1_048_576)

function numberField(source: object, key: string): number | undefined {
  const value: unknown = Reflect.get(source, key)
  return typeof value === 'number' ? value : undefined
}

async function microphonePermission(): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({
      name: 'microphone',
    })
    return status.state
  } catch {
    return 'unknown'
  }
}

/** Every probe tolerates a missing API; Safari lacks several of them. */
export async function readDeviceDiagnostics(): Promise<DeviceDiagnostics> {
  const memory: unknown = Reflect.get(performance, 'memory')
  const estimate = await Promise.resolve()
    .then(() => navigator.storage.estimate())
    .catch(() => undefined)
  const persisted = await Promise.resolve()
    .then(() => navigator.storage.persisted())
    .catch(() => null)
  return {
    crossOriginIsolated: self.crossOriginIsolated,
    webGpu: 'gpu' in navigator,
    deviceMemoryGb: numberField(navigator, 'deviceMemory') ?? null,
    jsHeapMb:
      memory && typeof memory === 'object'
        ? megabytes(numberField(memory, 'usedJSHeapSize'))
        : null,
    storageUsageMb: megabytes(estimate?.usage),
    storageQuotaMb: megabytes(estimate?.quota),
    persisted,
    microphone: await microphonePermission(),
    userAgent: navigator.userAgent,
  }
}

/** Asks the browser to keep the 77 MB model; Safari may still evict it. */
export function requestPersistentStorage() {
  try {
    void navigator.storage.persist().catch(() => false)
  } catch {
    // Browsers without the Storage API keep the default eviction policy.
  }
}
