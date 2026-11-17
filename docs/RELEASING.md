# Commit-based releases

`npm ci` installs Husky hooks: pre-commit runs ESLint through lint-staged, commit-msg validates Conventional Commits, and pre-push runs type checking and unit tests. CI repeats checks, production audit, bundle budget, and desktop/mobile E2E tests. Hooks are convenience checks; CI is authoritative.

Use `fix(scope): description` for a patch, `feat(scope): description` for a minor, and a `BREAKING CHANGE:` footer or `!` for a major. Docs, tests, and chores do not create a release by themselves. Do not use `npm version` or generate timestamp versions.

After successful checks on `main`, semantic-release analyzes commits since the last release, creates a `vX.Y.Z` tag, and publishes GitHub release notes. It does not publish an npm package or create generated version-bump commits. Git tags are the release version source; this private application's package.json version is metadata. No release is performed merely by installing this configuration.

The repository must use `main` as its release branch, allow the workflow's GITHUB_TOKEN to create releases, and require the quality job for merges. If the default branch differs, update both release.config.mjs and the workflow. Protect release tags and use squash titles that follow Conventional Commits.
