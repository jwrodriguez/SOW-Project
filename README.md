# GroupS_CS4273_Spring2026

# SOW-Project

Our project consists of creating a robust tool that lets users assemble SOWs(Statement of Work) by selecting standardized template sections and adding custom inputs, then generates a fully formatted and professional final document.

## Technologies and Tools

**Next.js**

- Next.js is a React/JavaScript framework that will serve as the user-facing portion of the project. It'll be the UI and logic they interact with for creating templates, editing SoWs, etc..

**shadcn/ui**

- shadcn/ui is a popular UI library for most JavaScript frameworks. It has easy-to-use, accessible, well-designed UI components that are ready out of the box to integrate into our Next.js frontend.

**[python-docx](https://python-docx.readthedocs.io/en/latest/)**

- This is a Python tool that allows you to programmatically create Microsoft Word documents, which is a major feature required by the client. It'll be part of a backend service that takes data fed in by the Next.js frontend to then create .docx files and provide them to the user.

## Prerequisites

Before getting started, ensure you have the following installed:

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Node.js** (v18+) | JavaScript runtime | [nodejs.org](https://nodejs.org/en/download) |
| **npm** | Package manager | Included with Node.js |
| **Docker** | Runs PostgreSQL database | [docker.com](https://www.docker.com/products/docker-desktop/) |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-repo/SOW-Project.git
cd SOW-Project
```

### 2. Start the database

The PostgreSQL database runs in Docker:

```bash
docker-compose up -d db
```

This starts a PostgreSQL container on port `5432` using credentials from `.env`.

### 3. Set up environment variables

Navigate to the frontend and create your local environment file:

```bash
cd sow-creator
cp .env.example .env.local
```

The `.env.example` file contains all required variables with default values that work out of the box for local development.

> **Note:** `AUTH_SECRET` is required by NextAuth but for local development, any random string works fine. A secure cryptographic key is only necessary for production.

### 4. Install dependencies

```bash
npm install
```

### 5. Set up the database schema

Push the database schema:

```bash
npx drizzle-kit push
```

### 6. Seed test users

Create initial users in the database:

```bash
npx tsx db/seed.ts
```

This creates two test accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@sowizard.mil | password123 | ADMIN |
| user@sowizard.mil | password123 | USER |

### 7. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

---

## Quick Start (TL;DR)

```bash
# From project root
docker-compose up -d db

cd sow-creator
npm install
npx drizzle-kit push
npx tsx db/seed.ts
npm run dev
```

---

## Stopping Services

```bash
# Stop the dev server
Ctrl+C

# Stop the database
docker-compose down
```

---

## Production Build

```bash
npm run build
npm start
```

## Authors ✍️

### Contributors names

- Alex Teague - Product Owner - responsible for creating KanBanSystem tickets, reaching out to the client on behalf of the dev team, assigning tasks to other developers <br />
- Joseph Rodriguez - Quality Assurance - Manage the GitHub Repository, create and ensure proper testing, monitor the quality of the product <br />
- **Sprint Masters** - Responsible for Risk Management, Challanges, Lesson Learned sections of KanBanSystem for all tickets associated with their sprint <br />
  - Collin Sumrell <br />
  - Matthew Tran <br />
  - Steven Tran <br />
