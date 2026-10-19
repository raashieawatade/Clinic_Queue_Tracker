# Clinic Queue Tracker

A small full-stack web application that gives clinic patients a digital token and lets them see their queue position and estimated waiting time, while the receptionist manages the queue from a simple dashboard.

> This is a student project (CSTF Web Development). It is not production-grade medical software and stores no medical information.

## Problem

In many clinics, patients wait without knowing their position in the queue or how long they will have to wait. They crowd the reception desk asking "how long?", and receptionists have no simple tool to show queue progress.

## Solution

- Patients enter their name and phone number and receive a digital token (`A-01`, `A-02`, …).
- Patients open a status page that shows the token currently being served, how many patients are ahead of them and an estimated waiting time. The page refreshes automatically.
- The receptionist logs in and calls the next patient, marks patients as completed, or skips patients who are not present.

## Features

- Digital token generation (numbering restarts every day)
- Queue tracking with automatic refresh (polling every 8 seconds)
- Estimated waiting time (5 minutes per patient ahead)
- Receptionist login and dashboard
- Queue status management: `WAITING → CALLED → COMPLETED`, or `WAITING → SKIPPED`
- Validation on both frontend and backend, plus friendly error messages
- Responsive, mobile-friendly design

## Tech Stack

```text
Frontend : React (Vite), React Router, Axios, plain CSS
Backend  : Node.js, Express
Database : MongoDB with Mongoose
```

## Project Structure

```text
clinic-queue-tracker/
├── backend/
│   ├── config/db.js                  MongoDB connection
│   ├── controllers/
│   │   ├── queueController.js        Token, queue and status logic
│   │   └── authController.js         Receptionist login
│   ├── middleware/
│   │   ├── auth.js                   Signed session token + route guard
│   │   └── errorHandler.js           Friendly JSON errors
│   ├── models/
│   │   ├── Patient.js                Patient schema
│   │   └── Counter.js                Daily token counter
│   ├── routes/
│   │   ├── queueRoutes.js
│   │   └── authRoutes.js
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/               Header, Alert, StatusBadge, ProtectedRoute
│   │   ├── pages/                    Home, PatientToken, QueueStatus,
│   │   │                             ReceptionistLogin, ReceptionistDashboard
│   │   ├── services/                 API client, validation, local token storage
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── .env.example
└── README.md
```

## Installation

**Quick start:** with Node.js 18 or newer installed, run `npm start` in the project root (or double-click `start.bat`). It creates the `.env` files, installs dependencies, starts MongoDB, the backend and the frontend, and opens the app. See [How To Run.md](How%20To%20Run.md) for details.

The manual steps are below.

**Prerequisites:** Node.js 18 or newer, and MongoDB (MongoDB Community Server running locally, or a MongoDB Atlas cluster).

### Backend

```bash
cd backend
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
# then edit .env and set your own values
npm run dev
```

The API runs at `http://localhost:5000/api`.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm run dev
```

Then open `http://localhost:5173`.

## Environment Variables

### `backend/.env`

| Variable | Description |
| --- | --- |
| `PORT` | Port the API listens on (default `5000`) |
| `MONGO_URI` | MongoDB connection string, for example `mongodb://127.0.0.1:27017/clinic-queue` or an Atlas URI |
| `RECEPTIONIST_USERNAME` | Receptionist login username |
| `RECEPTIONIST_PASSWORD` | Receptionist login password (choose a strong one) |
| `AUTH_SECRET` | Long random string used to sign receptionist sessions |
| `CLIENT_URL` | *(optional)* Deployed frontend URL(s), comma-separated, to restrict CORS |

### `frontend/.env`

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API base URL, for example `http://localhost:5000/api` |

`.env` files are listed in `.gitignore` and must never be committed.

