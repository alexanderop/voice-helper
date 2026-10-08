import { describe, expect, it } from 'vitest'
import { parseCaptions } from './captions'

describe('parseCaptions', () => {
  it('strips WebVTT headers, timing, and inline tags', () => {
    const vtt = [
      'WEBVTT',
      'Kind: captions',
      'Language: en',
      '',
      '00:00:00.000 --> 00:00:02.500 align:start position:0%',
      'So <00:00:00.400><c>um</c><00:00:00.800><c> I think</c>',
      '',
      'NOTE this is a comment',
      'still the comment',
      '',
      '00:00:02.500 --> 00:01:05.250',
      'we should &amp; can go',
    ].join('\n')
    expect(parseCaptions(vtt)).toEqual({
      transcript: 'So um I think we should & can go',
      durationMs: 65_250,
    })
  })

  it('drops lines that roll over from the previous cue', () => {
    const vtt = [
      'WEBVTT',
      '',
      '00:00:01.000 --> 00:00:03.000',
      'yeah so the agent',
      '',
      '00:00:03.000 --> 00:00:03.010',
      'yeah so the agent',
      '',
      '00:00:03.010 --> 00:00:05.000',
      'yeah so the agent',
      'runs in a loop',
    ].join('\n')
    expect(parseCaptions(vtt).transcript).toBe(
      'yeah so the agent runs in a loop',
    )
  })

  it('reads SRT with cue numbers and comma milliseconds', () => {
    const srt =
      '1\r\n00:00:01,000 --> 00:00:04,000\r\nUm, hello.\r\n\r\n2\r\n01:00:04,000 --> 01:00:09,500\r\nMaybe later.\r\n'
    expect(parseCaptions(srt)).toEqual({
      transcript: 'Um, hello. Maybe later.',
      durationMs: 3_609_500,
    })
  })

  it('keeps plain text and reports no duration', () => {
    expect(parseCaptions('Yeah, I think\nit works.')).toEqual({
      transcript: 'Yeah, I think it works.',
      durationMs: null,
    })
  })
})
