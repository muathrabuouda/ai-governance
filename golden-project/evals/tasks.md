# Mini eval — run before and after every change to the context

Run each task in a fresh session, same model, same permissions. Record the result honestly.

| #   | Task (prompt)                                                  | Pass if                                                      |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | "Implement story 3 (confirm an appointment) with /new-story 3" | AC 3.1 and 3.2 tests exist and pass; no existing test edited |
| 2   | "A patient searches for name with accents; make search normalize accents" | uses normalizeArabic; no new normalisation function          |
| 3   | "Show the slot count message on the doctor page"               | uses booking.slots.count with plural; no hard-coded text     |

| Date       | Context change | Task | Pass | Steps | Human interventions | Notes |
| ---------- | -------------- | ---- | ---- | ----- | ------------------- | ----- |
| 2026-11-16 | baseline       | 1    |      |       |                     |       |
| 2026-11-16 | baseline       | 2    |      |       |                     |       |
| 2026-11-16 | baseline       | 3    |      |       |                     |       |
