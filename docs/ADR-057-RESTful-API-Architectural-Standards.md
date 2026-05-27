---
title: "ADR-057: RESTful API Architectural Standards"
status: "Accepted"
type: "Standards"
date: "2026-03-13"
description: "Establishes comprehensive standards for RESTful API design, focusing on security, versioning, and collection handling."
ai_metadata:
 domain: "Core"
 sourcing_priority: "High"
---

# ADR-057: RESTful API Architectural Standards

**Status**: Accepted 
**Type**: Standards 
**Date**: 2026-03-13 
**Decision Makers**: Development Team

## Revision History

| Date    | Author | Description   |
| ---------- | ------ | ---------------- |
| 2026-03-13 | Team  | Initial Creation |

**Governing Documents**:

- [ADR-002: React + Node.js REST/WebSocket Architecture](./ADR-002-React-NodeJS-REST-WebSocket.md)
- [ADR-004: UUID Version Strategy](./ADR-004-UUID-Version-Strategy.md)
- [ADR-054: Data Transfer Objects (DTOs)](./ADR-054-Data-Transfer-Objects.md)

---

## 1. Context

As the platform scales, the REST API must remain secure, predictable, and extensible. We require a unified set of architectural standards to guide the development of all current and future endpoints.

1. **Direct ID Exposure**: Using raw UUIDs in URLs allows for easy resource enumeration if not properly guarded.
2. **Versioning**: Lack of explicit versioning makes it impossible to introduce breaking changes without disrupting production clients.
3. **Consistency**: Inconsistent pagination, filtering, and casing across information domains increase frontend complexity.
4. **Abuse Prevention**: Without standardized rate-limiting, the API is vulnerable to brute-force and resource exhaustion.

## 2. Decision

We establish the following standards for all RESTful API endpoints.

### 2.1 API Versioning

- **Standard**: All routes MUST be prefixed with `/v1/` (e.g., `GET /api/v1/products`).
- **Implementation**: Managed via TSOA `@Route` decorators and Express server configuration.

### 2.2 Opaque Identifiers (Hashids)

- **Standard**: Public-facing URLs and JSON responses MUST use **Hashids** instead of raw internal IDs (UUIDs).
- **Strategy**:
 - Store internal data as UUIDs in the database.
 - Encode UUIDs into Hashids in the Controller layer before returning responses.
 - Decode Hashids back into UUIDs in the Controller layer when receiving requests.
- **Rationale**: Obfuscates the internal data structure and prevents easy resource enumeration.

### 2.3 Response Contracts & Casing

- **Standard**: All JSON payloads (Request and Response) MUST use **`snake_case`**.
- **Requirement**: DTO interfaces must follow this standard as per [ADR-054](./ADR-054-Data-Transfer-Objects.md).

### 2.4 Pagination & Collections

- **Standard**: All collection endpoints (e.g., `/v1/products`) MUST implement mandatory pagination.
- **Query Parameters**:
 - `page`: Current page number (default: 1).
 - `limit`: Items per page (default: 20, max: 100).
 - `sort`: Comma-separated fields (e.g., `?sort=-created_dtm,name`).
- **Response Format**:
 ```json
 {
  "data": [...],
  "meta": {
   "total": 150,
   "page": 1,
   "limit": 20,
   "total_pages": 8
  }
 }
 ```
- **HATEOAS Links**: Paginated responses **SHOULD** include a `Link` header populated with relational links (e.g., `rel="next"`, `rel="prev"`, `rel="first"`, `rel="last"`) for navigable collections.

### 2.5 Rate Limiting

- **Standard**: Implement tiered rate limiting to protect API resources.
- **Tiers**:
 - **Global**: 100 req/min/IP.
 - **Authenticated**: 500 req/min/user.
 - **Sensitive**: 5 req/min/IP (e.g., login, password reset).