## API Documentation

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Health check |
| POST | `/queue/token` | Public | Generate a token. Body: `{ "name": "Rahul", "phone": "9876543210" }` |
| GET | `/queue/:token` | Public | Status of a token, e.g. `/queue/A-01` |
| POST | `/auth/login` | Public | Receptionist login. Body: `{ "username", "password" }` → `{ "token" }` |
| GET | `/queue` | Receptionist | Today's queue in token order |
| PUT | `/queue/next` | Receptionist | Call the next waiting patient |
| PUT | `/queue/:id/complete` | Receptionist | `CALLED → COMPLETED` |
| PUT | `/queue/:id/skip` | Receptionist | `WAITING → SKIPPED` |

Receptionist endpoints require the header `Authorization: Bearer <token from /auth/login>`.

### Example responses

`POST /queue/token` → `201`

```json
{ "tokenNumber": "A-27", "status": "WAITING" }
```

`GET /queue/A-27` → `200`

```json
{
  "tokenNumber": "A-27",
  "status": "WAITING",
  "currentToken": "A-22",
  "patientsAhead": 4,
  "estimatedWait": 20
}
```

`PUT /queue/next` with nobody waiting → `404`

```json
{ "message": "No waiting patients" }
```

### Status codes

| Code | Meaning |
| --- | --- |
| 200 / 201 | Success |
| 400 | Invalid input (missing name, bad phone, malformed token or id) |
| 401 | Not logged in or wrong receptionist credentials |
| 404 | Token or patient not found, or no waiting patients |
| 409 | Invalid status change (e.g. completing a patient who is still WAITING) |
| 500 | Unexpected server error (details are logged on the server only) |

## Queue Rules

- **Token numbers** come from an atomic per-day counter in MongoDB, so two patients registering at the same moment never get the same token. Numbering restarts at `A-01` each day.
- **Current token**: the patient whose status is `CALLED`. Only one patient is `CALLED` at a time.
- **Call next**: picks the earliest `WAITING` patient. If someone is already `CALLED`, they are automatically marked `COMPLETED` first, so the queue always moves forward.
- **Patients ahead**: the number of `WAITING` patients with an earlier token. Completed and skipped patients are not counted, and the patient currently being served is shown separately as "Currently Serving".
- **Estimated wait** = patients ahead × 5 minutes. It is shown as an estimate.

## Privacy & Security

- Only name and phone are stored. There are no medical records.
- The public status endpoint returns no names or phone numbers. The receptionist queue view shows names but not phone numbers.
- The patient's browser stores only their token number (in `localStorage`, for today only).
- Receptionist credentials are kept in environment variables. Login returns an HMAC-signed session token that expires after 12 hours.
- The backend validates all input, and database errors are never shown to users.

## Testing

### Manual scenarios

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | Valid name and phone | Token generated |
| 2 | Empty form | Validation errors |
| 3 | Several patients | `A-01`, `A-02`, `A-03`, … |
| 4 | Open queue status | Correct token, patients ahead and estimated wait |
| 5 | Call Next | First `WAITING` patient → `CALLED` |
| 6 | Complete | `CALLED → COMPLETED` |
| 7 | Skip | `WAITING → SKIPPED` |
| 8 | Call Next on an empty queue | "No waiting patients" |

### API testing

Use Postman or Thunder Client against the endpoints above. For receptionist endpoints, first call `POST /api/auth/login` and add the returned token as a Bearer token.

## Screenshots

_Add after final implementation:_ home page, token form, generated token, queue status, receptionist login, dashboard, dashboard after Call Next, MongoDB `patients` collection, Postman tests, and the deployed application.

## Deployment (optional)

- **Database:** MongoDB Atlas
- **Backend:** Render. Set `MONGO_URI`, `RECEPTIONIST_USERNAME`, `RECEPTIONIST_PASSWORD`, `AUTH_SECRET` and `CLIENT_URL`. Render provides `PORT`.
- **Frontend:** Vercel. Set `VITE_API_URL` to the deployed backend URL ending in `/api`. Because the app uses client-side routing, add a rewrite of all paths to `/index.html` (for example in a `vercel.json`).

## Limitations

- A single clinic queue with one receptionist account
- The wait time is a fixed estimate, not based on real consultation times
- Patients see updates by polling, not real-time push
