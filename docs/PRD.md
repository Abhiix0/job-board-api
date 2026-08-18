# PRD — Job Board API (Learning Project)

**Phase:** 04 — Backend Core
**Stack:** Node.js, Express.js, Zod, MongoDB (Mongoose), Swagger/OpenAPI (docs UI), deployed on Render
**Goal:** Build a production-shaped REST API to learn REST design, validation, relations, service-layer domain logic, and error handling. No auth in this phase. Deployed live with an interactive API docs UI (no separate frontend).

---

## 1. Problem / Motivation

Learning REST API concepts in isolation (a single flat CRUD resource) doesn't teach nested relations, domain invariants, or realistic error cases. A Job Board mirrors real products (LinkedIn Jobs, Indeed) and naturally forces:
- Parent-child resource relationships
- Domain rules that aren't just field validation (state machines, delete constraints)
- Escalating validation complexity
- A clean separation between HTTP handling, domain logic, and persistence

## 2. Scope

**In scope (this phase):**
- Companies, Jobs, Applications — full CRUD where relevant
- Nested resource routes (max depth: 1 parent → 1 child, never chained further)
- Zod validation for `body`, `params`, AND `query` — one schema file per resource
- Service layer holding domain rules, separate from controllers
- Centralized error handling via custom `ApiError` class + machine-readable error codes
- Pagination (page/limit) + filtering on list endpoints, with defined contract
- MongoDB via Mongoose, with `ref` + selective `populate()` for relations
- Indexes on frequently-filtered fields
- `/health` endpoint checking both process and DB connectivity
- Swagger/OpenAPI docs UI (interactive, testable in-browser — serves as the "visual" layer instead of a frontend)
- Deployment to Render (live public URL), with MongoDB Atlas as the hosted database
- Basic automated tests (unit + integration) per resource

**Out of scope (future phases):**
- Authentication / authorization (JWT — planned Phase 05+)
- Role-based access (recruiter vs applicant)
- File uploads (resume as actual file, not just URL)
- Email notifications
- Redis, Kafka, WebSockets, GraphQL, Docker, microservices, repository/CQRS patterns — none of this is needed for a 3-resource API

## 3. Resources & Data Model

### Company
| Field | Type | Notes |
|---|---|---|
| name | string | required |
| description | string | optional |
| website | string | optional, URL format |
| location | string | optional |

### Job
| Field | Type | Notes |
|---|---|---|
| title | string | required |
| description | string | required |
| companyId | ObjectId ref → Company | required |
| employmentType | enum | full-time / part-time / contract |
| location | string | required |
| salaryRange | { min, max, currency } | optional. min ≥ 0, max ≥ 0, min ≤ max, integers. currency default `INR` |
| status | enum | open / closed, default open |

### Application
| Field | Type | Notes |
|---|---|---|
| jobId | ObjectId ref → Job | required |
| applicantName | string | required |
| applicantEmail | string | required, email format |
| resumeUrl | string | required, URL format |
| status | enum | pending / reviewed / rejected, default pending |
| appliedAt | date | default now |

## 4. API Routes

Nesting rule: **nested routes = operating within a parent's relationship; top-level routes = addressing a resource directly.** Never nest beyond 1 level.

```
Companies
  POST   /companies
  GET    /companies              (pagination + case-insensitive partial search by name)
  GET    /companies/:id
  PATCH  /companies/:id
  DELETE /companies/:id          (409 if Jobs exist under it)

Jobs
  POST   /companies/:id/jobs
  GET    /companies/:id/jobs     (jobs for one company)
  GET    /jobs                   (filter: location [partial], employmentType [exact], status [exact]; pagination)
  GET    /jobs/:id
  PATCH  /jobs/:id
  DELETE /jobs/:id               (409 if Applications exist under it)

Applications
  POST   /jobs/:id/applications
  GET    /jobs/:id/applications  (filter by status; pagination)
  GET    /applications/:id
  PATCH  /applications/:id/status   (dedicated state-transition endpoint — no general PATCH /applications/:id)
  DELETE /applications/:id

Meta
  GET    /health                 (checks process + MongoDB connectivity)
```

## 5. Domain Invariants (frozen)

**Deletion policy — block, don't cascade:**
- `DELETE /companies/:id` → 409 if any Jobs reference it
- `DELETE /jobs/:id` → 409 if any Applications reference it
- Rationale: this is a learning project — one HTTP call silently fanning out into N deletes across 3 collections teaches the wrong instinct. Archival/soft-delete policies can be a future phase.

**Referential integrity (Mongoose does NOT enforce this — must be explicit in the service layer):**
```
Create Job:      validate companyId format → find Company → 404 if absent → create
Create Application: validate jobId format → find Job → 404 if absent → 409 if Job.status = closed → create
```

**ObjectId handling:**
| Situation | Status |
|---|---|
| id is not a valid ObjectId format | 400 |
| valid ObjectId, resource doesn't exist | 404 |
| valid resource | 200 |

**Application status state machine — only two transitions allowed:**
```
pending → reviewed   ✅
reviewed → rejected  ✅

pending → rejected   ❌
reviewed → pending   ❌
rejected → anything  ❌ (terminal state)
```
Enforced only via `PATCH /applications/:id/status`. There is intentionally no general `PATCH /applications/:id` — status is a domain operation, not an arbitrary field edit.

