# Permission Policy

This document describes what tool calls are considered safe, risky, or
dangerous for this project. The LLM classifier reads this file on every
ambiguous call, so keep it tight, specific, and free of contradictions.

## Project context

- Stack: React + Node.js (TypeScript).
- Package manager: npm (use pnpm/yarn rules by analogy if applicable).
- The project directory is the only filesystem area the agent should
  modify. Anything outside of it is off-limits unless explicitly listed.

---

## GREEN — auto-approve

### File writes
- Any write or edit under `src/`, `app/`, `pages/`, `components/`,
  `lib/`, `hooks/`, `utils/`, `styles/`, `public/`, `tests/`, `__tests__/`.
- Editing `README.md`, `CHANGELOG.md`, or other top-level docs.
- Creating new files matching the above paths.

### Bash
- Read-only git: `git status`, `git diff`, `git log`, `git show`,
  `git branch`, `git blame`, `git rev-parse`, `git ls-files`.
- Inspection: `ls`, `cat`, `head`, `tail`, `wc`, `file`, `stat`, `tree`,
  `find`, `which`, `pwd`, `echo`, `date`.
- Project scripts: `npm test`, `npm run test`, `npm run lint`,
  `npm run typecheck`, `npm run build`, `npm run dev` (and pnpm/yarn
  equivalents).
- Running project files: `node <file>`, `python <file>`, `tsx <file>`
  where `<file>` is inside the project directory.

### MCP / Web
- `WebFetch` and `WebSearch` for documentation lookup.

---

## YELLOW — ask the user

### File writes
- Edits to configuration files: `package.json`, `tsconfig.json`,
  `vite.config.*`, `next.config.*`, `webpack.config.*`, `.eslintrc.*`,
  `.prettierrc.*`, `babel.config.*`, `jest.config.*`.
- Edits to CI/CD: `.github/`, `.gitlab-ci.yml`, `Dockerfile`,
  `docker-compose.*`.
- Edits to database schema: `prisma/schema.prisma`, migration files,
  `*.sql`.

### Bash
- Package installs: `npm install`, `npm i`, `npm add`, `pnpm add`,
  `yarn add`. Always ask — the user should see what's being installed.
- Git mutations: `git commit`, `git add`, `git stash`, `git checkout`,
  `git merge`, `git rebase`, `git pull`, normal `git push` (non-forced).
- Process control: `kill`, `pkill`, `killall`.
- Network tools the agent doesn't strictly need: `curl`, `wget` (reading
  remote resources, not piping to shell).
- Running arbitrary scripts from `scripts/` that the agent didn't write
  this session.

---

## RED — deny

### File writes
- Anything outside the project directory.
- Any `.env`, `.env.*`, `secrets.*`, `credentials.*`, `*.pem`, `*.key`,
  or files under `.ssh/`.
- Global config files: `~/.gitconfig`, `~/.npmrc`, `~/.bashrc`, etc.

### Bash
- `rm -rf`, `rm -fr`, or any recursive+force delete.
- `sudo` anything.
- Piping remote content to a shell: `curl … | sh`, `wget … | bash`, etc.
- Writes redirected into system directories: `> /etc/…`, `> /usr/…`,
  `> /bin/…`, `> /boot/…`.
- Force-pushing to git: `git push --force`, `git push -f`.
- Fork bombs or obvious resource attacks.
- Installing global packages: `npm i -g …`, `pnpm add -g …`.
- Any command that reads `.env`, credentials, or ssh keys and sends the
  output over the network.
- Disabling or uninstalling security tooling, linters, or tests.

---

## Tiebreakers

- When in doubt, classify as YELLOW. Letting the user confirm is always
  better than a wrong GREEN.
- If a single command does multiple things (e.g. chained with `&&`),
  classify by the riskiest step.
- Obfuscated commands (base64-decoded, eval'd, hex-escaped) are RED by
  default — legitimate tasks don't need obfuscation.
