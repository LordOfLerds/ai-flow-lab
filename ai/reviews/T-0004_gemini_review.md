# T-0004 Gemini Review

## Review target
- ai/specs/T-0004_spec.md

## Contradictions
- No direct contradiction was found between the spec and the current truth docs.
- The spec stays within the current documented domain model of tasks having `id`, `title`, and `status`.

## Missing edge cases
1. Missing-id behavior is still unresolved.
   The spec correctly identifies this as open, but implementation will need an explicit decision before tests can fully lock behavior.

2. Empty-array deletion case is not explicitly mentioned.
   `deleteTask([], id)` should be considered in tests.

3. Repeated deletion is not explicitly mentioned.
   Behavior for deleting the same id twice is currently unspecified.

4. Order preservation of remaining tasks is described as the natural minimal behavior, but it is not yet elevated into a hard acceptance criterion.

## Scope risks
1. There is a risk of mixing domain behavior and demo/CLI behavior.
   The task should remain primarily a domain-level change, with only minimal demo adjustments if truly needed.

2. There is a risk of silently settling id-reuse policy.
   Because `createTask` derives ids from the current maximum id in the array, deleting the max id can lead to id reuse later.
   The spec correctly identifies this as a risk, and implementation should avoid pretending this policy is already decided.

3. There is a risk of overdesign.
   The task does not justify introducing persistence, tombstones, soft delete, or broader identity lifecycle machinery.

## Missing tests
Recommended tests that should exist before the task is considered done:
1. Deleting an existing id removes exactly one task.
2. Remaining tasks stay in the returned array.
3. Remaining tasks preserve their relative order.
4. The original input array is not mutated in place.
5. Deleting from an empty array behaves according to the chosen policy.
6. Deleting a non-existing id behaves according to the chosen policy.

## Hidden assumptions
1. The spec implicitly assumes a pure functional collection operation.
   That assumption is consistent with the current code style, but should remain explicit.

2. The spec implicitly assumes that preserving order is desirable.
   This is likely correct for a minimal array-based task collection, but it is still an assumption.

3. The spec implicitly assumes that adding `deleteTask` should not change id-generation behavior.
   That is the safest minimal direction, but it should be explicit.

## Recommended corrections
1. Make order preservation explicit in acceptance criteria.
2. Make empty-array and non-existing-id behavior explicit in the implementation brief, even if one of them remains a consciously small chosen policy.
3. Keep the implementation domain-local:
   - `starter-test/src/tasks.ts`
   - tests first
   - optional minimal `starter-test/src/index.ts` update only if useful for demo coherence
4. Explicitly state that id-generation policy is out of scope for this task unless a contradiction forces otherwise.
