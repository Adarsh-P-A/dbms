# Retrievo Lost & Found - Setup Guide

Complete setup instructions for running the Retrievo backend and frontend in Docker containers or with local development servers.

## Project Structure

```
dbms-project/
├── retrievo-backend/          # FastAPI backend service
├── docker-compose.yml         # Multi-container orchestration
├── Dockerfile                 # Nginx frontend container
├── conf/                      # Nginx configuration
├── static/                    # Frontend static assets (CSS, JS, images)
├── *.html                     # Frontend HTML pages
└── README.md                  # This file
```

## Prerequisites

- **Docker & Docker Compose**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop)
- **VS Code**: [Download here](https://code.visualstudio.com/)
- **Git**: For cloning repositories if needed
- **Node.js** (optional): Only needed for live server if not using Docker frontend

## Initial Setup

### 1. Clone the Backend Repository

```bash
git clone https://github.com/ItsThareesh/retrievo-backend.git retrievo-backend
```

### 2. Environment Configuration

The backend requires a `.env` file in the `retrievo-backend/` directory. 

Use the provided `.env.example` as a template to create your own `.env` file with the necessary credentials and configuration values.

## Running the Application

### Option 1: Docker Compose (Recommended)

Runs both backend, database, and frontend in Docker containers.

```bash
# From project root directory
docker-compose up --build

# Or run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

**Access points:**
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Frontend**: http://localhost

**Services started:**
- `retrievo-db` - PostgreSQL database (port 5432)
- `retrievo-backend` - FastAPI server (port 8000)
- `retrievo-frontend` - Nginx server (port 80)

### Option 2: Backend in Docker + Frontend with Live Server

Runs backend in Docker, serves frontend with VS Code Live Server extension.

#### Step 2a: Start Backend Only

```bash
# Navigate to project root
cd /path/to/dbms-project

# Start only the backend and database
docker compose up db backend
```

#### Step 2b: Install & Use Live Server Extension

1. **Install Live Server Extension** in VS Code:
   - Open Extensions (Cmd+Shift+X / Ctrl+Shift+X)
   - Search for "Live Server"
   - Install by Ritwick Dey

2. **Start Live Server**:
   - Open `index.html`
   - Right-click → "Open with Live Server"
   - Or use keyboard shortcut: Alt+L, Alt+O

3. **Configure for Backend Access**:
   - Live Server typically runs on `http://127.0.0.1:5500`
   - Your backend API will be at `http://localhost:8000`
   - Ensure CORS is properly configured in backend

**Access points:**
- **Frontend**: http://127.0.0.1:5500
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Option 3: Full Local Development (No Docker)

> [!NOTE]
> You must have PostgreSQL installed and running locally, and the database configured according to your `.env` settings. Otherwise the backend will fail to connect to the database.

For local Python development without Docker:

```bash
# Navigate to backend
cd retrievo-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (if needed)
alembic upgrade head

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then use Option 2b for the frontend (Live Server extension).

## Docker Compose Configuration Reference

The `docker-compose.yml` file defines three services:

```yaml
services:
  retrievo-db:
    # PostgreSQL 16 database
    # Port: 5432
    # Data persisted in named volume: postgres_data
    
  retrievo-backend:
    # FastAPI application
    # Port: 8000 (API)
    # Hot-reload enabled in development mode
    
  retrievo-frontend:
    # Nginx web server
    # Port: 80 (HTTP)
    # Serves static files and proxies API requests
```

**Key Features:**
- [x] Automatic health checks (database readiness)
- [x] Service dependency ordering
- [x] Volume mounting for live code reloading
- [x] Custom Docker network for service-to-service communication
- [x] Persistent database data 

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find what's using the port
lsof -i :8000    # Backend
lsof -i :5432    # Database
lsof -i :80      # Frontend

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Issue: Database Connection Failed

```bash
# Wait for database to be ready
docker-compose logs retrievo-db

# Reset database
docker-compose down -v  # Removes volumes
docker-compose up       # Fresh database
```

### Issue: Docker Image Build Failures

```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Development Workflow

### With Docker Compose

1. Make changes to backend code (auto-reloads)
2. Make changes to frontend HTML/CSS/JS (refresh browser)
3. Monitor logs: `docker-compose logs -f`

### With Live Server

1. Make changes to backend (auto-reloads in Docker)
2. Save frontend files (auto-refreshes in browser)
3. Check console for errors (F12 → Console tab)

## Next Steps

1. [x] Configure `.env` file with your credentials
2. [x] Start containers with `docker-compose up`
3. [x] Access API docs: http://localhost:8000/docs
4. [x] Access frontend: http://localhost (or Live Server URL)
5. [x] Test authentication with Google OAuth2

## Additional Resources

- **Backend README**: [retrievo-backend/README.md](./retrievo-backend/README.md)
- **API Documentation**: http://localhost:8000/docs (when running)
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Docker Docs**: https://docs.docker.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/