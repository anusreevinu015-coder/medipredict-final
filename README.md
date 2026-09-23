# Medipredict

AI-assisted healthcare management platform focused on Tamil Nadu, India. Patients
can manage their profile and medical history, upload medical reports for OCR
extraction, talk to an AI health assistant, get an AI-assisted health assessment,
find recommended hospitals, book appointments, and leave feedback. Administrators
manage hospitals, departments, doctors, appointments and feedback.

## Architecture

| Layer     | Stack                                        | Folder    |
| --------- | -------------------------------------------- | --------- |
| Frontend  | React 18, TypeScript, Vite, React Router     | `client/` |
| Backend   | Node.js, Express 4, TypeScript, Zod          | `server/` |
| Database  | PostgreSQL (`pg` connection pool)            | `server/` |
| Auth      | Server-side opaque sessions in HTTP-only cookies | both   |

- **Secure by default**: passwords hashed with bcrypt (12 rounds), session
  tokens stored only as HMAC hashes in PostgreSQL, sessions sent in `httpOnly`
  cookies, per-route role guards (`patient` / `admin`).
- **Credentials live only on the server** via environment variables — never in
  frontend code. The React app talks to the API through a same-origin Vite dev
  proxy, so the cookie works with no CORS friction.
- **Safe production errors**: the API logs full error details server-side and
  returns generic messages to clients in production — no raw error messages,
  stack traces, or database details are exposed.

## Implemented features

| Feature                    | Description                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Patient authentication     | Signup / login / logout, server-side session cookies, per-role route guards                    |
| Patient profile            | Name, email, phone, date of birth, gender, address                                             |
| Medical history            | Conditions, allergies, medications, surgeries, family history, notes                           |
| Medical reports / OCR      | Upload PDF / JPG / JPEG / PNG (10 MB max); OCR extraction of lab values, report date, diagnoses and medicines; patient review + confirm flow |
| AI healthcare chatbot      | Chat assistant that asks follow-up questions and flags emergency symptoms                      |
| AI-assisted assessment     | Maps symptoms / confirmed report findings to a likely specialty and produces an assessment     |
| Hospital recommendation    | Search a catalog of Tamil Nadu hospitals, filtered by specialty and location (district / city) |
| Hospital / doctor management | Admins manage hospitals, departments and doctors per hospital                                 |
| Appointments               | Patients book with a hospital / department / doctor; admins approve, reject or complete       |
| Feedback / ratings         | Patients rate (1–5) and comment on hospitals / appointments; admins moderate                  |
| Admin dashboard            | Appointment management, feedback moderation, hospital / doctor management                      |

## Prerequisites

- Node.js 20+ (tested on 24)
- npm 10+
- A running PostgreSQL server (local install or Docker)

## Quick start

```bash
# 1. Install all dependencies (npm workspaces)
npm install

# 2. Configure environment
cd server
copy .env.example .env          # Windows (PowerShell)
# or: cp .env.example .env      # macOS / Linux
# then edit .env:
#   - DATABASE_URL  -> your PostgreSQL connection string
#   - SESSION_SECRET -> a random string of 32+ chars
cd ..

# 3. Create the database schema (users, sessions, hospitals, doctors, etc.)
npm run db:init
```

Start everything (backend on :5000, frontend on :5173):

```bash
npm run dev
```

Open **http://localhost:5173**.

Then use the API directly or browse:

- `http://localhost:5000/api/health` — health check
- `http://localhost:5000/api/auth/me` — current session (auth cookie)

## Demo admin account

Created by `db:init`:

- Email: `admin@medipredict.app`
- Password: `admin123`

Change the password or delete this account in production. Patients register
through the signup page. Seed hospital data is applied by `db:init` from
`server/src/db/seed-hospitals.sql`.

## Useful scripts (run from the repo root)

| Command                          | What it does                                    |
| -------------------------------- | ----------------------------------------------- |
| `npm run dev`                    | Run API + Vite dev server together              |
| `npm run dev:server`             | Run only the API (`tsx watch`)                  |
| `npm run dev:client`             | Run only the Vite dev server                    |
| `npm run build`                  | Type-check + build server and client            |
| `npm run typecheck`              | Type-check both workspaces                      |
| `npm run db:init`                | Apply `server/src/db/schema.sql` + seed data    |
| `npm run start`                  | Run the built API (`server/dist`, after build)  |

## Environment variables (`server/.env`)

| Variable         | Default                                          | Purpose                             |
| ---------------- | ------------------------------------------------ | ----------------------------------- |
| `PORT`           | `5000`                                           | API port                            |
| `NODE_ENV`       | `development`                                    | `production` enables secure cookies + generic error responses |
| `DATABASE_URL`   | `postgres://postgres:postgres@localhost:5432/medipredict` | PostgreSQL connection string |
| `SESSION_SECRET` | *(required, ≥32 chars)*                          | Signs/HMACs session tokens          |
| `CLIENT_ORIGIN`  | `http://localhost:5173`                          | CORS allowed origin                 |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Folder structure

