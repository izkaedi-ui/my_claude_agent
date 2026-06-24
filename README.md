# my_claude_agent

This repository is configured with a comprehensive **GitHub Copilot** setup —
the "**Beast**" agent — to help build, debug, review, and ship code optimally.

## What's configured

| File | Purpose |
|---|---|
| [`copilot.config.json`](./copilot.config.json) | Team source-of-truth describing the agent, capabilities, workflow, coding standards, and preferences. |
| [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) | Persistent instructions Copilot reads on every interaction in this repo. |
| [`.github/agents/beast.agent.md`](./.github/agents/beast.agent.md) | The **Beast** custom agent definition (name, description, tools, behavior). |
| [`copilot-setup-steps.yml`](./copilot-setup-steps.yml) | Pre-installs dependencies before agent coding sessions. |

## The Beast

**Beast** is a senior-staff-engineer persona that optimizes for **correctness
first, then clarity, then performance**. It:

- Understands the goal before changing code.
- Explores existing patterns and makes minimal, focused changes.
- Writes and runs tests, then verifies nothing broke.
- Communicates concisely, leading with the answer.

## How it works

- `copilot.config.json` is the human-readable **source of truth**. GitHub Copilot
  does not read it directly, so its contents are translated into the files
  Copilot *does* read.
- `.github/copilot-instructions.md` provides persistent context automatically.
- `.github/agents/beast.agent.md` defines a selectable custom agent.
- `copilot-setup-steps.yml` prepares the environment for agent tasks.

## Keeping it in sync

When you change standards, update **both** `copilot.config.json` and
`.github/copilot-instructions.md` so the source-of-truth and the active
instructions stay aligned.

## Next steps

This repo was bootstrapped empty. Once the real toolchain is chosen:

1. Replace the build/test/lint commands in `copilot.config.json` and
   `.github/copilot-instructions.md`.
2. Fill in real dependency steps in `copilot-setup-steps.yml`.
3. Create the `src/`, `tests/`, and `docs/` directories as code is added.
