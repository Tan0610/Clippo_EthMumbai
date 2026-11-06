# Project rules for Claude

## 1. Keep the build log up to date

Everything we do in this project is recorded in `docs/BUILD_LOG.md` so the owner can track it and go back to any step.

After every batch of work, in the same commit:

1. Add a new entry at the top of "Log" with: what changed, why, the files, test results, and what is not proven.
2. Put the commit hash of earlier entries in their headings. The newest entry says "pending commit" until the next update fills in its hash.
3. Update "Decisions" when the owner decides something, "Waiting on you" and "Coming next" when they change, and "Known gaps".
4. Record real transaction hashes and addresses once something is deployed.
5. Never write that something works unless it was run. Mark anything else as not proven.

Also update the file when work is undone or replaced, so the log never describes something that no longer exists.

## 2. Short, simple replies

Every reply to the owner is short, concise and in simple language.

## 3. Git

Commit in small steps and push to `feat/core-sponsor-integration`. Do not push to `main` unless the owner asks. Never rewrite history. Never commit secrets.
