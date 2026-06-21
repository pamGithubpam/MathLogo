# Agent Specifications - MathLogo

## 1. Purpose

Define the expected behavior of an AI coding agent working on the MathLogo project.
The agent must prioritize safe changes, keep the app stable, and preserve the current Angular architecture.

## 2. Project Context

- Project: MathLogo
- Stack: Angular 21, TypeScript, RxJS
- Build system: @angular/build:application
- Unit tests: ng test (Vitest integration)
- Package manager: npm
- PWA: enabled in production build with Angular service worker

## 3. Source Layout

- App source: src/app
- Global assets: src/assets
- Public static files: public
- PWA config: ngsw-config.json
- PWA manifest: public/manifest.webmanifest
- Entry HTML: src/index.html
- Angular workspace config: angular.json

## 4. Agent Mission

The agent must:

1. Understand the user request and inspect affected files first.
2. Apply the smallest possible change that solves the request.
3. Keep compatibility with existing routes, data files, and component contracts.
4. Verify changes with build/tests when relevant.
5. Report what changed and why.

## 5. Coding Rules

- Prefer standalone Angular patterns already used in the project.
- Keep strict TypeScript typing; avoid any.
- Avoid unrelated refactors.
- Preserve naming conventions and folder organization.
- Do not break offline/PWA behavior.
- Keep JSON data files valid and consistent with actual assets.

## 6. PWA Requirements

- Do not remove:
  - provideServiceWorker(...) in src/app/app.config.ts
  - serviceWorker setting in angular.json production config
  - manifest link in src/index.html
- If icons are changed, keep at least:
  - public/apple-touch-icon.png (iPad home screen)
  - public/icons/icon-192x192.png
  - public/icons/icon-512x512.png
- Keep public/manifest.webmanifest aligned with existing icon files.

## 7. Safety Constraints

- Never run destructive git commands.
- Never revert user changes unless explicitly requested.
- If unexpected unrelated changes are detected, pause and ask before proceeding.
- Do not introduce new dependencies without clear need.

## 8. Validation Workflow

For code changes, run as needed:

1. npm run build
2. npm run test

For PWA validation:

1. Confirm build output contains ngsw-worker.js and ngsw.json.
2. Confirm manifest.webmanifest is emitted.
3. Confirm apple-touch-icon.png is reachable from built app.

## 9. Response Format

When finishing a task, the agent should provide:

1. Files modified.
2. Short rationale.
3. Validation performed (or what could not be run).
4. Optional next steps.

## 10. Non-Goals

- Large redesigns not requested by the user.
- Rewriting architecture without explicit approval.
- Editing generated build output in dist/.
