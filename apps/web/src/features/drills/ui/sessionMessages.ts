import type { Session, SessionError } from '../domain/session'

export const ERROR_MESSAGES: Readonly<Record<SessionError, string>> = {
  'mic-denied':
    'Microphone access is off. On iPhone, open Settings › Safari › Microphone, allow it, then try again.',
  'mic-unavailable': 'This browser has no microphone available.',
  'model-failed':
    'The speech model could not transcribe this take. Try again, or reload the app.',
  'too-short':
    'That take was too short to count. Speak for at least a few seconds.',
  'decode-failed':
    'This audio could not be read. Try an M4A, MP3, WAV, or WebM file.',
  'storage-failed': 'The result could not be saved on this device.',
}

/** One sentence per state for the polite live region. */
export function sessionMessage(session: Session): string {
  switch (session.status) {
    case 'idle':
      return ''
    case 'requesting-mic':
      return 'Asking for the microphone.'
    case 'recording':
      return 'Recording. Stop when you are done.'
    case 'processing':
      if (session.stage.step === 'decoding') return 'Preparing the audio.'
      if (session.stage.step === 'saving') return 'Saving here.'
      return `Transcribing on this device. Part ${Math.min(session.stage.chunk + 1, session.stage.chunks)} of ${session.stage.chunks}.`
    case 'done':
      return 'Saved here.'
    case 'error':
      break
  }
  return ERROR_MESSAGES[session.error]
}
