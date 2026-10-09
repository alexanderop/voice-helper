# Whistle vs Whisper: filler-word test

Date: 2026-10-09. Question: can [Whistle](https://cactuscompute.com/blog/whistle) (Cactus Compute, 17 MB, Apache-2.0) replace `onnx-community/whisper-base.en` q8 without losing the fillers Talk Coach counts?

## Setup

- Five clips made with macOS `say`, converted to 16 kHz mono WAV with ffmpeg.
- Whistle: `cactus-needle` Python package, `needle.transcribe(path, language="en")`, once plain and once with `keywords=["um", "uh"]`.
- Whisper: transformers.js 3.8.1 in Node, the same `generate` call as `apps/web/src/features/speech/adapters/whisper.worker.ts` (`FILLER_PROMPT` prefix, `max_new_tokens: 220`, `no_repeat_ngram_size: 5`), plus a run without the prompt.
- A hit is any filler in the `um` group of `features/drills/domain/lexicon.ts` (um, uh, er, ah, hmm).

## Score

| Setup                                 | Fillers caught | Problems                           |
| ------------------------------------- | -------------- | ---------------------------------- |
| Whisper + filler prompt (current app) | **16 / 17**    | none                               |
| Whisper, no prompt                    | 15 / 17        | none                               |
| Whistle, plain                        | 13 / 17        | dropped 2 of 3 fillers in c2       |
| Whistle, keyword bias                 | 15 / 17        | truncated c1, added a filler in c2 |

## Per clip

| Clip | Voice    | Spoken text                                                                        | Fillers |
| ---- | -------- | ---------------------------------------------------------------------------------- | ------- |
| c1   | Samantha | So, um, I think we, uh, should go. Um, yeah, and, uh, that's why, um, it works.    | 5       |
| c2   | Daniel   | Um, the main thing, uh, I wanted to say is that, um, our team shipped the release. | 3       |
| c3   | Karen    | Uh, so basically, um, we tried a few things and, uh, none of them worked.          | 3       |
| c4   | Samantha | Okay, so, um, let me just, uh, share my screen. Um, can everyone see it?           | 3       |
| c5   | Fred     | Hmm, I mean, uh, like, you know, it's um kind of hard to explain.                  | 3       |

Fillers caught per clip:

| Clip | Whisper + prompt | Whisper plain | Whistle plain | Whistle bias   |
| ---- | ---------------- | ------------- | ------------- | -------------- |
| c1   | 5                | 5             | 5             | 4 (truncated)  |
| c2   | 3                | 3             | 1             | 4 (1 invented) |
| c3   | 3                | 3             | 3             | 3              |
| c4   | 3                | 3             | 3             | 3              |
| c5   | 2                | 1             | 1             | 1              |

## Transcripts

Whisper + prompt:

- c1: So, um, i think we, uh should go. Um yeah, and, ah, that's why. Um, it works.
- c2: Um, the main thing, uh, I wanted to say is that, um, our team ship the release.
- c3: Ah, so basically, um, we tried a few things and, uh, none of them worked.
- c4: Okay, so, um, let me just, uh, share my screen, um, can everyone see it?
- c5: Um, I mean, uh, like, you know, it's some kind of hard to explain.

Whisper, no prompt:

- c1: So, um, I think we, uh, should go, um, yeah, and, uh, that's why, um, it works.
- c2: Um, the main thing, uh, I wanted to say is that, um, our team ship the release.
- c3: "Ah, so basically, um, we tried a few things in. Ah, none of them worked."
- c4: Okay, so, um, let me just, uh, share my screen, um, can everyone see it?
- c5: I mean, uh, like, you know, it's some kind of hard to explain.

Whistle, plain:

- c1: So, um, I think we, ah, should go, um, yeah, and, ah, that's why, um, it works.
- c2: The main thing. I wanted to say as that. Um. Our team ship the release.
- c3: Ah, so basically, um, we tried a few things in, uh, none of them worked.
- c4: Okay, so, um, let me just, ah, share my screen, um, can everyone see it?
- c5: I mean, ah, like, you know, it's some kind of hard to explain.

Whistle, `keywords=["um", "uh"]`:

- c1: So, um, I think we, uh, should go, um, uh
- c2: Um, the main thing, uh, I wanted to say as that, uh, uh, our team ship the release.
- c3: uh so basically um we tried a few things in uh none of them worked
- c4: okay so um let me just uh share my screen um can every one see it
- c5: I mean, uh, like, you know, it's some kind of hard to explain.

## Conclusion

Whistle keeps fillers, but it caught fewer than the current setup, and keyword biasing made transcripts unreliable. Keep Whisper for now.

Limits: synthetic speech is cleaner than real hesitation, five clips is a small sample, and browser speed was not measured. Next step: repeat with a real recording.