```
medipredict/
├─ server/                        # Express API
│  ├─ .env.example                # Template for server/.env (never commit .env)
│  └─ src/
│     ├─ config/                  # env parsing, PostgreSQL pool
│     ├─ controllers/             # request handlers (auth, patient, chat, etc.)
│     ├─ db/schema.sql            # DDL applied by npm run db:init
│     ├─ db/seed-hospitals.sql    # Seed data for Tamil Nadu hospitals
│     ├─ middlewares/             # session auth, role guards, errors
│     ├─ models/                  # SQL data access (users, sessions, reports, ...)
│     ├─ routes/                  # API route mounting
│     ├─ scripts/                 # maintenance scripts (init-db)
│     ├─ services/                # AI assistant (rule-based), OCR extraction
│     ├─ types/                   # shared TS types + Express augmentation
│     ├─ utils/                   # hashing, session cookie, report upload helpers
│     ├─ app.ts                   # app assembly (middleware, routes)
│     └─ index.ts                 # bootstrap / server start
│
├─ client/                        # React SPA
│  └─ src/
│     ├─ api/                     # fetch wrappers (auth, patient, chat, ...)
│     ├─ components/              # ProtectedRoute, Layout
│     ├─ context/                 # AuthContext (session state)
│     ├─ pages/                   # Landing, Auth, patient + admin dashboards
│     ├─ types/                   # shared client types
│     ├─ App.tsx                  # routes + guards
│     └─ main.tsx                 # React root
│
├─ package.json                   # npm workspaces + convenience scripts
└─ README.md
```

## API endpoints

### Public / shared

| Method | Path                | Auth        | Description                              |
| ------ | ------------------- | ----------- | ---------------------------------------- |
| POST   | `/api/auth/signup`  | public      | Register a patient, starts a session     |
| POST   | `/api/auth/login`   | public      | Login (patient or admin), sets cookie    |
| POST   | `/api/auth/logout`  | public      | Destroys session, clears cookie          |
| GET    | `/api/auth/me`      | public      | Returns current user or `null`           |
| GET    | `/api/health`       | public      | API health check                         |
| GET    | `/api/dashboard`    | any session | Role-aware home routing (`admin` / `patient`) |

### Patient (`/api/patient/*` — session + role `patient`)

| Method | Path                          | Description                                        |
| ------ | ----------------------------- | -------------------------------------------------- |
| GET    | `/profile`                    | Get the patient's profile                          |
| PUT    | `/profile`                    | Update the patient's profile                       |
| GET    | `/medical-history`            | Get the patient's medical history                  |
| PUT    | `/medical-history`            | Update the patient's medical history               |
| GET    | `/reports`                    | List the patient's uploaded reports                |
| POST   | `/reports`                    | Upload a report (multipart `file`, ≤10 MB) + extract values |
| GET    | `/reports/:id/file`           | Download an uploaded report file                   |
| PUT    | `/reports/:id/extraction`     | Save corrected extraction values (draft)           |
| POST   | `/reports/:id/confirm`        | Confirm extraction so the AI can use it            |
| GET    | `/appointments`               | List the patient's appointments                    |
| POST   | `/appointments`               | Book an appointment with a hospital / doctor       |
| GET    | `/feedback`                   | List the patient's feedback                        |
| POST   | `/feedback`                   | Submit a rating (1–5) and comment                  |

### Chat / AI assistant (`/api/chat/*` — patient)

| Method | Path                | Description                                              |
| ------ | ------------------- | -------------------------------------------------------- |
| GET    | `/messages`         | List chat history                                        |
| POST   | `/messages`         | Send a message → assistant replies (emergency flagging)  |
| POST   | `/assessment`       | Generate an AI-assisted health assessment                |

### Hospitals (`/api/hospitals/*` — patient)

| Method | Path                            | Description                                            |
| ------ | ------------------------------- | ------------------------------------------------------ |
| GET    | `/recommendations`              | Recommended hospitals by `specialty` (+ optional `location` / `city`) |
| GET    | `/catalog`                      | Full hospital catalog (hospitals, departments, doctors) |

### Admin (`/api/admin/*` — session + role `admin`)

| Method | Path                                    | Description                         |
| ------ | --------------------------------------- | ----------------------------------- |
| GET    | `/appointments`                          | List all appointments               |
| PATCH  | `/appointments/:id/status`               | Approve / reject / complete, etc.   |
| GET    | `/feedback`                              | List all feedback                   |
| DELETE | `/feedback/:id`                          | Remove inappropriate feedback       |
| GET    | `/hospitals`                             | List hospitals for management       |
| POST   | `/hospitals`                             | Add a hospital                      |
| PUT    | `/hospitals/:id`                         | Edit a hospital                     |
| DELETE | `/hospitals/:id`                         | Delete a hospital                   |
| POST   | `/hospitals/:id/departments`             | Add a department                    |
| PUT    | `/hospitals/:id/departments/:departmentId` | Edit a department                |
| DELETE | `/hospitals/:id/departments/:departmentId` | Delete a department              |
| POST   | `/hospitals/:id/doctors`                 | Add a doctor                        |
| PUT    | `/hospitals/:id/doctors/:doctorId`       | Edit a doctor                       |
| DELETE | `/hospitals/:id/doctors/:doctorId`       | Delete a doctor                     |

## Notes & roadmap

- The AI assistant is currently a deterministic, rule-based implementation
  (`server/src/services/assistant.ts`). Emergency symptom detection warns
  patients to seek urgent care; the assessment maps symptoms and confirmed
  report values to a recommended specialty and next steps.
- Hospital data is seeded for Tamil Nadu cities/districts and is editable from
  the admin dashboard.
- A future phase can swap in an OpenAI-backed provider behind the existing
  `AssistantProvider` interface without touching routes, controllers, or the
  client.