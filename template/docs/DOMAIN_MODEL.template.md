# DOMAIN MODEL

This document defines the core entities, attributes, relationships, and rules that govern {{PROJECT_NAME}}.

The domain model is the source of truth for what exists in the system and how these things relate to each other.

## Entities

Define your core business entities here. Each entity represents a key concept in your system.

### Entity Template

```
### EntityName
Brief description of what this entity represents.

Attributes:
- attribute1: type (description)
- attribute2: type (description)

Unique Constraints:
- constraint description

Foreign Keys:
- relationship to another entity

Lifecycle:
- states and transitions
```

### Example: User

A User represents a person who can log in and perform actions in the system.

Attributes:
- id: UUID (globally unique identifier)
- email: string (email address, must be unique)
- name: string (full name)
- role: enum["admin", "member", "viewer"] (access level)
- status: enum["active", "suspended", "deleted"]
- created_at: timestamp (when user was created)
- updated_at: timestamp (when user was last modified)

Unique Constraints:
- email must be globally unique per system
- id is the primary key

Lifecycle:
- Created in "active" state
- Can transition to "suspended" by admin
- Can transition to "deleted" (soft delete)
- Cannot transition back from "deleted"

---

## Relationships

Define how entities relate to each other.

### One-to-Many Example
```
User (1) ──has many──> Project (∞)
- A User can own multiple Projects
- A Project has exactly one owner (User)
- Foreign key: Project.owner_id -> User.id
```

### Many-to-Many Example
```
User (∞) ──is member of──> Team (∞)
- A User can be a member of many Teams
- A Team can have many Users
- Join table: TeamMember(user_id, team_id)
```

---

## Rules

Define business rules that govern how entities interact.

### Data Integrity Rules
- Rule: description and consequence
- Example: User emails must be globally unique. The system enforces this in the database as a UNIQUE constraint.

### State Transition Rules
- Rule: description of valid transitions
- Example: Only admins can create other users. A user in "suspended" state cannot create projects.

### Temporal Rules
- Rule: time-related constraints
- Example: Projects must be deleted within 30 days of deactivation, or they are auto-purged.

### Authorization Rules
- Rule: who can do what
- Example: Users can only edit their own profile. Admins can edit any user's profile.

---

## Invariants

Define what must ALWAYS be true about the domain. These are constraints that the system must maintain.

### Database Invariants
- No orphaned foreign keys (all references must point to existing entities)
- No duplicate emails per tenant
- User IDs are globally unique
- Created timestamps are never null

### Temporal Invariants
- updated_at >= created_at for all entities
- State transitions are monotonic (you can't go backward to earlier states)
- Timestamps are immutable once set

### Consistency Rules
- Every Project has exactly one owner
- Every TeamMember entry references an existing User and Team
- Soft-deleted entities are never returned in normal queries

---

## Examples

### Complete Workflow Example

```
1. User "alice@company.com" is created
   - state: active
   - role: member

2. Alice creates a Project "Data Pipeline"
   - Project.owner_id = alice.id
   - Project.status = active

3. Alice invites bob@company.com to the project
   - Creates ProjectMember with alice.id, project.id, bob.id
   - Bob can now view and edit the project

4. Alice deletes the project
   - Project.status = deleted
   - ProjectMembers are orphaned but kept for audit
   - Project data is retained for 30 days, then purged
```

---

## Anti-Patterns

Document patterns that are NOT allowed:

- Circular references between entities
- Storing redundant data that should be computed
- Using entities for temporary state (use sessions instead)
- Mixing concerns (e.g., User storing payment details)

---

## Future Considerations

Document planned additions to the domain:

- Future entities to add
- Relationships that may change
- Rules that may evolve
- Known limitations

Example:
```
- Multi-tenancy: Currently single-tenant, will support multiple orgs in v2.0
- Webhooks: Will add webhook event system for integrations
- Audit logging: Will add detailed audit trail of all mutations
```

---

## Related Documents

- INVARIANTS.md - System constraints that must hold
- ARCHITECTURE.md - How the domain is implemented
- docs/ADR/ - Architecture decision records
