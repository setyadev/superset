---
description: Generate a .superset/config.json with setup and teardown scripts for a project
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

Help the user create a `.superset/config.json` file for their project so that workspaces automatically run setup and teardown commands.

## Context

Superset runs setup commands when creating a workspace and teardown commands when deleting one. The config lives at `.superset/config.json` in the project root.

**Available environment variables in scripts:**

| Variable | Description |
|---|---|
| `SUPERSET_ROOT_PATH` | Path to the root repository |
| `SUPERSET_WORKSPACE_NAME` | Current workspace name |

## Steps

1. **Detect the project type.** Look at the repo root for signals:
   - `package.json` → Node.js project (check for `bun.lockb`, `yarn.lock`, `pnpm-lock.yaml`, or `package-lock.json` to determine the package manager)
   - `Cargo.toml` → Rust project
   - `go.mod` → Go project
   - `requirements.txt` / `pyproject.toml` / `Pipfile` → Python project
   - `Gemfile` → Ruby project
   - `docker-compose.yml` / `docker-compose.yaml` → Docker project
   - `Makefile` → Check for common targets (`install`, `setup`, `build`)
   - `.env` or `.env.example` → Environment file that may need copying
   - Check for multiple signals — projects often combine them (e.g., Node.js + Docker)

2. **Check for an existing config.** If `.superset/config.json` already exists, show the user the current config and ask if they want to replace or update it. If they want to keep it, stop.

3. **Ask the user what they need.** Present your detected project type and propose a setup/teardown configuration. Use AskUserQuestion to let them choose. For example:
   - Which package manager to use for install
   - Whether they need to copy `.env` from root (`cp "$SUPERSET_ROOT_PATH/.env" .env`)
   - Whether they have Docker services to start/stop
   - Whether they need database migrations
   - Whether they want to use a shell script for complex logic

4. **Generate the config.** Write `.superset/config.json` with the agreed-upon commands.

5. **Optionally generate helper scripts.** If the setup or teardown logic is complex (3+ commands or conditional logic), suggest creating `.superset/setup.sh` and/or `.superset/teardown.sh` shell scripts instead of inline commands. If the user agrees, create the scripts and reference them from the config:
   ```json
   {
     "setup": ["./.superset/setup.sh"],
     "teardown": ["./.superset/teardown.sh"]
   }
   ```
   Make sure to set the scripts as executable with `chmod +x`.

6. **Show the final result.** Print the generated config and any scripts for the user to review.

## Tips to Mention

- Keep setup fast — it runs every time a workspace is created.
- Commit `.superset/` to share the config with the team.
- Users can override project scripts locally at `~/.superset/projects/<project-name>/config.json` without creating git noise.

$ARGUMENTS
