# Local Development Guide - Coverage Tracker

## Prerequisites

- Node.js 20+ 
- pnpm 10+ (installed via corepack)
- PostgreSQL 16 (via Docker)
- GitHub OAuth App credentials

## Quick Start

### 1. Start PostgreSQL

```bash
# Using Docker Compose
docker compose up -d postgres

# Or using the provided compose file
docker compose -f docker-compose-pg.yaml up -d
```

### 2. Set Up Environment Variables

```bash
cd packages/web
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coverage_tracker
BETTER_AUTH_SECRET=your-super-secret-random-string-min-32-chars
BETTER_AUTH_GITHUB_ID=your-github-oauth-app-id
BETTER_AUTH_GITHUB_SECRET=your-github-oauth-app-secret
RETENTION_FILE_DAYS=90
RETENTION_FULL_DAYS=365
```

### 3. Set Up GitHub OAuth

1. Go to GitHub → Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: Coverage Tracker (Local)
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3000/api/auth/callback/github
4. Save and copy the Client ID and Client Secret to your `.env`

### 4. Install Dependencies & Run Migrations

```bash
# From root directory
pnpm install

# Run database migrations
cd packages/web
pnpm db:migrate
```

### 5. Start the Development Server

```bash
# From root directory
pnpm dev
```

The app will be available at **http://localhost:3000**

## Testing the Application

### Test 1: Authentication

1. Visit http://localhost:3000
2. Click "Login with GitHub"
3. Authorize the application
4. You should be redirected to the dashboard

### Test 2: Create an Organization

1. If you have no organizations, you'll see a "Create Organization" button
2. Click it and enter an organization name (e.g., "My Test Org")
3. The page should refresh and show your organization

### Test 3: Create a Project

1. Click on your organization name
2. Click "+ New Project"
3. Fill in the form:
   - Name: "Test Project"
   - Repo URL: https://github.com/yourusername/test-repo (optional)
   - Language: TypeScript
   - Framework: Vitest
   - Coverage Tool: Vitest
4. Click "Create Project"

### Test 4: Generate API Key

1. Go to your project page
2. Click "API Keys" button
3. Enter a name (e.g., "CI Key")
4. Click "Create"
5. **Copy the API key immediately** (you won't see it again)

### Test 5: Upload Coverage Data

Create a test coverage file:

```bash
# Create a test coverage summary JSON
cat > /tmp/coverage-summary.json << 'EOF'
{
  "total": {
    "lines": { "total": 100, "covered": 85, "skipped": 0, "pct": 85 },
    "branches": { "total": 50, "covered": 30, "skipped": 0, "pct": 60 },
    "functions": { "total": 40, "covered": 37, "skipped": 0, "pct": 92.5 },
    "statements": { "total": 120, "covered": 102, "skipped": 0, "pct": 85 }
  },
  "src/index.ts": {
    "lines": { "total": 50, "covered": 45, "skipped": 0, "pct": 90 },
    "branches": { "total": 20, "covered": 12, "skipped": 0, "pct": 60 },
    "functions": { "total": 10, "covered": 10, "skipped": 0, "pct": 100 },
    "statements": { "total": 60, "covered": 54, "skipped": 0, "pct": 90 }
  }
}
EOF
```

Upload the coverage data:

```bash
# Replace PROJECT_ID with your actual project ID from the URL
# Replace API_KEY with your copied API key

curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "project_id=YOUR_PROJECT_ID" \
  -F "commit_sha=abc123" \
  -F "branch=main" \
  -F "pr_number=" \
  -F "coverage_summary=@/tmp/coverage-summary.json"
```

You should see a JSON response with:
- `runId`: The new run ID
- `coverage`: Coverage percentages
- `diffVsBase`: null (first run)
- `diffVsPrevious`: null (first run)

### Test 6: View Coverage in UI

1. Go back to your project page in the browser
2. You should see:
   - Coverage statistics cards showing 85% lines, 60% branches, etc.
   - A chart showing coverage over time
   - A table with the recent run

### Test 7: Test Authorization

**Test unauthorized access:**

```bash
# Try to access a project/run without being logged in
curl http://localhost:3000/api/projects/YOUR_PROJECT_ID
# Should return: {"error":"Unauthorized"}

# Try to upload with invalid API key
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer invalid-key" \
  -F "project_id=YOUR_PROJECT_ID" \
  -F "commit_sha=def456" \
  -F "branch=feature" \
  -F "coverage_summary=@/tmp/coverage-summary.json"
# Should return: {"error":"Invalid or expired API key"}
```

### Test 8: Upload Second Run (to test diffs)

Update the coverage file with different numbers:

```bash
cat > /tmp/coverage-summary2.json << 'EOF'
{
  "total": {
    "lines": { "total": 100, "covered": 90, "skipped": 0, "pct": 90 },
    "branches": { "total": 50, "covered": 35, "skipped": 0, "pct": 70 },
    "functions": { "total": 40, "covered": 38, "skipped": 0, "pct": 95 },
    "statements": { "total": 120, "covered": 108, "skipped": 0, "pct": 90 }
  }
}
EOF

curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "project_id=YOUR_PROJECT_ID" \
  -F "commit_sha=def456" \
  -F "branch=main" \
  -F "coverage_summary=@/tmp/coverage-summary2.json"
```

This time you should see `diffVsBase` and `diffVsPrevious` with positive deltas.

### Test 9: Test Organization Invite

1. Go to your organization page
2. In the "Invite Members" section, enter an email
3. Click "Generate Invite"
4. Copy the invite link
5. Open the link in an incognito window (you'll need to log in as a different GitHub user)
6. Click "Accept Invitation"

### Test 10: Run Tests

```bash
# Run all tests
pnpm test

# Run only unit tests (no database required)
cd packages/web && pnpm test -- --exclude="**/__test__/**"
```

## API Endpoints Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/*` | GET/POST | Session | Better Auth endpoints |
| `/api/organizations` | GET/POST | Session | List/create orgs |
| `/api/projects` | GET/POST | Session | List/create projects |
| `/api/projects/:id` | GET/DELETE | Session | Get/delete project |
| `/api/runs/:id` | GET | Session | Get run details |
| `/api/runs/:id/diff` | GET | Session | Compare runs |
| `/api/upload` | POST | API Key | Upload coverage |
| `/api/invite` | POST | Session | Create invite |
| `/api/invite/:id` | GET | Session | Get invite |
| `/api/invite/:id/accept` | POST | Session | Accept invite |

## Troubleshooting

### Database connection errors

Make sure PostgreSQL is running:
```bash
docker ps | grep postgres
```

If not running:
```bash
docker compose up -d postgres
```

### Migration errors

If migrations fail, try:
```bash
cd packages/web
pnpm db:push  # For development only
```

### GitHub OAuth errors

- Check that your callback URL is exactly: `http://localhost:3000/api/auth/callback/github`
- Make sure Client ID and Secret are correct in `.env`
- Ensure your GitHub OAuth App is not in "Draft" mode

### Port already in use

If port 3000 is taken:
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

Or change the port in `vite.config.ts`:
```typescript
server: {
  port: 3001,
}
```

## Next Steps

After local testing:

1. **Test the GitHub Action**: See `packages/action/README.md` for testing instructions
2. **Deploy to production**: Use the provided `docker-compose.yml`
3. **Set up CI/CD**: Integrate the GitHub Action into your projects

## Useful Commands

```bash
# View logs
docker compose logs -f web

# Reset database
docker compose down -v
docker compose up -d postgres
pnpm db:migrate

# Build for production
pnpm build

# Run linter
pnpm lint

# Type check
pnpm typecheck
```
