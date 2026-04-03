# T-0003 Implementation Brief

## Goal
Enforce the domain rule that only existing tasks can be marked done.

## Source
This comes from the documented drift D-001.

## Constraints
- Minimal safe fix
- No scope expansion
- Update tests
- Respect truth docs

## Expected behavior
- Calling markDone with an existing id should still work
- Calling markDone with a non-existing id should no longer silently succeed
- Tests must document the chosen behavior clearly
