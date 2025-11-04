# CollabMate API Reference

Base URL: `http://localhost:3001`

## Authentication

All authenticated endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "skills": ["React", "Node.js", "Python"],
  "bio": "Full-stack developer"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "bio": "Full-stack developer",
    "avatar": "https://...",
    "available": true,
    "skills": ["React", "Node.js", "Python"]
  },
  "token": "eyJhbGc..."
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as register

---

## User Endpoints

### Get All Users
```http
GET /api/users
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "bio": "...",
    "avatar": "https://...",
    "available": true,
    "skills": ["React", "Node.js"]
  }
]
```

### Get User by ID
```http
GET /api/users/:id
```

**Response:** Single user object

### Toggle User Availability
```http
PATCH /api/users/:id/availability
```

**Response:**
```json
{
  "available": false
}
```

---

## Project Endpoints

### Get All Projects
```http
GET /api/projects
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Project Title",
    "description": "Project description",
    "creator_id": 1,
    "requiredSkills": ["React", "Node.js"],
    "members": [1, 2],
    "creator": {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "avatar": "https://..."
    }
  }
]
```

### Get Project by ID
```http
GET /api/projects/:id
```

### Create Project (Auth Required)
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Project",
  "description": "Project description",
  "requiredSkills": ["React", "Node.js"]
}
```

### Join Project (Auth Required)
```http
POST /api/projects/:id/join
Authorization: Bearer <token>
```

---

## Skill Swap Endpoints

### Get All Skill Swaps (Auth Required)
```http
GET /api/skill-swaps
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "from_user_id": 2,
    "to_user_id": 1,
    "offered_skill": "Python Basics",
    "requested_skill": "React Fundamentals",
    "message": "Want to swap?",
    "status": "pending",
    "fromUser": { ... },
    "toUser": { ... }
  }
]
```

### Get Skill Swap by ID (Auth Required)
```http
GET /api/skill-swaps/:id
Authorization: Bearer <token>
```

### Propose Skill Swap (Auth Required)
```http
POST /api/skill-swaps
Authorization: Bearer <token>
Content-Type: application/json

{
  "toUserId": 2,
  "offeredSkill": "React",
  "requestedSkill": "Python",
  "message": "Let's swap!"
}
```

### Update Skill Swap Status (Auth Required)
```http
PATCH /api/skill-swaps/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "accepted"  // or "declined"
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message"
}
```

**Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## Sample Credentials

You can use these sample users for testing:

| Email | Password |
|-------|----------|
| alice@example.com | password123 |
| bob@example.com | password123 |
| charlie@example.com | password123 |

