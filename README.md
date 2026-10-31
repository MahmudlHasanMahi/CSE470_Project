# EKPocket – Development Setup

## Requirements

- Git
- Docker Desktop (or Docker Engine)
- Docker Compose

## 1. Clone the Repository

```bash
git clone git@github.com:MahmudlHasanMahi/CSE470_Project.git
cd EKPocket
```

## 2. Start the Project

```bash
docker compose up --build
```

## 3. Access the Application

| Service          | URL                   |
| ---------------- | --------------------- |
| Frontend (React) | http://localhost:5173 |
| Backend (NestJS) | http://localhost:3000 |
| PostgreSQL       | localhost:5432        |

## 4. Stop the Project

```bash
docker compose down
```

## 5. View Logs

```bash
docker compose logs -f
```
