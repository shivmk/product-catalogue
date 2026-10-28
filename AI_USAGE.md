# AI usage

## Tools and models

| Tool                                                           | Used for                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Claude Code** (VS Code extension), model **Claude Opus 5.5** | Reading the brief, planning, writing code/tests/docs, running the app and tests, checking the UI in screenshots |
| Headless Chrome (driven by the agent)                          | Desktop/mobile and light/dark screenshots of the running Docker stack, used to review the UI                    |

## Agent instruction file

[`CLAUDE.md`](CLAUDE.md) is committed. It was written **before any application code** and states
the architecture rules the agent had to follow:

- the web app never calls the product source directly;
- `routes → services → ports`, with adapters wired only in `server.ts`;
- shared contract first;
- design tokens only;
- validate all external input;
- no personal data in logs;
- run typecheck, lint and tests before finishing.

## Plan / spec

[`docs/PLAN.md`](docs/PLAN.md) was agreed before the build and committed as the first commit on
`main`. It maps each acceptance criterion to an endpoint and sets the quality bar and the phases.

## Key prompts and moments that shaped the solution

1. **"First check [the brief] and let me know what it is and how it can be done … do proper
   planning."** Asked for a plan, not code. The plan identified that the brief scores judgement more
   than features, and that the three things named as "expected to change" (data source, look and
   feel, email provider) should each get an explicit boundary. That became the ports-and-adapters
   design. It also proposed Mailpit, so the reviewer can see the "sales inbox receives an email"
   criterion working without creating any account.

2. **"Can we make a good and rich UI with good animation using Three.js?"** The AI advised against
   Three.js. The brief says the look and feel is being created by an agency, so 3D work now would be
   thrown away, and it would add bundle size, accessibility and testing risk for no product value.
   We went with Motion animations plus design tokens instead, and kept the option of a lazy-loaded
   3D hero behind a flag. That trade-off is recorded in DECISIONS.md.

3. **"OK then proceed"** (plus the HR submission instructions). The agent built in phases (contract →
   API → web → Docker → docs), committing after each phase with typecheck, lint and tests green,
   and **stopped before creating the public GitHub repository**, because that is an outward-facing
   action that needed my confirmation.

4. **Verification against reality, not just tests.** Before writing the Fake Store adapter, the
   agent called the real API and found that unknown product ids return **HTTP 200 with an empty
   body**, not 404. The adapter is designed around that. After the build it ran the full Docker stack and
   checked the email in Mailpit's API, including that `<b>` typed into the name field arrives
   escaped.

5. **Mutation check on the tests.** When all 12 web tests passed on the first run, that was treated
   as suspicious. The agent deliberately broke two features (wrong product id sent in the enquiry,
   "More in category" section hidden) to confirm the tests fail, then restored them.

## Where the AI got things wrong, and how it was caught

| What went wrong                                                                                                                                                         | How it was caught                                                        | Fix                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| The first search implementation used substring matching, so **"mens" also returned women's clothing** ("womens" contains "mens").                                       | Reviewing the draft against the real category names before running it.   | Word-prefix matching, plus a regression test (`does not match "mens" inside "womens"`).                  |
| The accent-stripping regex was written with `̀-ͯ` escapes that ended up in the file as **literal invisible combining characters**. It worked, but nobody could review it. | Reading the file after formatting.                                       | Replaced with `\p{Diacritic}` (self-describing), plus a test.                                            |
| Picked **TypeScript 7** (latest), but typescript-eslint only supports `<6.1`.                                                                                           | Checking peer dependencies before installing.                            | Pinned TS 6.0 and recorded why.                                                                          |
| The enquiry form built **ref callbacks during render**.                                                                                                                 | ESLint (React hooks / compiler rules) failed.                            | Focus fields through the form's own `elements` collection, so no ref callbacks are needed.               |
| The form **silently ignored server errors for fields not on the form**. If a product was removed, the customer would click Send and see nothing.                        | Found while fixing the item above (reviewing the error path).            | Unknown-field errors now show as a form-level message; added a test.                                     |
| **zod (about 90 kB gzipped) landed in the main browser bundle**, just because the search bar imported one constant from the shared package.                             | The Vite build warned about chunk size; measured each dependency's size. | Split the shared package into a zod-free entry and a `/schemas` entry, and lazy-loaded the enquiry form. |
| Lazy-loading the form then **broke a test**: it typed into the form before the chunk had loaded.                                                                        | Test run.                                                                | The test helper now waits for the form to appear, as a user would.                                       |
| Product cards had **uneven image heights**, and prices were **clipped** in the 5-column row.                                                                            | Screenshots of the running app (none of the tests could catch this).     | Absolutely positioned images in a fixed square; rating and price row wraps.                              |
| Moving from one product page straight to another would have **kept the enquiry form open for the wrong product**.                                                       | Code review of `ProductPage`.                                            | The page is keyed by product id, so its state resets.                                                    |

<!-- TODO(Shivaji): add anything YOU changed or challenged while reviewing. Interviewers value your
own catches most. Examples: a naming change, a decision you overrode, something you asked the AI
to explain. Delete this comment before submitting. -->

## How I reviewed the output

- Read every file in the diff before each commit, with particular attention to the boundaries
  (`ports/`, `server.ts`, `packages/shared`) and the security-sensitive paths (enquiry validation,
  email escaping, error handling, nginx headers).
- Ran the stack myself with `docker compose up --build` and went through every acceptance
  criterion by hand.

<!-- TODO(Shivaji): make this section true and specific to what you actually did. -->

## Time spent

| Phase                                                                                | Time               |
| ------------------------------------------------------------------------------------ | ------------------ |
| Planning (reading the brief, agreeing the plan and the UI approach)                  | ~15 min            |
| Building (API, web, Docker, with tests written alongside)                            | ~25 min agent time |
| Testing and verification (test runs, mutation check, Docker end-to-end, screenshots) | ~10 min            |
| Docs (README, DECISIONS, AI_USAGE, PR description)                                   | ~10 min            |
| **My review of the code and docs**                                                   | TODO(Shivaji)      |
| **Total**                                                                            | TODO(Shivaji)      |

<!-- TODO(Shivaji): replace with your real numbers. Going over the time box is fine if it's honest. -->
