import { Result } from '@talk-coach/result'

export type MicrophoneError = 'mic-denied' | 'mic-unavailable'
export type Recording = {
  stop(): Promise<Blob>
  cancel(): void
}

const TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']

export function createMicrophone({
  mediaDevices,
}: {
  mediaDevices: MediaDevices | undefined
}) {
  return {
    async start(): Promise<Result<Recording, MicrophoneError>> {
      if (!mediaDevices || typeof MediaRecorder === 'undefined')
        return Result.err('mic-unavailable')
      let stream: MediaStream
      try {
        stream = await mediaDevices.getUserMedia({ audio: true })
      } catch (error) {
        const denied =
          error instanceof DOMException &&
          ['NotAllowedError', 'SecurityError'].includes(error.name)
        return Result.err(denied ? 'mic-denied' : 'mic-unavailable')
      }
      const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      const parts: Blob[] = []
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size) parts.push(event.data)
      })
      const release = () => stream.getTracks().forEach((track) => track.stop())
      recorder.start()
      return Result.ok({
        stop: () =>
          new Promise<Blob>((resolve) => {
            recorder.addEventListener('stop', () => {
              release()
              resolve(new Blob(parts, { type: recorder.mimeType }))
            })
            recorder.stop()
          }),
        cancel() {
          if (recorder.state !== 'inactive') recorder.stop()
          release()
        },
      })
    },
  }
}
