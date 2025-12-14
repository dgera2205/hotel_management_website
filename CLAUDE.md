# 378625e7-3833-4ff4-9ee6-3baec4a915ab

> AI Agent Guidance File - This file provides context for AI assistants working on this codebase.

## Overview

Full-stack application generated with Boilerplate MCP Server.

## Tech Stack

- **Frontend**: Nextjs
- **Backend**: Fastapi
- **Database**: Postgres
- **Container**: Docker + Docker Compose
- **Proxy**: Nginx (routes `/` to frontend, `/api` to backend)
- **Authentication**: JWT

## Quick Commands

```bash
# Start all services (with build)
make up
# OR: docker-compose up --build

# Start in detached mode
make up-d
# OR: docker-compose up -d --build

# View logs
make logs
# OR: docker-compose logs -f

# View specific service logs
make logs-frontend
make logs-backend
make logs-db

# Stop all services
make down
# OR: docker-compose down

# Rebuild specific service
make rebuild-backend

# Open shell in container
make shell-backend

# Clean up (remove volumes and images)
make clean
```

## Project Structure

```
378625e7-3833-4ff4-9ee6-3baec4a915ab/
├── frontend/           # Frontend application
│   ├── Dockerfile
│   └── src/
├── backend/            # Backend API
│   ├── Dockerfile
│   └── src/
├── database/           # Database initialization
├── nginx/              # Reverse proxy config
├── instructions/       # Coding guidelines
├── docker-compose.yml  # Container orchestration
├── .env.example        # Environment template
├── Makefile            # Common commands
├── CLAUDE.md           # AI agent instructions (this file)
└── README.md           # Project documentation
```

## API Endpoints

All API endpoints are accessible at `http://localhost:16873/api/`

- `GET /health` - Health check
- `GET /` - Root endpoint
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user (requires auth)
- `POST /auth/refresh` - Refresh access token

## Environment Variables

`.env` is pre-configured with development defaults. For production, update these values:

```bash
DB_NAME=app_db
DB_USER=app_user
DB_PASSWORD=<secure_password>
JWT_SECRET=<min_32_char_secret>
NODE_ENV=development
CORS_ORIGINS=http://localhost:16873
```

## Coding Rules

### MUST Follow (Enforced)

1. **Never commit secrets** - Use `.env` files, never hardcode credentials
2. **Handle errors gracefully** - Always provide meaningful error messages
3. **Use type annotations** - TypeScript for frontend, type hints for Python
4. **Validate inputs** - Sanitize all user inputs at API boundaries
5. **Follow existing patterns** - Match the code style already in the project

### SHOULD Follow (Recommended)

1. Write tests for new functionality
2. Document public APIs with comments
3. Use async/await over callbacks
4. Keep functions small and focused (single responsibility)
5. Use meaningful variable and function names

### AVOID

1. `any` types in TypeScript without justification
2. Catching and swallowing exceptions silently
3. Hardcoded configuration values
4. N+1 database queries
5. Committing commented-out code

## Development Workflow

1. **Create feature branch**: `git checkout -b feature/your-feature`
2. **Start services**: `make up` or `docker-compose up --build`
3. **Make changes** - Hot reload is enabled for all services
4. **Test locally** - Verify changes work as expected
5. **Commit with clear message**:
   - `feat: add user profile page`
   - `fix: resolve login redirect issue`
   - `refactor: extract auth logic to service`
6. **Push and create PR**

## File Naming Conventions

### Frontend
- Components: `PascalCase.tsx` (e.g., `UserCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Styles: `kebab-case.css` or `ComponentName.module.css`

### Backend
- Python: `snake_case.py` (e.g., `user_service.py`)
- Go: `snake_case.go` (e.g., `user_handler.go`)
- TypeScript: `camelCase.ts` (e.g., `userService.ts`)

## Common Issues & Solutions

### Hot reload not working

**Windows/WSL2:**
- Ensure `CHOKIDAR_USEPOLLING=true` is set in environment
- The docker-compose.yml already includes this setting

**Mac (Docker Desktop):**
- Check Docker Desktop -> Settings -> Resources -> File Sharing
- Ensure project directory is in shared paths

**General:**
- Try restarting the service: `docker-compose restart frontend`
- Check container logs: `docker-compose logs -f frontend`

### Database connection failed

1. Wait for health check to pass: `docker-compose ps` should show "healthy"
2. Verify credentials in `.env` match the docker-compose configuration
3. Try restarting: `docker-compose restart db`

### Port already in use

```bash
# Find what's using the port
lsof -i :16873

# Kill the process or change GATEWAY_PORT in .env
```

### Container won't start

```bash
# Check logs for errors
docker-compose logs [service_name]

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

## Adding New Features

### Adding a New API Endpoint

1. Create route handler in `backend/routes/` (or equivalent)
2. Define request/response models
3. Add route to main router
4. Update this CLAUDE.md with new endpoint documentation
5. Test the endpoint

### Adding a New Frontend Page

1. Create component in appropriate directory
2. Add route configuration
3. Connect to API if needed
4. Add navigation link if applicable


## Next.js-Specific Guidelines

### App Router Conventions
- `page.tsx` - Route pages (Server Components by default)
- `layout.tsx` - Shared layouts
- `loading.tsx` - Loading UI
- `error.tsx` - Error boundaries
- `route.ts` - API routes

### Server vs Client Components
```tsx
// Server Component (default) - can use async/await
export default async function UsersPage() {
  const users = await db.users.findMany();
  return <UserList users={users} />;
}

// Client Component - for interactivity
'use client'
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Data Fetching
- Server Components: Fetch directly in component
- Client Components: Use `useEffect` or React Query
- Server Actions: For mutations


## FastAPI-Specific Guidelines

### Route Structure
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    name: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str

@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Implementation
    pass
```

### Dependency Injection
- Use `Depends()` for database sessions, auth, etc.
- Create reusable dependencies in `dependencies.py`

### Error Handling
```python
from fastapi import HTTPException

# Raise HTTP exceptions with appropriate status codes
raise HTTPException(status_code=404, detail="User not found")
```


## Testing

### Running Tests

```bash
# Backend tests
docker-compose exec backend pytest  # Python
docker-compose exec backend npm test  # Node.js
docker-compose exec backend go test ./...  # Go

# Frontend tests
docker-compose exec frontend npm test
```

### Writing Tests

- Place tests alongside code or in `tests/` directory
- Name test files: `test_*.py`, `*.test.ts`, `*_test.go`
- Use descriptive test names that explain the scenario

## Deployment Notes

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique passwords for database
- [ ] Generate secure JWT secret (32+ characters)
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS (use reverse proxy like Traefik or cloud load balancer)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Or for individual service
docker build --target production -t myapp-backend ./backend
```

---

*Generated with [Boilerplate MCP Server](https://github.com/your-repo/boilerplate-mcp)*
