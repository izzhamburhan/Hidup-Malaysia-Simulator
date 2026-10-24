---
name: content-guard
description: Use when a HIDUP MALAYSIA change touches src/data/, UI copy, event or feed text, humour, real universities or companies, politics, prices or salaries, payroll (EPF, SOCSO, EIS, PCB) or calorie claims. Keeps real-world data honest and labelled, and the tone friendly, original, and fair.
---

# Content Guard

The game uses real Malaysian names and everyday costs, and it jokes about life. That is the fun,
and the risk. The facts live in `CLAUDE.md` (Data honesty, Adding content),
`docs/contracts/data-catalogues.md`, and `docs/contracts/payroll.md`.

## Where content lives

- Text, prices, salaries, foods, events, feed posts, achievements and challenges live in `src/data/`. Not in components, not in engine logic.
- Each catalogue file keeps its header comment with its honesty label. New catalogue files add one.
- Ids are unique; references (job industries, course fields, event follow-ups, holiday events) resolve. `tests/data.test.ts` and `tests/events.test.ts` enforce this.

## Real-world data honesty

| Content | Rule |
| --- | --- |
| Real universities and companies | Names only. No implied vacancies, rankings, entry requirements, fees, salaries or practices. Game flavour (`strengths`, `industryLinks`, pay factors) is never phrased as a quality claim. |
| Salaries, tuition, prices, rents, deposits, vehicle costs | FICTIONAL GAME ESTIMATES, labelled so in the file header and wherever the UI explains them. Never "the average salary is". |
| Calories | Rough estimates for gameplay. Not medical or nutrition advice. No diet or weight-loss instructions. |
| Payroll (EPF/KWSP, SOCSO/PERKESO, EIS, PCB/LHDN) | SIMPLIFIED SIMULATION. Rates only in `src/data/statutory.ts` with official links. Payslips show `STATUTORY_DISCLAIMER`. Never "official", "accurate", or tax advice. |
| Holidays | Simulated calendar with fixed dates. Never presented as the real calendar. |
| Loans, PTPTN, mortgages | Game rules and fictional rates. Not financial advice. |

## Tone and fairness

- Humour is original, friendly, and recognisably Malaysian: traffic, mamak, group chats, festive open houses, bosses, rent. No copied jokes or memes with real people.
- No defamation, mockery or impersonation of real people, brands or institutions. A real company may be an employer; it is never the butt of a joke or shown behaving badly.
- Politics only through fictional parties and fictional politicians in the fictional town of Seri Harapan. No real parties, politicians, or current controversies.
- No ethnic or religious stereotypes, and no jokes about race, religion, disability, or appearance. Festivals are celebrated warmly and respectfully.
- No pig or pork, alcohol or gambling imagery anywhere (emoji included); `tests/content.test.ts` enforces the emoji list.
- Being single, not marrying, renting forever, not owning a car, and every ending are valid outcomes, never framed as failure.
- Mental health and debt are handled kindly: no shaming, and serious states point to rest or help, not punchlines.
- Copy is clear plain English; Malay and Manglish phrases are welcome where natural.

## Privacy

- No real personal data in catalogues, tests, or fixtures. NPC names are invented.
- No real social media handles or links; the feed is fictional.

## Checks

1. Read every new or changed string in the diff (catalogues, components, events, feed).
2. Search the diff for real names of people, parties, or politicians; for "official", "average", "guaranteed", "ranked", "best"; for calorie or diet advice.
3. Confirm each touched catalogue still carries its honesty header.
4. Confirm the data validation tests (`tests/data.test.ts`, `tests/events.test.ts`) pass.
5. For payroll or statutory changes, check the source link is the official site and the disclaimer still renders.

## Red flags

| Thought | Reality |
| --- | --- |
| "This salary is what my friend earns, so it is realistic." | It is still a fictional game estimate. Label it so. |
| "A real minister in the feed would be hilarious." | Fictional Seri Harapan politicians only. |
| "This joke about that community is just banter." | No ethnic or religious stereotypes. Rewrite it. |
| "The payslip is close enough to the real one." | Close is the risk. Show the disclaimer; never call it official. |
| "This university is the best for IT, add that." | No rankings or quality claims. |