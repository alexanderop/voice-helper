import { Result } from '@talk-coach/result'
import { SPEECH_SAMPLE_RATE, type AudioDecoder } from '../../features/drills'

/** Decodes any browser-supported audio and renders it to 16 kHz mono. */
export function createAudioDecoder(): AudioDecoder {
  return {
    async decode(audio) {
      try {
        const decoded = await new OfflineAudioContext(
          1,
          1,
          SPEECH_SAMPLE_RATE,
        ).decodeAudioData(await audio.arrayBuffer())
        const length = Math.ceil(decoded.duration * SPEECH_SAMPLE_RATE)
        if (length === 0) return Result.ok(new Float32Array())
        const context = new OfflineAudioContext(1, length, SPEECH_SAMPLE_RATE)
        const source = context.createBufferSource()
        source.buffer = decoded
        source.connect(context.destination)
        source.start()
        const rendered = await context.startRendering()
        return Result.ok(rendered.getChannelData(0))
      } catch {
        return Result.err('decode-failed')
      }
    },
  }
}
