# ARCHITECTURE

High-level architecture and system design of {{PROJECT_NAME}}.

This document describes:
- Main components and their responsibilities
- How data flows through the system
- Deployment topology
- Performance characteristics
- Security model

## System Overview

```
[Describe your system architecture here]

Example:
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Web UI)                    │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS
┌────────────────▼────────────────────────────────────────────┐
│                      API Gateway (Auth)                     │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼──────────────────┐  ┌───▼──────────────────┐
│   API Servers (3x)   │  │  Background Workers  │
│  (Express + Node)    │  │  (Job Queue)         │
└───┬──────────────────┘  └───┬──────────────────┘
    │                         │
    └────────────┬────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼──────────────────┐  ┌───▼──────────────────┐
│  PostgreSQL (Primary)│  │   Redis (Cache)      │
│  + Replicas          │  │   + Sentinel         │
└──────────────────────┘  └──────────────────────┘
```

## Architecture Layers

### Presentation Layer
- Frontend technology and framework
- Client-side routing and state management
- Real-time updates mechanism (WebSockets / polling)

### API Layer
- API design (REST / GraphQL / RPC)
- Authentication and authorization
- Rate limiting and throttling
- Request validation
- Error handling and standardization

### Business Logic Layer
- Core domain logic
- Workflows and state machines
- Complex calculations
- Integration with external services

### Data Layer
- Database schema and relationships
- Data access patterns
- Caching strategies
- Data validation

### Infrastructure Layer
- Deployment environment
- Load balancing
- Scaling strategies
- Monitoring and logging

## Components

### Component: [Name]

**Responsibility**: What this component does

**Technology Stack**:
- Language/Framework
- Key dependencies
- Version constraints

**Interface**:
- Input: What it receives
- Output: What it produces
- Protocol (HTTP REST, gRPC, events, etc)

**Dependencies**:
- Internal: Other components it depends on
- External: Third-party services

**Deployment**:
- Number of instances
- Resource requirements (CPU, memory)
- Scaling rules

**Communication**:
- How it talks to other components
- Latency expectations
- Failure handling

---

### Example Component: API Server

**Responsibility**: Handle all HTTP requests from clients, route to business logic, return responses

**Technology Stack**:
- Node.js 18+
- Express.js 4.18
- TypeScript
- Passport for auth

**Interface**:
- Input: HTTP requests (REST JSON)
- Output: HTTP responses (REST JSON)
- Protocol: HTTPS only

**Dependencies**:
- Internal: Services (UserService, ProjectService, etc)
- External: PostgreSQL, Redis, Auth Provider

**Deployment**:
- 3 instances in production (auto-scaling 1-10)
- 512MB memory per instance
- CPU: 2 vCPU per instance

**Communication**:
- PostgreSQL: Connection pool 10/server = 30 total
- Redis: Pub/Sub for real-time events
- Failure handling: Graceful degradation, fallback to database if Redis down

---

## Data Flow

### Request Flow

```
1. Client sends HTTP request
   ├─ Browser adds authentication token
   ├─ Request goes through load balancer
   └─ Routed to available API server

2. API Server processes request
   ├─ Authenticates user via token
   ├─ Checks authorization (permissions)
   ├─ Validates request parameters
   └─ Routes to appropriate handler

3. Business Logic executes
   ├─ Loads data from database (or cache)
   ├─ Applies business rules
   ├─ Calls external services if needed
   └─ Persists changes

4. Response returned
   ├─ Format response as JSON
   ├─ Add caching headers
   └─ Return to client

5. Client receives response
   ├─ Parse JSON
   ├─ Update UI state
   └─ Cache locally if needed
```

### Data Flow Example: Create Project

```
User clicks "Create Project" in UI
  ↓
POST /api/projects { name: "My Project" }
  ↓
API Server receives request
  ├─ Auth: Verify JWT token is valid
  ├─ Validate: Check project name is not empty
  └─ Route: POST handler for projects
  ↓
ProjectService.createProject()
  ├─ Generate new UUID for project
  ├─ Set owner_id to current user
  ├─ INSERT INTO projects (id, name, owner_id, created_at)
  ├─ Invalidate Redis cache key: user:123:projects
  └─ Publish event: project:created
  ↓
Background worker receives event
  └─ Update Elasticsearch index
  ↓
Return response to client
  ├─ Status: 201 Created
  ├─ Body: { id: "...", name: "...", owner_id: "..." }
  └─ Headers: Cache-Control: private, max-age=3600
  ↓
Client receives response
  ├─ Update UI to show new project
  └─ Cache response locally
```

---

## Deployment Topology

### Development Environment

```
Developer's Machine
├─ Local PostgreSQL instance
├─ Local Redis instance
├─ Node.js API server (localhost:3000)
└─ Webpack dev server (localhost:3001)
```

### Staging Environment

```
AWS Region: us-east-1
├─ ALB (Application Load Balancer)
├─ 2x API Servers (t3.medium)
├─ 1x RDS PostgreSQL (db.t3.small, no replica)
├─ 1x ElastiCache Redis (t3.micro)
└─ S3 for static assets (CloudFront CDN)
```

### Production Environment

