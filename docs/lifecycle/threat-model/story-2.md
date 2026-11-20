# Threat model — story 2: book a slot (one page, 20 minutes, before implementation)

What we protect: patient phone numbers, who booked which doctor (health data), slot availability.

| Threat (STRIDE)        | How it could happen here                                | Control                                                       | Test or check                       |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------- |
| Spoofing               | Someone books in another patient's name                 | patientId comes from the session, never from the request body | API test: body patientId is ignored |
| Tampering              | Client sends a slotId for another doctor or a past time | bookSlot reads startsAt from the database; InPast             | ac tests + boundaries.test.ts       |
| Repudiation            | "I never booked that"                                   | Structured log line per booking, no phone number in logs      | log.test.ts: phone is redacted      |
| Information disclosure | Error or log leaks a phone number                       | Logger redacts phone numbers; errors are codes, not data      | log.test.ts                         |
| Denial of service      | A script books every slot                               | Rate limit per patient; max 3 active bookings per patient     | open: story needed                  |
| Elevation of privilege | Patient calls the reception "confirm" endpoint          | Role check in one place (authorization module)                | open: story 3 tests                 |

Questions for the agent-written code review: Is every input validated at the boundary? Is every query parameterised? Does any log or error include personal data?
