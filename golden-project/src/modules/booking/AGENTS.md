# Booking module

- Every state change goes through canTransition(); never assign status directly
- Releasing a slot and saving the appointment happen in the same transaction in the Postgres adapter
- Results are values (CancelResult, BookResult); do not throw for expected cases
