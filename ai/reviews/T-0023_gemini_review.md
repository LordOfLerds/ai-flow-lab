# T-0023 Gemini Review

## Review target
- **Spec:** T-0023 Spec (Document `game.html` as a compatibility redirect entry point in architecture docs)
- **Focus:** Accuracy of the documentation update regarding entry point behavior and legacy support.

## Contradictions
- **Primary Source vs. Speculation:** The spec identifies `docs/ARCHITECTURE.md` as the source of truth but admits it has not been read. This creates a circular dependency where the "Desired behavior" is defined based on code observation while simultaneously warning that it must not conflict with the unread docs.
- **Routing vs. File Content:** The spec suggests documenting that `/game` redirects to `index.html`. However, if `game.html` is a static file performing a client-side redirect (meta refresh/JS), it cannot handle the extensionless path `/game` unless a server-side configuration (like `.htaccess` or Nginx config) is also in place, which is outside the scope of "only documentation should be changed."

## Missing edge cases
- **Query Parameter Persistence:** The spec does not mention if query strings (e.g., `game.html?partner=abc`) are preserved during the redirect. Documentation should clarify if the redirect is a "clean" redirect or a "transparent" one that passes arguments to `index.html`.
- **Bot/Crawler Behavior:** Meta refreshes and JS redirects are handled differently by SEO crawlers. The documentation should note if `game.html` is intended to be hidden from search engines (via `noindex`) or if it's an official SEO landing page.
- **Deep Linking:** If the app eventually supports routes (e.g., `index.html#/settings`), the documentation should specify if `game.html` supports similar deep linking.

## Scope risks
- **Server-side Assumptions:** There is a risk that the executor might document `/game` as a supported entry point based on the spec's mention of it, even if the server environment doesn't actually support extensionless routing. This would lead to "documented" behavior that fails in production.
- **Drift Register Overhead:** The spec relies heavily on the `drift-register.md` as a fallback. If the architecture docs are significantly different, the executor might spend more time documenting the drift than fixing the documentation gap.

## Missing tests
- **Doc Link Validation:** The spec does not require verifying that any new mentions of `index.html` or `game.html` within the docs actually link to the files or related sections correctly.
- **Behavioral Verification:** There is no requirement to "verify" the redirect logic (e.g., via a simple `curl -I` or browser check) before writing the documentation to ensure the documentation reflects reality.

## Hidden assumptions
- **Assumption of "Legacy":** The spec assumes `game.html` is "legacy" or "compatibility." It might actually be a requirement for specific distributors (e.g., itch.io or Kongregate) that expect a specific filename.
- **Client-Side Only:** The spec assumes the redirect is purely client-side because of what was seen in the code, ignoring possible server-side 301 redirects that might make the `game.html` file content redundant.

## Recommended corrections
- **Verify Query Params:** Add a requirement to check if `game.html` preserves `window.location.search` during redirect and document the behavior accordingly.
- **Distinguish Routing Layers:** Explicitly separate "File-based redirects" (what `game.html` does) from "Server-based routing" (what might happen for `/game`) in the documentation to avoid confusing the user.
- **Clarify "Legacy" Status:** Instead of labeling it "legacy" (which implies eventual removal), use the term "External Entry Compatibility" unless the docs explicitly state it is deprecated.
- **Pre-analysis Step:** The executor should be required to read the existing `docs/ARCHITECTURE.md` as the very first action and update the `drift-register.md` *before* drafting the new documentation content if a conflict is found.