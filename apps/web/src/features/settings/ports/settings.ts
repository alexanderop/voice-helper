import type { Result } from '@talk-coach/result'

export type Theme = 'system' | 'light' | 'dark'
export type AppCapabilities = {
  readonly installed: { readonly value: boolean }
  readonly canInstall: { readonly value: boolean }
  readonly offlineReady: { readonly value: boolean }
  readonly checking: { readonly value: boolean }
  readonly status: { readonly value: string }
  install(): Promise<void>
  checkForUpdates(): Promise<void>
}

export type DataCapabilities = {
  exportJson(): Promise<Result<string, 'storage-failed'>>
  clear(): Promise<Result<void, 'storage-failed'>>
}

export type DiagnosticRow = { readonly label: string; readonly value: string }
export type ReadDiagnostics = () => Promise<readonly DiagnosticRow[]>
