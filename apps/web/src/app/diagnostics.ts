import type { DiagnosticRow } from '../features/settings'
import type { ModelStatus, SpeechDiagnostics } from '../features/speech'
import type { DeviceDiagnostics } from '../platform/device/readDeviceDiagnostics'

const yesNo = (value: boolean) => (value ? 'yes' : 'no')
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`
const megabytes = (value: number | null) =>
  value === null ? 'not reported by this browser' : `${value} MB`

function modelLabel(status: ModelStatus): string {
  switch (status.status) {
    case 'checking':
      return 'checking'
    case 'missing':
      return 'not downloaded'
    case 'downloading':
      return `downloading, ${Math.round(status.loadedBytes / 1_000_000)} of ${Math.round(status.totalBytes / 1_000_000)} MB`
    case 'loading':
      return 'loading'
    case 'ready':
      return status.offline
        ? 'ready, verified offline'
        : 'ready, offline copy not verified'
    case 'failed':
      break
  }
  return `failed: ${status.reason}`
}

function transcriptionRow(speech: SpeechDiagnostics): string {
  const last = speech.lastTranscription
  if (!last) return 'none yet. Record or import once.'
  const factor = last.audioMs ? (last.ms / last.audioMs).toFixed(2) : '–'
  return `${seconds(last.ms)} for ${seconds(last.audioMs)} of audio (${factor}× real time)`
}

/** Plain rows for the Settings panel and for pasting into a bug report. */
export function diagnosticRows({
  model,
  speech,
  device,
  version,
}: {
  model: ModelStatus
  speech: SpeechDiagnostics
  device: DeviceDiagnostics
  version: string
}): DiagnosticRow[] {
  return [
    { label: 'Speech model', value: modelLabel(model) },
    {
      label: 'Backend',
      value: `${speech.backend ?? 'not loaded'} (WebGPU in browser: ${yesNo(device.webGpu)})`,
    },
    {
      label: 'Cross-origin isolated',
      value: `${yesNo(device.crossOriginIsolated)} (no means one WASM thread)`,
    },
    {
      label: 'Model load time',
      value: speech.loadMs === null ? 'not loaded' : seconds(speech.loadMs),
    },
    { label: 'Last transcription', value: transcriptionRow(speech) },
    { label: 'JS heap in use', value: megabytes(device.jsHeapMb) },
    {
      label: 'Device memory',
      value:
        device.deviceMemoryGb === null
          ? 'not reported by this browser'
          : `${device.deviceMemoryGb} GB`,
    },
    {
      label: 'Storage',
      value: `${megabytes(device.storageUsageMb)} used of ${megabytes(device.storageQuotaMb)}`,
    },
    {
      label: 'Persistent storage',
      value: device.persisted === null ? 'unknown' : yesNo(device.persisted),
    },
    { label: 'Microphone permission', value: device.microphone },
    { label: 'App version', value: version },
    { label: 'Browser', value: device.userAgent },
  ]
}
