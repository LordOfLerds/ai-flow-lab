# INVARIANTS

System invariants that must ALWAYS be true. These are the constraints and guarantees that the system must maintain.

An invariant is a condition that, if violated, indicates a bug or corruption in the system.

## Data Invariants

Constraints on data that must never be violated.

### Example: Foreign Key Integrity
```
Invariant: Every ProjectMember.project_id must reference an existing Project
Violation: Orphaned project members that point to deleted projects
Detection: Query ProjectMember where project_id NOT IN (SELECT id FROM Project)
Recovery: Delete orphaned rows or restore the project
```

### Example: Uniqueness
```
Invariant: User emails are globally unique within the system
Violation: Two users with the same email address
Detection: SELECT email, COUNT(*) FROM User GROUP BY email HAVING COUNT(*) > 1
Recovery: Merge users or restore from backup
```

### Example: Non-null Constraints
```
Invariant: Every Project must have an owner_id that is not null
Violation: Project with NULL owner_id
Detection: SELECT id FROM Project WHERE owner_id IS NULL
Recovery: Assign to a valid user or delete the project
```

---

## Process Invariants

Constraints on how the system operates.

### Atomicity
```
Invariant: Payment transactions are atomic - either fully succeed or fully fail
Guarantee: No partial payments, no orphaned transaction records
Mechanism: Database transactions with rollback on error
```

### Ordering
```
Invariant: updated_at timestamps are monotonically increasing per entity
Guarantee: No entity can have an updated_at earlier than its created_at
Mechanism: Database constraints and application logic
```

### Causality
```
Invariant: Events are processed in order
Guarantee: No message is processed before its prerequisites
Mechanism: Event queue with ordered processing
```

---

## Consistency Rules

Guarantees about data consistency.

### Immediate Consistency
```
Invariant: Reading a value immediately after writing returns the written value
Applies to: All user-facing operations
Trade-off: Possible latency on write-heavy workloads
```

### Eventual Consistency
```
Invariant: Eventually, all replicas will converge to the same state
Applies to: Cache invalidation, async updates
Timeline: Within 5 minutes for normal operations
```

### Transactional Consistency
```
Invariant: All updates to related entities happen together or not at all
Applies to: Multi-entity transactions
Mechanism: Database transactions or saga patterns
```

---

## Performance Invariants

Guarantees about system performance.

### Response Time SLA
```
Invariant: 99th percentile API response time < 200ms for reads
Invariant: 99th percentile API response time < 500ms for writes
Measured: End-to-end, including network latency
Violation: Page timeout or user frustration
```

### Throughput
```
Invariant: System must handle at least 1000 requests/second
Measured: Sustained load, not spike
Mechanism: Auto-scaling, load balancing, caching
```

### Resource Usage
```
Invariant: Memory per process < 512MB
Invariant: Database connection pool < 50 connections
Invariant: Cache hit rate > 80% for hot data
```

---

## Availability Invariants

Guarantees about system availability.

### Uptime SLA
```
Invariant: 99.9% uptime (11.7 hours downtime/year)
Applies to: Production environment only
Exclusions: Scheduled maintenance, customer network issues
```

### Data Durability
```
Invariant: No data loss due to system failure
Mechanism: Replicated database, regular backups, WAL (Write-Ahead Logging)
Recovery Time: < 1 hour from latest backup
```

### Graceful Degradation
```
Invariant: If a service fails, the system degrades gracefully
Example: If cache fails, fallback to database (slower but works)
Example: If payment service fails, queue transactions for retry
```

---

## Security Invariants

Guarantees about security.

### Authentication
```
Invariant: Every API request must be authenticated
Mechanism: JWT token or session cookie
Invariant: Sessions expire after 24 hours of inactivity
```

### Authorization
```
Invariant: Users can only access resources they own or are explicitly granted
Invariant: Admins can access all resources
Mechanism: Permission checks on every protected operation
```

### Data Protection
```
Invariant: Passwords are never stored in plain text
Mechanism: Bcrypt hashing with salt
Invariant: Sensitive data is encrypted at rest
Mechanism: AES-256 encryption
Invariant: All network traffic uses TLS 1.2+
```

### Audit Trail
```
Invariant: All mutations are logged
Includes: Who, what, when, why
Retention: 7 years for compliance
```

---

## Validation Invariants

Rules about valid data.

### Email Validation
```
Invariant: Email fields must be valid email addresses
Format: RFC 5322 compliant
Implementation: Client-side + server-side validation
```

### Numeric Bounds
```
Invariant: Amounts must be positive and <= 999,999,999.99
Invariant: User age must be between 0 and 150
Validation: Database constraints + application validation
```

### Enum Values
```
Invariant: Status fields can only contain defined values
Values: active, suspended, deleted
Validation: Database enum type + application validation
```

---

## Concurrency Invariants

Guarantees about concurrent access.

### Race Conditions
```
Invariant: No lost updates when concurrent writes occur
Example: Two users editing the same field simultaneously
Mechanism: Optimistic locking with version numbers
```

### Deadlocks
```
Invariant: No circular lock dependencies
Mechanism: Lock ordering discipline, lock timeouts
Detection: Periodic deadlock detection
```

### Stale Reads
```
Invariant: Reads don't return data from failed transactions
Mechanism: Isolation level: READ_COMMITTED or higher
```

---

## System Integrity

High-level system properties that must hold.

### No Orphaned Data
```
Invariant: Every reference points to an existing entity
Example: ProjectMember.user_id -> User.id (must exist)
Example: Task.project_id -> Project.id (must exist)
Mechanism: Foreign key constraints, soft deletes
```

### Idempotency
```
Invariant: Performing the same operation multiple times yields the same result
Applies to: Payment processing, account creation, file uploads
Implementation: Idempotency keys, deduplication logic
```

### Reversibility
```
Invariant: User actions can be undone
Applies to: Deletions, updates, state changes
Mechanism: Soft deletes, versioning, audit trail
```

---

## Monitoring Invariants

How to detect violations.

### Critical Monitoring
Monitor these to detect invariant violations:

- Duplicate email count (should always be 0)
- Orphaned foreign key count (should always be 0)
- API response time (p99 < 200ms)
- Error rate (< 0.1%)
- Database connection pool usage (< 80%)
- Cache hit rate (> 80%)
- Auth failures per minute (< 10)

### Alerting Thresholds
Trigger alerts when:
- Any orphaned data detected (critical)
- Response time p99 > 500ms (warning)
- Error rate > 1% (warning)
- Error rate > 5% (critical)
- Uptime < 99.8% (warning)

---

## Related Documents

- DOMAIN_MODEL.md - Entity definitions and rules
- ARCHITECTURE.md - How invariants are enforced
- docs/ADR/ - Design decisions and trade-offs