```
AWS Region: us-east-1 (Primary), us-west-2 (Backup)

us-east-1:
├─ ALB with WAF
├─ 3x API Servers (Auto-Scaling Group, m5.large)
│  └─ Min: 3, Max: 10, Target: 70% CPU
├─ 1x RDS PostgreSQL (db.r5.2xlarge)
│  ├─ Primary with Multi-AZ failover
│  ├─ Read replica in us-west-2
│  └─ Daily automated backups (30-day retention)
├─ 1x ElastiCache Redis Cluster (r6g.xlarge)
│  └─ 3-node cluster with automatic failover
├─ 1x RDS Backup to S3 (cross-region)
└─ CloudFront CDN for static assets

us-west-2:
└─ Read replica PostgreSQL (for analytics queries)
```

---

## Performance Characteristics

### Throughput

- **API Requests**: 1000+ RPS at p99
- **Database Queries**: < 100ms (p99)
- **Cache Queries**: < 5ms (p99)

### Scalability

- **Horizontal**: Add API server instances as load increases
- **Vertical**: Upgrade database instance as data grows
- **Storage**: Automatic backup to S3, lifecycle policies

### Bottlenecks

- Database query performance (mitigated with indexes and caching)
- Network latency between regions (mitigated with read replicas)
- Third-party API latency (mitigated with queuing and retries)

---

## Security Model

### Authentication

**Mechanism**: JWT tokens issued by Auth0

- Token format: HS256 signed
- Expiration: 1 hour
- Refresh token: 30 days
- Stored securely in: HttpOnly secure cookies

**Flow**:
```
1. User provides email/password to Auth0
2. Auth0 validates and issues JWT token
3. Client stores token in cookie
4. Each API request includes token in Authorization header
5. API server verifies token signature
```

### Authorization

**Model**: Role-Based Access Control (RBAC)

- Roles: admin, editor, viewer
- Permissions are checked at:
  - HTTP endpoint level (middleware)
  - Business logic level (service methods)
  - Database level (row-level security policies)

**Example**:
```
POST /api/projects/:id/delete
├─ User role must be "admin" OR
├─ User must be the project owner
└─ If not: Return 403 Forbidden
```

### Data Protection

**At Rest**:
- Database: Encrypted at rest (AWS KMS)
- Backups: Encrypted at rest (AES-256)
- Secrets: Stored in AWS Secrets Manager

**In Transit**:
- All connections: HTTPS/TLS 1.2+
- Internal services: mTLS (mutual TLS)
- Database connections: Require SSL

### Audit Trail

All mutations are logged:
- Who: User ID
- What: Action (create, update, delete)
- When: Timestamp
- Data: Before and after values
- Retention: 7 years (for compliance)

---

## Failure Modes and Recovery

### Database Failure

**Scenario**: Primary database becomes unavailable

**Detection**: Connection pool exhausted, query timeouts

**Response**:
1. Automatic failover to RDS standby (< 1 minute)
2. DNS updated to point to new primary
3. Read traffic rerouted to replicas
4. Alert sent to on-call engineer

**Recovery Time**: < 2 minutes

### Cache Failure

**Scenario**: Redis becomes unavailable

**Detection**: Connection timeouts

**Response**:
1. Log cache misses to monitoring system
2. Fallback to database queries (slower but works)
3. Don't evict database reads
4. Alert sent but not critical

**Recovery Time**: Graceful degradation, no data loss

### API Server Failure

**Scenario**: Single API server crashes

**Detection**: ALB health check fails

**Response**:
1. Load balancer removes server from rotation
2. Existing connections drained (30s timeout)
3. Auto-scaling group launches replacement
4. Alert sent to ops team

**Recovery Time**: < 1 minute

---

## Monitoring and Alerting

### Key Metrics

**Application**:
- Request rate (requests/second)
- Error rate (% of requests failing)
- Response time (p50, p95, p99)
- Active connections

**Database**:
- Query time (p50, p95, p99)
- Connection pool usage
- Disk space usage
- Replica lag

**Infrastructure**:
- CPU utilization
- Memory utilization
- Network throughput
- Disk I/O

### Alert Rules

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 1% | Page on-call |
| Response time (p99) | > 1000ms | Page on-call |
| Database replica lag | > 1s | Page on-call |
| Disk usage | > 90% | Notify ops |
| CPU utilization | > 80% | Notify ops |

---

## Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Language | Node.js | 18+ | JavaScript ecosystem, npm packages |
| Framework | Express.js | 4.18+ | Lightweight, well-tested |
| Database | PostgreSQL | 14+ | ACID compliance, reliability |
| Cache | Redis | 7+ | Fast, supports complex data structures |
| CDN | CloudFront | - | AWS integration, global reach |
| Monitoring | DataDog | - | Comprehensive APM and logging |
| CI/CD | GitHub Actions | - | GitHub integration, simple |

---

## Future Improvements

- Microservices: Split monolith into services (v2.0)
- Event sourcing: Move to event-based architecture
- Multi-tenancy: Support multiple organizations
- GraphQL: Add GraphQL API alongside REST
- Real-time: WebSocket support for live updates

---

## Related Documents

- DOMAIN_MODEL.md - Entity definitions
- INVARIANTS.md - System constraints
- docs/ADR/ - Specific design decisions
