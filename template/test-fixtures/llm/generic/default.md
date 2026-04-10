# Generic LLM Response

This is a generic fallback response for any LLM step that does not have a specific fixture.

## Content

This fixture can be used when testing steps that do not require highly specific or formatted output. It provides basic, valid markdown that will not break parsers or cause syntax errors.

## Structure

Standard markdown sections can be added as needed for the calling script. The key is to ensure:

1. Valid markdown syntax (no unclosed blocks or malformed headings)
2. Proper spacing between sections
3. Standard section headers using ## or ### as appropriate
4. No special parsing requirements unless the calling script specifically needs them

## Use cases

- Fallback when a specific fixture file is not found
- Testing error handling and default behavior
- Generating placeholder content for development and testing phases
- Validating that the parser system gracefully handles generic responses

## Notes

Replace this generic fixture with task-specific content as needed. Fixtures should be as realistic as possible to catch edge cases and parsing errors early in the test harness.
