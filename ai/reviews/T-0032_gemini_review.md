# T-0032 Gemini Review

## Review target
The implementation specification for T-0032: "Add executor file-safety guardrail to pipeline" — a system to snapshot source files before LLM execution and validate/restore them afterward to prevent file destruction incidents.

## Contradictions

1. **Backup strategy inconsistency**: Line 29 mentions "Optionally write a `.backup/` directory with copies of files that have > 50 lines" but line 125 states "Snapshot is in-memory: No persistent backup directory needed." The spec contradicts itself on whether backups should be persistent or memory-only.

2. **Constraint vs. implementation mismatch**: The constraints list "crypto" as an allowed Node.js built-in, but none of the example code or acceptance criteria use cryptographic hashing. Either remove crypto from constraints or explain why content hashing isn't implemented.

3. **File discovery contradiction**: The spec acknowledges that hardcoded patterns (`index.html`, `auth-state.js`) "may miss files in other projects" and notes `discoverSourceContext` already exists for file discovery, yet the example code still uses hardcoded patterns instead of leveraging the existing discovery logic.

## Missing edge cases

1. **Pre-existing corruption**: What if the original file already contained placeholder patterns? The validator would incorrectly flag a legitimately restored file as corrupted.

2. **Bidirectional size validation**: The spec only flags files that shrink but ignores files that grow unexpectedly large (e.g., LLM duplicating sections, infinite loops in generated code). A file ballooning from 100 to 10,000 lines is equally suspicious.

3. **Binary and encoding edge cases**: The spec assumes all files are UTF-8 text. Binary files, files with different encodings, or files with null bytes could break the snapshot/restore mechanism.

4. **Memory exhaustion**: For large codebases, snapshotting all source files in memory could cause OOM errors. No size limits or sampling strategy is defined.

5. **Concurrent execution**: While acknowledged as "unlikely," concurrent task execution could cause race conditions where one task's snapshot interferes with another's validation.

6. **File permission failures**: No handling for read/write permission errors during snapshot creation or restoration.

7. **New files with placeholders**: If the LLM creates a new file with placeholder content, the current logic skips validation since no baseline exists.

## Scope risks

1. **Over-engineering warning**: This adds significant complexity (snapshot system, validation engine, restoration logic) when the root cause might be fixable with simpler approaches (better LLM prompts, improved response parsing, or file-block validation).

2. **Performance impact**: Pre-execution snapshotting could significantly slow down the pipeline, especially for large codebases. No performance benchmarks or optimization strategies are provided.

3. **Maintenance burden escalation**: The hardcoded file patterns create a maintenance liability that grows with every new project type or file format added to the system.

4. **False security**: This guards against truncation but provides no protection against logic errors, syntax corruption, or subtle bugs that don't trigger the validation rules.

## Missing tests

The spec provides no testing strategy:

1. **Destruction simulation**: How to artificially trigger the destruction scenarios to verify the guardrail works?
2. **Edge case validation**: Testing for files that legitimately shrink, grow, or contain placeholder-like content?
3. **Performance testing**: Measuring snapshot overhead on different codebase sizes?
4. **Error handling tests**: Verifying graceful degradation when snapshot/restore operations fail?
5. **Integration testing**: Ensuring the executor pipeline still works end-to-end with the new validation layer?

## Hidden assumptions

1. **Project type specificity**: The hardcoded file patterns (`index.html`, `auth-state.js`) assume a specific game/web project structure that won't generalize to other project types.

2. **Magic number justification**: The 70% threshold is arbitrary with no empirical backing. Different file types may have different legitimate shrinkage patterns.

3. **LLM behavior predictability**: Assumes file destruction follows consistent patterns (truncation + placeholders) rather than other corruption forms.

4. **Git workflow assumptions**: The spec doesn't consider whether git-based restoration (`git checkout HEAD -- file`) might be simpler and more reliable than in-memory snapshots.

5. **Serial execution assumption**: The entire approach assumes tasks run one at a time, which may not scale as the system evolves.

6. **Error recovery philosophy**: Assumes "succeed with warnings" is always preferable to "fail fast" when corruption is detected.

## Recommended corrections

1. **Resolve backup contradiction**: Choose either in-memory snapshots OR persistent backups, not both. Document the trade-offs clearly.

2. **Leverage existing discovery**: Replace hardcoded patterns with `discoverSourceContext()` to reuse proven file discovery logic and improve project portability.

3. **Add bidirectional validation**: Flag files that grow beyond reasonable bounds (e.g., >150% of original size) to catch content duplication errors.

4. **Implement content hashing**: Add SHA-256 content hashing to detect subtle corruption beyond line count changes. This justifies including `crypto` in constraints.

5. **Add graceful degradation**: Wrap all snapshot/restore operations in try-catch blocks to prevent pipeline breakage on file system errors.

6. **Define performance limits**: Set maximum file sizes for snapshotting (e.g., skip files >1MB) and maximum number of files to snapshot.

7. **Enhance placeholder detection**: Use regex patterns instead of simple string matching for more robust detection:
   ```javascript
   const placeholderPatterns = [
     /\.{3}\s*\[content continues/i,
     /\/\/\s*TODO:\s*rest of file/i,
     /\/\/\s*\.{3}\s*existing code/i
   ];
   ```

8. **Add comprehensive test plan**: Include specific test scenarios for each validation rule and error condition.

9. **Make thresholds configurable**: Allow the 70% threshold and other validation parameters to be configured via environment variables or configuration files.

10. **Consider git-based alternatives**: Investigate whether `git stash` or `git checkout HEAD` might provide more reliable restoration than in-memory snapshots.