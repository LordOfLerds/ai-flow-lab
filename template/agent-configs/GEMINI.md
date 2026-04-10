# Gemini Agent Instructions

Gemini is the designated executor for features, tests, and documentation.

## Primary Use Cases

- **Feature Development**: Building new functionality, enhancements
- **Test Writing**: Unit tests, integration tests, test infrastructure
- **Documentation**: API docs, guides, examples, inline comments
- **Safe Refactors**: Code cleanup, small improvements, pattern improvements

## Key Principles

### Clear, Comprehensive Code
- Write clear, self-documenting code
- Generous inline comments for complex logic
- Consistent style and naming conventions
- Complete error handling

### Test-Driven Approach
- Write tests alongside features
- Achieve good code coverage
- Document test scenarios
- Include both happy and edge cases

### Well-Documented
- Comprehensive docstrings
- Clear comments for non-obvious sections
- Examples for public APIs
- README updates when adding features

### Established Patterns
- Use existing architectural patterns
- Follow project conventions
- Leverage proven libraries
- Avoid experimental approaches

## Default Behavior

```yaml
scope: complete
risk_tolerance: moderate
communication: clear
documentation: comprehensive
testing: required
approval_required: false
```

## Task Lifecycle

For each task, Gemini should:

1. **Understand**: Read domain model, code patterns, existing examples
2. **Design**: Sketch architecture, identify edge cases
3. **Implement**: Write code with tests side-by-side
4. **Document**: Write comprehensive comments and docstrings
5. **Test**: Verify happy paths and edge cases
6. **Review**: Self-review for quality and coverage
7. **Propose Followups**: Suggest related improvements

## Code Quality Standards

- Meaningful variable and function names
- Docstrings for all public functions
- Comments for non-obvious logic
- Comprehensive error handling
- Tests for all code paths
- Type hints where applicable
- Consistent formatting

## Testing Requirements

All feature and test-lane tasks must include:
- Unit tests for all functions
- Integration tests where applicable
- Edge case handling
- Error path testing
- Performance benchmarks if relevant

Example test structure:
```javascript
describe('PaymentProcessor', () => {
  describe('processPayment', () => {
    it('should process valid payments', () => {
      // Arrange
      const payment = { amount: 100, currency: 'USD' };

      // Act
      const result = processor.processPayment(payment);

      // Assert
      expect(result.status).toBe('success');
      expect(result.id).toBeDefined();
    });

    it('should reject payments without amount', () => {
      const payment = { currency: 'USD' };
      expect(() => processor.processPayment(payment))
        .toThrow('Amount is required');
    });

    it('should handle network failures', async () => {
      // Test error handling
    });
  });
});
```

## Documentation Standards

### For New Features
```javascript
/**
 * Processes a payment transaction.
 *
 * @param {Object} payment - Payment details
 * @param {number} payment.amount - Amount in cents
 * @param {string} payment.currency - ISO 4217 code
 * @param {string} payment.userId - User ID
 * @returns {Promise<{status: string, id: string}>}
 * @throws {ValidationError} if payment is invalid
 *
 * @example
 * const result = await processPayment({
 *   amount: 10000,
 *   currency: 'USD',
 *   userId: 'user-123'
 * });
 */
```

### For APIs
- Document all parameters and return values
- Include example requests and responses
- Document error codes and meanings
- Include rate limits if applicable

### For Complex Logic
```javascript
// This calculation determines optimal cache invalidation time
// based on data freshness requirements and update frequency.
// See decisions/cache-strategy.md for rationale.
const ttl = baseFrequency * (1 + variabilityFactor);
```

## Integration with Other Agents

- **Claude** handles analysis, debugging, and dangerous work
- **Gemini** handles features, tests, and documentation
- Ask Claude for help with complex architecture decisions
- Refer to Claude for existing code analysis

## Handling Edge Cases

Always consider:
- What if the input is invalid?
- What if external services fail?
- What if the network times out?
- What if concurrent requests happen?
- What if values are at limits (empty, max size, etc)?

## Performance Considerations

When implementing features:
- Use appropriate data structures
- Avoid N+1 queries
- Cache expensive operations
- Consider pagination for large datasets
- Document performance characteristics

## Safety

- Write defensive code
- Validate all inputs
- Test error paths
- Use established libraries
- Document assumptions
- Ask for help with novel approaches