## 6. Filtering & Pagination Contract

```
?page=1&limit=20
page ≥ 1 (default 1)
1 ≤ limit ≤ 100 (default 20)

Jobs:
  location       → case-insensitive partial match
  employmentType → exact enum match
  status         → exact enum match

Applications:
  status → exact enum match
```

Response envelope for list endpoints:
```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 }
}
```

## 7. Project Structure

```
job-board-api/
├── src/
│   ├── config/        → env loading, db connection
│   ├── models/        → Company, Job, Application (Mongoose schemas + indexes)
│   ├── schemas/        → Zod schemas per resource (body, params, query)
│   ├── controllers/   → thin — parse request, call service, shape response
│   ├── services/        → domain logic: existence checks, delete constraints, state machine, cross-resource rules
│   ├── routes/         → route definitions
│   ├── middleware/    → validate middleware, error handler, not-found handler
│   ├── utils/          → ApiError class, async wrapper
│   └── server.js       → app entry
├── tests/
│   ├── unit/            → service-layer logic (state machine, delete rules)
│   └── integration/    → route-level API tests per resource
├── .env.example
└── package.json
```

**Layer responsibility (frozen):**
```
route → controller → service → model → MongoDB
```
Controllers coordinate. Services decide. Models persist. Middleware handles cross-cutting concerns (validation, logging, errors).

Zod and Mongoose are NOT redundant — Zod guards the HTTP boundary (body/params/query shape), Mongoose guards the persistence boundary (structure, defaults, casting). Neither replaces the other.

## 8. Indexes

| Collection | Index |
|---|---|
| Company | `name` |
| Job | `companyId`, `status`, `employmentType`, `location` |
| Application | compound `(jobId, status)` |

## 9. Error Handling Design

- Custom `ApiError` class (statusCode, code, message, optional details)
- Centralized Express error-handling middleware — every controller throws/passes errors here instead of handling inline
- Machine-readable error codes so clients don't parse message strings:
```json
{
  "success": false,
  "error": {
    "code": "COMPANY_NOT_FOUND",
    "message": "Company does not exist",
    "details": null
  }
}
```

## 10. HTTP Status Contract (frozen)

| Scenario | Status |
|---|---|
| Create (Company/Job/Application) | 201 |
| Successful GET | 200 |
| Successful PATCH | 200 |
| Successful DELETE | 204 |
| Invalid request body/query/params | 400 |
| Invalid ObjectId format | 400 |
| Resource not found | 404 |
| Conflict (delete blocked, closed job, invalid state transition) | 409 |
| Unexpected server failure | 500 |

## 11. Response Shape for Relations

Selective population only — never return nested chains (Job → Company → Jobs → ...).

```json
// GET /jobs/:id
{
  "id": "...",
  "title": "...",
  "company": { "id": "...", "name": "..." }
}
```

## 12. Swagger

Manually written Swagger/OpenAPI spec documenting every route (request/response examples, status codes). It documents the contract — it is not the source of truth. The source of truth is the Zod schemas + this PRD. No auto-generation tooling added this phase (unnecessary complexity for 3 resources).

## 13. Success Criteria (for this learning phase)

- [ ] All routes implemented and passing manual + automated tests
- [ ] Validation rejects bad body/query/params with 400 + clear machine-readable codes
- [ ] Referential integrity enforced in service layer (404s on invalid parent refs)
- [ ] Delete blocked with 409 when dependent resources exist
- [ ] Application status transitions enforced per state machine
- [ ] Pagination + filtering work per the defined contract, with `meta` in responses
- [ ] Centralized error handler catches all thrown errors, no unhandled crashes or leaked Mongoose errors
- [ ] Indexes created on filtered fields
- [ ] `/health` checks process + DB connectivity
- [ ] README with setup steps + example requests per endpoint
- [ ] Swagger UI live at `/api-docs`
- [ ] API deployed on Render with a public URL, connected to MongoDB Atlas
- [ ] Unit tests for service-layer domain logic (state machine, delete rules)
- [ ] Integration tests per resource (create/get/update/delete + key edge cases)

## 14. Explicitly Out of Scope (don't add, no matter how tempting mid-build)

Redis, Kafka, Docker Compose, Elasticsearch, BullMQ, WebSockets, GraphQL, repository pattern, CQRS, event sourcing, microservices, Kubernetes. Three resources do not need any of this.

## 15. Learning Outcomes Mapped

| Concept | Where practiced |
|---|---|
| Nested REST routes (bounded depth) | Company→Job, Job→Application |
| Relations without DB-enforced integrity | Mongoose `ref` + service-layer existence checks |
| Domain logic vs HTTP handling | Service layer separate from controllers |
| State machines | Application status transitions |
| Validation escalation | Simple (Company) → enums (Job) → format + state (Application) |
| Query/param/body validation | Zod schemas beyond just request bodies |
| Filtering/pagination contract | `/jobs`, `/applications` list endpoints |
| Error semantics | 400 vs 404 vs 409, machine-readable codes |
| Indexing for query patterns | Compound index on Application(jobId, status) |
| Testable API design | Unit + integration test suite |