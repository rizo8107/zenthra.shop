# PocketBase Automation Collections Schema

This document outlines the required PocketBase collections for the automation system.

## Collections Overview

The automation system requires 5 main collections:

1. **flows** - Store automation flow definitions
2. **runs** - Track execution instances of flows
3. **run_steps** - Store individual step execution details
4. **connections** - Store external service connection configurations
5. **events** - Store events for replay and testing

## Collection Schemas

### 1. flows

**Purpose**: Store automation flow definitions with canvas data

| Field | Type | Required | Options | Description |
|-------|------|----------|---------|-------------|
| `name` | text | ✓ | min: 1, max: 255 | Flow display name |
| `description` | text | ✗ | max: 1000 | Flow description |
| `status` | select | ✓ | `draft`, `active`, `archived` | Flow status (default: `draft`) |
| `version` | number | ✓ | min: 1 | Flow version number (default: 1) |
| `canvas_json` | json | ✓ | | Flow canvas data (nodes, edges) |
| `created_by` | relation | ✗ | → `users` | User who created the flow |

**Indexes**:
- `status` (for filtering)
- `created_by` (for user-specific flows)

**API Rules**:
- List/View: `@request.auth.id != ""`
- Create/Update/Delete: `@request.auth.id != ""`

### 2. runs

**Purpose**: Track execution instances of automation flows

| Field | Type | Required | Options | Description |
|-------|------|----------|---------|-------------|
| `flow_id` | relation | ✓ | → `flows` | Reference to the flow |
| `trigger_type` | text | ✓ | | Type of trigger (`cron`, `webhook`, `manual`) |
| `status` | select | ✓ | `queued`, `running`, `success`, `failed`, `canceled` | Execution status |
| `started_at` | date | ✓ | | When execution started |
| `finished_at` | date | ✗ | | When execution finished |
| `error` | text | ✗ | max: 2000 | Error message if failed |
| `test_mode` | bool | ✓ | | Whether this is a test run (default: `false`) |
| `input_event` | json | ✗ | | Input data that triggered the flow |

**Indexes**:
- `flow_id` (for flow-specific runs)
- `status` (for filtering by status)
- `started_at` (for chronological ordering)

**API Rules**:
- List/View: `@request.auth.id != ""`
- Create: `@request.auth.id != ""`
- Update/Delete: `@request.auth.id != ""`

### 3. run_steps

**Purpose**: Store individual step execution details within a run

| Field | Type | Required | Options | Description |
|-------|------|----------|---------|-------------|
| `run_id` | relation | ✓ | → `runs` | Reference to the run |
| `node_id` | text | ✓ | max: 255 | Node ID from the flow canvas |
| `node_type` | text | ✓ | max: 100 | Type of node (`trigger`, `action`, `condition`, etc.) |
| `status` | select | ✓ | `pending`, `queued`, `running`, `success`, `failed`, `canceled` | Step status |
| `started_at` | date | ✓ | | When step started |
| `finished_at` | date | ✗ | | When step finished |
| `input` | json | ✗ | | Input data for this step |
| `output` | json | ✗ | | Output data from this step |
| `error` | text | ✗ | max: 2000 | Error message if failed |

**Indexes**:
- `run_id` (for run-specific steps)
- `node_id` (for node-specific lookups)

**API Rules**:
- List/View: `@request.auth.id != ""`
- Create/Update: `@request.auth.id != ""`
- Delete: `@request.auth.id != ""`

### 4. connections

**Purpose**: Store external service connection configurations

| Field | Type | Required | Options | Description |
|-------|------|----------|---------|-------------|
| `name` | text | ✓ | min: 1, max: 255 | Connection display name |
| `type` | select | ✓ | `razorpay`, `evolution`, `smtp`, `webhook`, `database` | Connection type |
| `config` | json | ✓ | | Connection configuration (encrypted sensitive data) |
| `scoped_to_user` | relation | ✗ | → `users` | User-specific connection (optional) |
| `workspace` | relation | ✗ | → `workspaces` | Workspace-specific connection (if multi-tenant) |

**Indexes**:
- `type` (for filtering by connection type)
- `scoped_to_user` (for user-specific connections)

**API Rules**:
- List/View: `@request.auth.id != ""`
- Create/Update/Delete: `@request.auth.id != ""`

### 5. events

**Purpose**: Store events for replay and testing (optional but recommended)

| Field | Type | Required | Options | Description |
|-------|------|----------|---------|-------------|
| `name` | text | ✓ | max: 255 | Event name/type |
| `payload` | json | ✓ | | Event data payload |
| `source` | text | ✓ | max: 100 | Event source (`webhook`, `cron`, `manual`, `pb`) |
| `correlation_id` | text | ✗ | max: 255 | Correlation ID for tracking |
| `processed` | bool | ✓ | | Whether event has been processed (default: `false`) |

**Indexes**:
- `source` (for filtering by source)
- `processed` (for finding unprocessed events)
- `created` (for chronological ordering)

**API Rules**:
- List/View: `@request.auth.id != ""`
- Create: `@request.auth.id != ""`
- Update/Delete: `@request.auth.id != ""`

## Setup Instructions

### Option 1: Manual Setup via PocketBase Admin UI

1. Open PocketBase Admin UI: `http://127.0.0.1:8090/_/`
2. Go to "Collections" → "New Collection"
3. Create each collection with the fields specified above
4. Set the API rules as specified
5. Create the recommended indexes

### Option 2: Programmatic Setup (Recommended)

Create a migration script or use PocketBase's JavaScript hooks to set up the collections:

```javascript
// Example migration script
migrate((db) => {
  // Create flows collection
  const flows = new Collection({
    name: "flows",
    type: "base",
    schema: [
      {
        name: "name",
        type: "text",
        required: true,
        options: { min: 1, max: 255 }
      },
      {
        name: "description",
        type: "text",
        required: false,
        options: { max: 1000 }
      },
      {
        name: "status",
        type: "select",
        required: true,
        options: {
          values: ["draft", "active", "archived"],
          default: "draft"
        }
      },
      {
        name: "version",
        type: "number",
        required: true,
        options: { min: 1, default: 1 }
      },
      {
        name: "canvas_json",
        type: "json",
        required: true
      },
      {
        name: "created_by",
        type: "relation",
        required: false,
        options: { collectionId: "users" }
      }
    ]
  });
  
  return dao.saveCollection(flows);
});
```

### Option 3: Import Schema

You can also export/import the schema using PocketBase's backup/restore functionality once you've set up the collections manually.

## Testing the Setup

After creating the collections, test the setup by:

1. Starting the Backend CMS: `cd Backend && npm run dev`
2. Navigate to `/admin/automation`
3. Try creating a new flow
4. Verify the flow appears in the PocketBase admin UI

## Security Considerations

- **Connection configs**: Sensitive data in the `connections.config` field should be encrypted
- **API Rules**: Ensure proper authentication rules are set
- **User Scoping**: Consider adding user-specific access controls if needed
- **Rate Limiting**: Implement rate limiting for automation execution

## Performance Recommendations

- **Indexes**: Create indexes on frequently queried fields
- **Cleanup**: Implement cleanup jobs for old runs and steps
- **Pagination**: Use pagination for large result sets
- **Caching**: Consider caching frequently accessed flows

## Next Steps

1. Set up the collections using one of the methods above
2. Test the automation pages in the Backend CMS
3. Implement the execution engine (separate from UI)
4. Add webhook endpoints for triggering flows
5. Implement connection management UI
