export type ParsedCaptions = {
  readonly transcript: string
  readonly durationMs: number | null
}

const TIMING =
  /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})/

const number = (digits: string | undefined) => (digits ? Number(digits) : 0)

function endMs(match: RegExpMatchArray): number {
  const [hours, minutes, seconds, millis] = [
    match[5],
    match[6],
    match[7],
    match[8],
  ].map(number)
  return (
    (((hours ?? 0) * 60 + (minutes ?? 0)) * 60 + (seconds ?? 0)) * 1000 +
    (millis ?? 0)
  )
}

const isHeader = (line: string) =>
  /^(WEBVTT|NOTE|STYLE|REGION|Kind:|Language:)/.test(line)
const isCueNumber = (line: string) => /^\d+$/.test(line)

/**
 * Turns WebVTT, SRT, or plain text into one transcript. Timing lines, cue
 * numbers, headers, and inline tags are removed. Auto-generated captions roll
 * each line into the next cue, so a line equal to the previous one is dropped.
 */
export function parseCaptions(text: string): ParsedCaptions {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const spoken: string[] = []
  let durationMs: number | null = null
  let skipBlock = false
  for (const raw of lines) {
    const line = raw.trim()
    const timing = line.match(TIMING)
    if (timing) {
      durationMs = Math.max(durationMs ?? 0, endMs(timing))
      skipBlock = false
      continue
    }
    if (!line) {
      skipBlock = false
      continue
    }
    if (isHeader(line)) skipBlock = true
    if (skipBlock || isCueNumber(line)) continue
    const clean = line
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (clean && clean !== spoken.at(-1)) spoken.push(clean)
  }
  return { transcript: spoken.join(' '), durationMs }
}