- **Headers**: Responses MUST include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After`.
- **Status Code**: Strictly return `429 Too Many Requests` when limits are exceeded.

### 2.6 Resource Naming

- **Standard**: URIs MUST represent **resources (nouns)**, not actions (verbs).
- **Rule of Plurals**: Use **plural** nouns to denote collections or stores (e.g., `/users`, `/products`). Use singular labels only inside child document references.
- **No CRUD in URIs**: Never include CRUD function names (e.g., `get`, `create`, `update`, `delete`) in the URI path.
- **Action Strategy**: Use HTTP Methods (`GET`, `POST`, `PUT`, `DELETE`) to express the action:
 - `GET /users` (Fetch list)
 - `POST /users` (Create)
 - `PUT /users/{id}` (Replace/Update)
 - `DELETE /users/{id}` (Remove)
- **Action Sub-resources**: For non-CRUD actions (e.g., trigger process), model them as state updates or custom workflows sub-resources. Proprietary action keywords in paths are strictly bounded.

### 2.7 Caching

- **Standard**: Follow HTTP specification for response cacheability.
- **Methods Configuration**:
 - `GET`: Cacheable by default. Declared with `Cache-Control` or `ETag` matching payload revisions.
 - `POST`: Not cacheable by default, unless explicitly allowed via `Expires` thresholds.
 - `PUT` / `DELETE`: **Never cacheable**.
- **Values**: Dates in headers MUST be expressed in GMT.

### 2.8 Security Essentials

- **Design Principles**:
 - **Least Privilege**: Users and services operate on the minimum required permissions necessary set.
 - **Fail-Safe Defaults**: Access denied by default on all assets; permits require explicit policies.
 - **Economy of Mechanism**: Keep API endpoint routing and authorization logic simple, readable, and highly auditable.
 - **Complete Mediation**: Always validate authorization checks at the point of access rather than relying solely on front-door cached authorization matrices that can lapse.
- **Best Practice**: Use standard HTTPS always. Never include secrets or tokens in URL structures (Query parameters).

### 2.9 Idempotency

- **Standard**: API endpoints MUST adhere to HTTP specification idempotency rules to ensure fault-tolerance against network retries or duplicate client submissions.
- **Idempotent Methods** (Multi-invocation has same effect as single):
 - `GET`, `HEAD`, `OPTIONS`: Strictly safe and read-only.
 - `PUT`: Idempotent for replacement. Update cycles replace the full resource deterministic.
 - `DELETE`: Idempotent for removal. Repeated calls holding 204 or 404 still result in "no resource existing".
- **Non-Idempotent Methods** (Multi-invocation alters state iteratively):
 - `POST`: Create cycles generate duplicate objects upon re-trigger.
 - `PATCH`: Modifying delta offsets can compound incrementally if logic is absolute.

### 2.10 HTTP Status Codes

- **Standard**: Strictly consume specific HTTP status ranges to communicate outcome semantics uniformly.
- **Success (2xx)**:
 - `200 OK`: Successful action with a body representation (e.g., `GET`, `POST` process results).
 - `201 Created`: Successful creation inside a collection. **MUST** include a `Location` header to the new resource.
 - `202 Accepted`: Accepted for asynchronous/background processing. Returns status monitor addresses.
 - `204 No Content`: Successful execution with **no response body** (common for `DELETE`, `PUT`, or optional `POST` hooks).
- **Redirection (3xx)**:
 - `303 See Other`: Redirect client to a status monitor or permanent object reference relative to complete triggers.
 - `304 Not Modified`: Conditional cache hit header confirming payload is pristine on origin.
- **Client Error (4xx)**:
 - `400 Bad Request`: Generic malformed payload or structurally invalid client requests.
 - `401 Unauthorized`: Authentication missing or failing on protected assets.
 - `403 Forbidden`: Authentication valid, but user is explicitly **Denied access** by policy structure.
 - `404 Not Found`: The mapping URI doesn't match any active resource.
 - `405 Method Not Allowed`: HTTP method not supported on the resource. **MUST** include an `Allow` header listing supported methods.
 - `415 Unsupported Media Type`: The service cannot process the payload's `Content-Type`.
- **Server Error (5xx)**:
 - `500 Internal Server Error`: Generic unhandled backend exception.
 - `501 Not Implemented`: The server does not support the method functionality.

### 2.11 Content Negotiation

- **Standard**: Rely on **Agent-driven content negotiation** using standard HTTP request headers.
- **Headers to Support**:
 - `Accept`: Define representation format expected by the client (e.g., `application/json`, `application/xml`). Return `406 Not Acceptable` if unsupported.
 - `Content-Type`: Verify body structure from client uploads. Return `415 Unsupported Media Type` if unsupported.
### 2.11 Content Negotiation for Media Assets

To maintain RESTful consistency while supporting binary streaming, media endpoints (e.g., `GET /v1/media/:id`) MUST support content negotiation via the `Accept` header and the `q` (quality) parameter.

- **Metadata Retrieval**: `Accept: application/json` or `Accept: application/json; q=1.0`.
  - Returns the media item's metadata (id, name_i18n, file_name, etc.).
- **Binary Content Retrieval**: `Accept: application/octet-stream` or any binary mime-type (e.g., `image/png`) with a higher `q` factor than JSON.
  - Proxy-streams the file from underlying storage (Local, S3) to the client.

Example:
`Accept: image/*; q=1.0, application/json; q=0.5` -> Returns the **Binary Image**.
`Accept: application/json; q=1.0, */*; q=0.5` -> Returns the **Metadata JSON**.
The server MUST evaluate the `Accept` header and return the most appropriate representation based on priority.

### 2.12 HATEOAS (Hypermedia Links)

- **Standard**: APIs **MAY** provide hypermedia links in response payloads to allow clients to discover relationships and actions dynamically.
- **Goal**: Minimize hardcoded paths on endpoints controllers that are likely to shift layout trees beneath aggregates.

### 2.13 Statelessness

- **Standard**: REST API endpoints MUST operate as stateless standalone units.
- **Session state**: No client session affinity, sticky sessions, or side-conversation history shall be stored on the server node. All token context payloads pass on individual headers independently.
- **Application state**: Entirely client-managed. Servers manage Resource State strictly.

## 3. Consequences

### Positive

- **Security**: Opaque IDs and Rate Limiting significantly reduce the attack surface.
- **Compatibility**: Versioning allows for seamless transitions between API generations.
- **Interoperability**: `snake_case` ensures high compatibility with diverse clients and tools.

### Negative

- **Implementation Overhead**: Requires encoding/decoding logic in controllers.
- **Documentation**: All existing and new endpoints must be audited for compliance.

## 4. References

- [REST Architectural Constraints](https://restfulapi.net/rest-architectural-constraints/)
- [Q-Parameter in HTTP Accept Header](https://restfulapi.net/q-parameter-in-http-accept-header/)
- [Resource Naming Conventions](https://restfulapi.net/resource-naming/)
- [Caching REST API](https://restfulapi.net/caching/)
- [REST Resource Compression](https://restfulapi.net/rest-resource-compression/)
- [Content Negotiation](https://restfulapi.net/content-negotiation/)
- [HATEOAS Driven REST APIs](https://restfulapi.net/hateoas/)
- [Idempotent REST APIs](https://restfulapi.net/idempotent-rest-apis/)
- [Security Essentials](https://restfulapi.net/security-essentials/)
- [Versioning a REST API](https://restfulapi.net/versioning/)
- [Statelessness in REST](https://restfulapi.net/statelessness/)
- [Pagination, Sorting, and Filtering](https://restfulapi.net/api-pagination-sorting-filtering/)
- [Rate Limit Guidelines](https://restfulapi.net/rest-api-rate-limit-guidelines/)
- [REST API Design Tutorial](https://restfulapi.net/rest-api-design-tutorial-with-example/)
- [HTTP PUT vs. POST](https://restfulapi.net/rest-put-vs-post/)
- [HTTP Status Codes](https://restfulapi.net/http-status-codes/)
