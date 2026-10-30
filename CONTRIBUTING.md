# Contributing

## First time setup

Do this once.

1. **Install the tools**
   - [Node 20+](https://nodejs.org) — pick the LTS build
   - [Git](https://git-scm.com)
   - [VS Code](https://code.visualstudio.com)

2. **Accept the GitHub invite** — check your email, or go to
   https://github.com/propalasi80-debug/taptile-website and accept the banner.

3. **Clone the repo**

   ```bash
   git clone https://github.com/propalasi80-debug/taptile-website.git
   cd taptile-website
   ```

4. **Tell git who you are** (inside this folder, no `--global`)

   ```bash
   git config user.name "Your Name"
   git config user.email "the-email-on-your-github-account"
   ```

5. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

   Open the URL it prints — usually http://localhost:5173.

6. **Optional: environment variables.** Sign-in and checkout are switched off
   until these exist. The site runs fine without them.

   ```bash
   cp .env.example .env.local
   ```

   Ask Palasi for the values. **Never commit `.env.local`.**

Two people, one repo. These rules exist so you never lose an afternoon to a
merge conflict.

## The daily loop

```bash
git pull                       # before you start. Always.
git checkout -b feat/thing     # work on a branch, never on main
# ...edit...
git add .
git commit -m "feat: add thing"
git push -u origin feat/thing  # then open a pull request on GitHub
```

## Branch names

| Prefix     | Use for                          |
|------------|----------------------------------|
| `feat/`    | new functionality                |
| `fix/`     | bug fixes                        |
| `chore/`   | tooling, deps, config            |
| `docs/`    | documentation only               |

## Commit messages

`type: short description in the imperative`

```
feat: add hotkey action editor
fix: debounce double taps on the phone client
chore: bump electron to 33
```

Why the format: it makes `git log --oneline` readable, and later it lets us
generate a changelog automatically.

## Pull requests

Every change goes through a PR, even a one-liner. The other person reviews and
merges. This is not bureaucracy — it is the only way both of you stay aware of
what the codebase is doing.

CI runs typecheck and a production build on every PR. A red PR does not get merged.

## Who owns what

Agree this explicitly and write it here. Suggested split:

- **Palasi** — site build, checkout, deployment
- **Cofounder** — product copy, photography, vendor and pricing

Overlapping on the same files is the single biggest source of conflicts for a
two-person team. Divide by directory where you can.

## Code style

- TypeScript everywhere, `strict` on. No `any` without a comment explaining why.
- Comments explain *why*, not *what*. The code already says what.
- Keep dependencies few. Every one is more bundle for the customer to download.
