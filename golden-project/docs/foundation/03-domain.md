# Domain Model: Mawid (Clinic Booking)

> **Governance Foundation Document 03:** Domain Glossary, Entities, Invariants, FSM & Consistency Matrix.

---

## 1. Domain Glossary

| Domain Term           | Agreed Ubiquitous Definition                                                     | Identifier in Code |
| :-------------------- | :------------------------------------------------------------------------------- | :----------------- |
| **Time Slot**         | A scheduled block of clinic time offered by a doctor available for booking.      | `TimeSlot`         |
| **Appointment**       | A patient booking associated with a specific slot, governed by a state machine.  | `Appointment`      |
| **Confirmation**      | Receptionist approval and locking of a requested booking.                        | `confirm()`        |
| **Late Cancellation** | Cancellation of a confirmed appointment within less than 24 hours of start time. | `LateCancelled`    |
| **No-Show**           | Patient failure to arrive within 15 minutes after the scheduled start time.      | `NoShow`           |

---

## 2. Domain Invariants

| Invariant Rule                                                            | Enforcement Layer                                               |
| :------------------------------------------------------------------------ | :-------------------------------------------------------------- |
| Exactly one active appointment per time slot (Double-booking prohibited). | Database unique partial constraint + row-level lock on booking. |
| State transitions must strictly follow the arrows in the FSM diagram.     | Domain entity methods reject all illegal transitions.           |
| Doctors can view only their own appointments.                             | Authorization access policy layer + automated tests.            |

---

## 3. Entity-Relationship Diagram

```mermaid
erDiagram
  PATIENT   ||--o{ APPOINTMENT : books
  DOCTOR    ||--o{ TIME_SLOT   : offers
  TIME_SLOT ||--o| APPOINTMENT : "is taken by"
  PATIENT { uuid id PK
            string full_name
            string phone UK }
  DOCTOR { uuid id PK
           string full_name
           string specialty }
  TIME_SLOT { uuid id PK
              uuid doctor_id FK
              datetime starts_at
              int minutes }
  APPOINTMENT { uuid id PK
                uuid patient_id FK
                uuid slot_id FK "UNIQUE where status is active"
                enum status
                datetime created_at }
```

---

## 4. Appointment Finite State Machine (FSM)

```mermaid
stateDiagram-v2
  [*] --> Requested : patient books
  Requested --> Confirmed : reception confirms
  Requested --> Cancelled : patient cancels
  Confirmed --> Cancelled : cancel (24h+ before)
  Confirmed --> LateCancelled : cancel (under 24h)
  Confirmed --> Completed : visit done
  Confirmed --> NoShow : 15 min late
```

---

## 5. Booking Sequence Flow

```mermaid
sequenceDiagram
  autonumber
  actor P as Patient
  participant API as Booking API
  participant DB as Database
  participant N as Notifier
  P->>API: POST /appointments
  API->>DB: lock slot and check free
  alt slot is free
    API->>DB: insert appointment (Requested)
    API->>N: send SMS confirmation
    API-->>P: 201 Created
  else slot already taken
    API-->>P: 409 Conflict + next free slots
  end
```

---

## 6. Consistency Matrix (CRUD)

| Story                            | Patient | TimeSlot | Appointment |
| :------------------------------- | :------ | :------- | :---------- |
| **Story 1: View Slots**          | —       | Read     | Read        |
| **Story 2: Book Slot**           | Read    | Read     | Create      |
| **Story 3: Confirm Appointment** | Read    | —        | Update      |
| **Story 4: Cancel Appointment**  | —       | —        | Update      |
