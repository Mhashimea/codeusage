# Afterburn API Documentation

This document describes the REST API endpoints for Afterburn.

**Base URL:** `https://app.afterburn.dev/api/v1` (production) or `http://localhost:3003/api/v1` (development)

---

## Authentication

Afterburn uses two authentication methods:

1. **API Key (Bearer Token)** - For CLI → API communication
2. **Session-based (NextAuth)** - For dashboard web app

### API Key Format

```
ab-ws-{36 hex characters}
```

Example: `ab-ws-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6`

### Using API Key

Include the API key in the `Authorization` header:

```http
Authorization: Bearer ab-ws-your-api-key-here
```

---

## Endpoints

### Task Ingestion

#### `POST /api/v1/tasks`

Ingest a task record from the CLI. This is the primary endpoint used by the Afterburn CLI to send telemetry data.

**Authentication:** API Key (Bearer Token)

**Rate Limit:** 100 requests per minute per workspace

**Request Headers:**
```http
Authorization: Bearer ab-ws-your-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "developer_alias": "john.doe",
  "project_slug": "my-project",
  "tool_source": "claude_code",
  "model_name": "claude-sonnet-4-5",
  "input_tokens": 1500,
  "output_tokens": 500,
  "cache_tokens": 1000,
  "cost_usd": 0.0075,
  "files_changed": 3,
  "tools_used": [
    { "name": "Edit", "count": 5 },
    { "name": "Read", "count": 10 },
    { "name": "Bash", "count": 2 }
  ],
  "task_duration_sec": 120,
  "hook_scope": "global",
  "cli_version": "0.1.0"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `developer_alias` | string | Yes | Developer identifier (1-100 chars) |
| `project_slug` | string | Yes | Project identifier (1-200 chars) |
| `tool_source` | enum | Yes | AI tool source: `claude_code` or `codex` |
| `model_name` | string | Yes | Model used (e.g., `claude-sonnet-4-5`) |
| `input_tokens` | integer | Yes | Number of input tokens (≥0) |
| `output_tokens` | integer | Yes | Number of output tokens (≥0) |
| `cache_tokens` | integer | Yes | Number of cache tokens (≥0) |
| `cost_usd` | number | Yes | Estimated cost in USD (0-50) |
| `files_changed` | integer | Yes | Number of files modified (≥0) |
| `tools_used` | array | Yes | Array of tool usage objects |
| `task_duration_sec` | integer | Yes | Task duration in seconds (≥0) |
| `hook_scope` | enum | Yes | Hook scope: `global` or `project` |
| `cli_version` | string | Yes | CLI version (1-50 chars) |

**Success Response (201 Created):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**

| Status | Description | Response |
|--------|-------------|----------|
| 400 | Invalid request body | `{ "error": "Invalid request body", "details": {...} }` |
| 400 | Cost exceeds threshold | `{ "error": "Task cost exceeds sanity threshold ($50)..." }` |
| 401 | Invalid/missing API key | `{ "error": "Invalid API key" }` |
| 429 | Rate limit exceeded | `{ "error": "Rate limit exceeded" }` + `Retry-After` header |
| 500 | Server error | `{ "error": "Internal server error" }` |

---

### API Key Validation

#### `GET /api/v1/auth/validate`

Validate an API key and retrieve workspace information. Used by the CLI during `afterburn init`.

**Authentication:** API Key (Bearer Token)

**Request Headers:**
```http
Authorization: Bearer ab-ws-your-api-key
```

**Success Response (200 OK):**
```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_name": "My Team",
  "plan": "free"
}
```

**Error Responses:**

| Status | Description | Response |
|--------|-------------|----------|
| 401 | Invalid/missing API key | `{ "error": "Invalid API key" }` |
| 500 | Server error | `{ "error": "Internal server error" }` |

---

### API Key Rotation

#### `POST /api/v1/workspaces/rotate-key`

Rotate the workspace API key. The old key is invalidated immediately.

**Authentication:** Session-based (Dashboard login required)

**Request Headers:**
```http
Cookie: next-auth.session-token=...
```

**Success Response (200 OK):**
```json
{
  "api_key": "ab-ws-new-key-here-abc123...",
  "message": "API key rotated successfully. Save this key - it won't be shown again."
}
```

**Error Responses:**

| Status | Description | Response |
|--------|-------------|----------|
| 401 | Not authenticated | `{ "error": "Unauthorized" }` |
| 500 | Server error | `{ "error": "Failed to rotate API key" }` |

---

### Workspace Update

#### `PATCH /api/v1/workspaces/update`

Update workspace settings (currently supports name only).

**Authentication:** Session-based (Dashboard login required)

**Request Headers:**
```http
Content-Type: application/json
Cookie: next-auth.session-token=...
```

**Request Body:**
```json
{
  "name": "New Workspace Name"
}
```

**Success Response (200 OK):**
```json
{
  "workspace": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "New Workspace Name",
    "plan": "free"
  }
}
```

**Error Responses:**

| Status | Description | Response |
|--------|-------------|----------|
| 400 | Invalid name | `{ "error": "Name is required" }` |
| 401 | Not authenticated | `{ "error": "Unauthorized" }` |
| 500 | Server error | `{ "error": "Failed to update workspace" }` |

---

### Developers List

#### `GET /api/v1/developers`

Get all developers who have submitted tasks to the workspace.

**Authentication:** Session-based (Dashboard login required)

**Request Headers:**
```http
Cookie: next-auth.session-token=...
```

**Success Response (200 OK):**
```json
{
  "developers": [
    {
      "developer_alias": "john.doe",
      "task_count": 150,
      "total_cost": "12.50",
      "last_active": "2024-03-15T10:30:00Z"
    },
    {
      "developer_alias": "jane.smith",
      "task_count": 200,
      "total_cost": "18.75",
      "last_active": "2024-03-15T09:15:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Description | Response |
|--------|-------------|----------|
| 401 | Not authenticated | `{ "error": "Unauthorized" }` |
| 500 | Server error | `{ "error": "Failed to fetch developers" }` |

---

### Live Task Feed (SSE)

#### `GET /api/v1/stream`

Server-Sent Events endpoint for real-time task notifications.

**Authentication:** Session-based (Dashboard login required)

**Request Headers:**
```http
Accept: text/event-stream
Cookie: next-auth.session-token=...
```

**Response Headers:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Types:**

**Connection Established:**
```
data: {"type":"connected"}
```

**New Task:**
```
data: {"type":"new_task","task":{"id":"...","developer_alias":"john.doe","project_slug":"my-project","cost_usd":"0.0075","input_tokens":1500,"output_tokens":500,"created_at":"2024-03-15T10:30:00.000Z"}}
```

**Heartbeat (every 30 seconds):**
```
: heartbeat
```

**Usage Example (JavaScript):**
```javascript
const eventSource = new EventSource('/api/v1/stream', {
  withCredentials: true
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_task') {
    console.log('New task:', data.task);
  }
};

eventSource.onerror = () => {
  console.error('SSE connection error');
};
```

---

### User Registration

#### `POST /api/auth/register`

Register a new workspace and user account.

**Authentication:** None (public endpoint)

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "workspaceName": "My Team",
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspaceName` | string | Yes | Workspace display name (1-100 chars) |
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Password (minimum 8 characters) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "workspace": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Team"
  }
}
```

**Error Responses:**

| Status | Description | Response |
|--------|-------------|----------|
| 400 | Validation error | `{ "error": "Invalid input" }` |
| 400 | Email exists | `{ "error": "An account with this email already exists" }` |
| 500 | Server error | `{ "error": "Internal server error" }` |

---

## Rate Limiting

The task ingestion endpoint (`POST /api/v1/tasks`) is rate limited to **100 requests per minute** per workspace.

When the rate limit is exceeded:
- HTTP Status: `429 Too Many Requests`
- Response: `{ "error": "Rate limit exceeded" }`
- Header: `Retry-After: <seconds>` indicating when to retry

---

## Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

For validation errors, additional details may be included:

```json
{
  "error": "Invalid request body",
  "details": {
    "field_name": {
      "_errors": ["Specific validation error"]
    }
  }
}
```

---

## Cost Estimation

The CLI calculates task costs using the following pricing (per 1M tokens):

| Model | Input | Output | Cache |
|-------|-------|--------|-------|
| `claude-opus-4` | $15.00 | $75.00 | $1.50 |
| `claude-sonnet-4-5` | $3.00 | $15.00 | $0.30 |
| `claude-haiku-4-5` | $0.80 | $4.00 | $0.08 |

The API rejects any task with `cost_usd > $50` as a sanity check against calculation errors.

---

## Data Privacy

The API collects **metadata only**:
- Token counts and costs
- Tool usage statistics
- File change counts
- Developer aliases and project slugs

The API does **not** collect:
- Prompt text or AI responses
- File contents or diffs
- Source code
- Any personally identifiable information beyond developer aliases
