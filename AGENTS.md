# OpenHands Instructions


This repository is a web application project.


## Main rules


- Do not commit directly to `main`.
- Always make changes in a separate branch.
- Open a pull request targeting `main`.
- Keep changes small and focused on the GitHub issue.
- Do not make unrelated refactors.
- Do not change unrelated files.
- Do not commit secrets, tokens, `.env` files, private keys, or credentials.


## When fixing an issue


1. Read the full GitHub issue title, body, and comments.
2. Understand the problem before editing code.
3. Inspect the relevant files.
4. Make the smallest correct fix.
5. Add or update tests when practical.
6. Run relevant checks.
7. Open a pull request targeting `main`.


## Commands


Use these commands when they exist:


```bash
npm ci
npm run lint
npm test
npm run build
```


If a command does not exist, inspect package.json and use the closest available command.


## Testing


- For bug fixes, add a regression test when practical.
- For UI bugs, use the existing test framework if one exists.
- Do not add a new test framework unless necessary.
- Do not claim tests passed unless you actually ran them.
- If a test cannot be run, explain why in the pull request.


## Pull request requirements


In the pull request body, include:


- Summary of changes
- Files changed
- Tests run
- Any tests that failed or could not be run
- Remaining risks or assumptions


## Safety


Be extra careful with:


- Authentication
- Authorization
- User data
- Payments
- Database migrations
- Delete or reset behavior
- Environment variables
- Deployment configuration


If the issue is unclear, make a minimal safe change or explain what information is missing.
