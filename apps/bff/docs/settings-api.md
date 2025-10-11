# Settings API Documentation

This document describes the Settings API endpoints implemented in the BFF service.

## Users & Roles Management

### Get All Users
```
GET /settings/users
```
Returns a list of all users in the system.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "role": "ADMIN|MANAGER|STAFF",
      "firstName": "John",
      "lastName": "Doe",
      "active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get User by ID
```
GET /settings/users/:id
```
Returns a specific user by their ID.

### Create User
```
POST /settings/users
```
Creates a new user in the system.

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "ADMIN|MANAGER|STAFF",
  "firstName": "John",
  "lastName": "Doe",
  "active": true
}
```

### Update User
```
PATCH /settings/users/:id
```
Updates an existing user.

**Request Body:**
```json
{
  "email": "updated@example.com",
  "role": "MANAGER",
  "firstName": "Jane",
  "lastName": "Smith",
  "active": false
}
```

### Delete User
```
DELETE /settings/users/:id
```
Deletes a user from the system. Users with existing orders cannot be deleted.

## Audit Log

### Get Audit Log
```
GET /settings/audit?search=&entity=&action=&actor=&page=1&limit=50
```
Retrieves audit log entries with optional filtering and pagination.

**Query Parameters:**
- `search` (optional): Search term to filter entries
- `entity` (optional): Filter by entity type (e.g., "User", "MenuItem")
- `action` (optional): Filter by action type (e.g., "CREATE", "UPDATE", "DELETE")
- `actor` (optional): Filter by actor (user who performed the action)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of entries per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "audit_id",
        "actor": "admin@example.com",
        "entity": "User",
        "entityId": "user_id",
        "action": "CREATE",
        "diff": "{\"created\": {\"email\": \"user@example.com\"}}",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "pages": 2
    }
  }
}
```

## Feature Flags

### Get All Feature Flags
```
GET /settings/flags
```
Returns a list of all feature flags in the system.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "flag_id",
      "key": "enable_new_feature",
      "enabled": true,
      "description": "Enable the new feature for all users",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Feature Flag by Key
```
GET /settings/flags/:key
```
Returns a specific feature flag by its key.

### Create Feature Flag
```
POST /settings/flags
```
Creates a new feature flag.

**Request Body:**
```json
{
  "key": "enable_new_feature",
  "enabled": false,
  "description": "Enable the new feature for all users"
}
```

### Update Feature Flag
```
PATCH /settings/flags/:key
```
Updates an existing feature flag.

**Request Body:**
```json
{
  "enabled": true,
  "description": "Updated description"
}
```

### Delete Feature Flag
```
DELETE /settings/flags/:key
```
Deletes a feature flag from the system.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Audit Trail Integration

All write operations (CREATE, UPDATE, DELETE) automatically generate audit entries with:
- Actor information (currently "system", but would be the authenticated user in production)
- Entity type and ID
- Action performed
- Diff showing changes made (for updates) or data created/deleted

## Validation

All endpoints use Zod schemas for request validation:
- Email addresses are validated and normalized (trimmed, lowercase)
- User roles must be one of: ADMIN, MANAGER, STAFF
- Required fields are enforced
- String fields are trimmed of whitespace