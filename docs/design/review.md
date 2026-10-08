# Initial design review

These are initial proposals, not specifications for current code. [Architecture](../architecture.md) describes the selected implementation.

Three independent candidates ran on the inherited model. A fresh same-model reviewer compared the completed proposals before implementation. The unavailable cross-model review is an evidence limitation.

| Criterion, scored 1 to 5           | Candidate 1 | Candidate 2 | Candidate 3 |
| ---------------------------------- | ----------- | ----------- | ----------- |
| Dependencies and reader load       | 5           | 3           | 3           |
| Ports, adapters, feature ownership | 5           | 4           | 4           |
| Durability and concurrency         | 4           | 4           | 4           |
| Vue and Histoire reuse             | 5           | 4           | 4           |
| Lean implementation                | 5           | 3           | 3           |
| Total                              | 24          | 18          | 18          |

Candidate 1 is the base. It keeps application policy in a focused service and lets Vue own reactive presentation state. Candidate 3 contributed explicit disposal and update guards. Candidate 2 reinforced atomic writes, stale-read protection, and separate saved-versus-refresh outcomes. Subscription frameworks and generic storage transformations were rejected because the notes example does not need them.

The initial design called for deferred updates. Production review showed that another tab may activate the worker before the current tab consents to reload. The implementation therefore distinguishes a waiting worker from an already-active update that requires a local reload. Both routes load eagerly to keep old tabs usable after precache cleanup.

Independent code review also reproduced a browser Back/Forward cache bug. Disposal now respects the persisted page lifecycle. The browser journey asserts a real cached-page restoration before saving a new note.
