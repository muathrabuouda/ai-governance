# Specification: Mawid (Clinic Booking) · Version 1.0

> **Governance Foundation Document 02:** Formal User Stories & Gherkin Acceptance Criteria.

---

## 1. Goal

Enable patients of an outpatient clinic to autonomously view, book, and cancel appointments, and empower the reception desk to manage the daily clinic schedule without double-booking conflicts.

---

## 2. Roles & Permissions

| Role             | Permissions                                                                           |
| :--------------- | :------------------------------------------------------------------------------------ |
| **Patient**      | View available slots, book a slot, and cancel their own appointments only.            |
| **Receptionist** | Confirm requested bookings, record attendance/no-show, and view full clinic schedule. |
| **Doctor**       | View their assigned patient roster and appointment statuses only.                     |

---

## 3. Scope (MoSCoW)

- **Must Have:** Slot availability query, booking, cancellation, confirmation, and race-condition prevention.
- **Should Have:** Automated reminder SMS 24 hours prior to appointment.
- **Could Have:** Post-visit feedback and rating.
- **Won't Have (v1):** Online payments, electronic medical records, native mobile apps, and multi-clinic support.

---

## 4. User Stories & Acceptance Criteria

### Story 1: View Available Slots

**As a** patient,  
**I want to** view available appointment slots for a specific doctor over the next 7 days,  
**So that** I can choose a convenient time without calling the clinic.

| ID  | Given                                                            | When                                    | Then                                                      |
| :-- | :--------------------------------------------------------------- | :-------------------------------------- | :-------------------------------------------------------- |
| 1.1 | Doctor has 8 total slots tomorrow, 3 of which are already booked | Patient views the doctor's booking page | Exactly 5 free slots are displayed in chronological order |
| 1.2 | The clinic is closed on Fridays                                  | Patient opens weekly availability       | Zero slots are shown on Friday                            |

---

### Story 2: Book a Slot

**As a** patient,  
**I want to** book an available slot,  
**So that** I secure my appointment time in advance without waiting.

| ID  | Given                                          | When                                                  | Then                                                                                                                    |
| :-- | :--------------------------------------------- | :---------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| 2.1 | 10:00 AM slot is free                          | Patient submits booking                               | Appointment is created with status `Requested` and confirmation message is sent                                         |
| 2.2 | Two patients view the same slot simultaneously | Both patients submit booking at the exact same moment | Exactly one booking succeeds; the other is rejected with "Slot no longer available" along with the 3 nearest free slots |
| 2.3 | Notification provider is down                  | Booking is completed                                  | Appointment is successfully saved, and message delivery is retried up to 3 times within 10 minutes                      |

---

### Story 3: Confirm Appointment

**As a** receptionist,  
**I want to** confirm pending booking requests,  
**So that** the doctor's daily schedule is locked and verified.

| ID  | Given                             | When                               | Then                                                                    |
| :-- | :-------------------------------- | :--------------------------------- | :---------------------------------------------------------------------- |
| 3.1 | Appointment in status `Requested` | Receptionist confirms it           | Status transitions to `Confirmed`                                       |
| 3.2 | Appointment in status `Cancelled` | Receptionist attempts confirmation | Request is rejected with error "Cannot confirm a cancelled appointment" |

---

### Story 4: Cancel Appointment

**As a** patient,  
**I want to** cancel my existing appointment,  
**So that** the slot becomes immediately available for other patients.

| ID  | Given                                      | When               | Then                                                                 |
| :-- | :----------------------------------------- | :----------------- | :------------------------------------------------------------------- |
| 4.1 | Confirmed appointment starting in 3 days   | Patient cancels it | Status becomes `Cancelled` and the slot is immediately released      |
| 4.2 | Confirmed appointment starting in 20 hours | Patient cancels it | Status becomes `LateCancelled` (< 24h rule) and the slot is released |

---

## 5. Non-Functional Requirements (NFRs)

| ID        | Quality Attribute  | Target Metric & Measurement Condition                                            |
| :-------- | :----------------- | :------------------------------------------------------------------------------- |
| **NFR-1** | Performance        | Slot availability queries respond in < 1000ms at p95 under 200 concurrent users. |
| **NFR-2** | Availability       | Booking service uptime is at least 99.5% monthly.                                |
| **NFR-3** | Privacy & Security | Doctors see only their own patients; every patient data access is logged.        |
| **NFR-4** | Localization       | Bilingual Arabic/English interface with bidirectional (RTL/LTR) support.         |

---

## 6. Invariants & Business Constraints

- Patient data must reside in compliance with local healthcare privacy regulations.
- Slot duration is fixed per doctor (15, 20, or 30 minutes).
- Cancellation under 24 hours prior to appointment is classified as `LateCancelled`.
- No-show status is recorded if patient fails to check in within 15 minutes after start time.

---

## 7. Assumptions

| Assumption                                                  | Confirmed By                     |
| :---------------------------------------------------------- | :------------------------------- |
| Each patient possesses a single valid mobile phone number.  | Clinic Director                  |
| Peak daily booking volume does not exceed 300 appointments. | Current appointment log analysis |

---

## 8. Open Questions

- Patient authentication method: persistent user account vs. one-time SMS verification code?
