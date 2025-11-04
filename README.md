# CollabMate Backend API

This is the backend API for the CollabMate platform, built with Node.js, Express, and MySQL.

## Features

- User authentication (register/login with JWT)
- User management with skills
- Project creation and management
- Skill swap proposals and management
- MySQL database integration

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create a `.env` file in the backend directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=collabmate

PORT=3001
NODE_ENV=development

JWT_SECRET=your_secret_key_here
```

### 3. Set Up MySQL Database

#### Option 1: Using MySQL Workbench or Command Line

Run the SQL script to create the database schema:

```bash
mysql -u root -p < database/schema.sql
```

Or manually execute the SQL in `database/schema.sql` using MySQL Workbench or any MySQL client.

#### Option 2: Using the Migration Script

```bash
node database/migrations/createSchema.js
```

### 4. Start the Server

#### Development Mode (with auto-reload)

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id/availability` - Toggle user availability

### Projects

- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project (requires auth)
- `POST /api/projects/:id/join` - Join a project (requires auth)

### Skill Swaps

- `GET /api/skill-swaps` - Get all skill swaps for current user (requires auth)
- `GET /api/skill-swaps/:id` - Get skill swap by ID (requires auth)
- `POST /api/skill-swaps` - Propose skill swap (requires auth)
- `PATCH /api/skill-swaps/:id/status` - Update skill swap status (requires auth)

## Sample Data

The database schema includes sample data:
- 3 sample users (password: `password123`)
- 3 sample projects
- 2 sample skill swaps

You can use these credentials to test:
- alice@example.com / password123
- bob@example.com / password123
- charlie@example.com / password123

## JWT Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Database Schema

The database includes the following tables:
- `users` - User accounts
- `user_skills` - User skills (many-to-many)
- `projects` - Projects
- `project_skills` - Required skills for projects
- `project_members` - Project members
- `skill_swaps` - Skill swap proposals

## Error Handling

All endpoints return JSON responses:
- Success: 200/201 with data
- Error: 400/401/403/404/500 with error message

## Development

The project uses ES modules. Make sure your `package.json` has `"type": "module"`.

