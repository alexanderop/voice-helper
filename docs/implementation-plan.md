# Implementation plan

- [x] Read the Principles section of the poteto-mode skill.
- [x] Phase A: Frame
- [x] Phase B: Design the workflow
- [x] Phase C: Run the loop
- [x] Ground. Skip existing-system exploration because this is a greenfield repository.
- [x] Sketch
- [x] Agree
- [x] Implement
- [x] Scrap. Not needed; fixes retained the selected feature-service design.
- [x] Frame
- [x] Fan out
- [x] Cross-judge
- [x] Pick
- [x] Graft
- [x] Verify
- [x] Verify compatible dependencies and build the workspace checks.
- [x] Build UI components and Histoire, then inspect the component workshop.
- [x] Implement notes, native IndexedDB, and the PWA lifecycle.
- [x] Run tests, production browser journeys, and independent review.
- [x] Publish the public GitHub repository and check CI. Public template repository and GitHub Pages deployment verified.
- [x] Phase D: Keep the audit trail
- [x] Phase E: Verify and hand back. Local checks, remote CI, and live Pages mobile/offline verification passed.

## Done predicate

A fresh install builds both the PWA and Histoire. Strict types, lint, architecture checks, unit tests, browser tests, and production Playwright journeys pass. Users can create, edit, search, pin, delete, and reopen notes offline. Updates are offered with a defer action. The UI package works independently of the app. The public GitHub repository contains the source and reproduction commands with passing CI.

## Throughput checkpoint

- Blocking first steps. Resolve compatible Histoire/Vite versions and agree on public contracts before implementation.
- Independent workstreams. UI library and domain/storage code have separate owners after design. App wiring follows their contracts.
- Shared mutable state. Parent owns root manifests, lockfile, audit log, integration, and git operations. Workers own disjoint directories.
- Smallest safe decomposition. Three implementation slices cover UI, notes/storage, and integration/verification. No backend or generic repository framework.

## Workflow mechanics

Use local agents with inherited model because no project model configuration exists. Independent same-model review cannot provide cross-model diversity. The external cursor-team-kit deslop/control-ui tools are unavailable; use direct diff cleanup and the available Chrome/Playwright browser tools. New-repository publication is explicitly authorized. The user additionally authorized GitHub Pages deployment for phone testing. A transcript file for this new run is not supplied, so audit against current tool evidence and committed artifacts.

## Delivery choice

The user requested a new public repository. This run publishes the initial implementation on main. An existing-base pull request and worktree rebase do not apply to an empty repository. GitHub Pages deploys the verified main branch.
