# How To Run — Clinic Queue Tracker

## Quick start (recommended)

The only thing you need installed is **Node.js 18 or newer** (https://nodejs.org).

**Double-click `start.bat`** in the project folder, or run this from the project folder:

```bash
npm start
```

That single command:

1. Creates `backend/.env` and `frontend/.env` if they are missing. A random receptionist password and auth secret are generated for you.
2. Installs backend and frontend dependencies if they are missing.
3. Starts MongoDB. It uses one that is already running on port 27017 if there is one, otherwise the bundled server in `mongodb/bin/mongod.exe`. Data is saved in `mongodb/data/`, so the queue survives restarts.
4. Starts the backend API on http://localhost:5000.
5. Starts the frontend on http://localhost:5173 and opens it in your browser.

When it's ready you'll see:

```text
==========================================================
  Clinic Queue Tracker is running
  App:          http://localhost:5173
  API:          http://localhost:5000/api/health
  Receptionist: username "reception"
                password is RECEPTIONIST_PASSWORD in backend/.env
  Press Ctrl + C to stop everything.
==========================================================
```

Press **Ctrl + C** (or close the window) to stop MongoDB, the backend and the frontend together.

### Receptionist login

- **Username:** `reception`
- **Password:** open `backend/.env` and use the value of `RECEPTIONIST_PASSWORD`. You can change both values there; restart the app afterwards.

### Project commands

Run these from the project root folder:

| Command | What it does |
| --- | --- |
| `npm start` | Set up anything missing and start the whole app |
| `npm start -- --no-browser` | Same, without opening the browser |
| `npm run setup` | Only do setup (env files, dependencies, MongoDB) without starting |
| `npm run setup -- --force` | Reinstall all dependencies |
| `npm run build` | Production build of the frontend into `frontend/dist` |

### On a new computer

`mongodb/` is not committed to Git because it is large. On a fresh copy of the project, `npm start` checks for MongoDB in this order:

1. A MongoDB server already running on port 27017 (for example an installed MongoDB service)
2. `mongod` on the system PATH
3. The bundled `mongodb/bin/mongod.exe`
4. Otherwise, on Windows it downloads the official MongoDB 7.0.14 server from `fastdl.mongodb.org`. This is about 600 MB, one time only, and only `mongod.exe` is kept.

---

## Using the application

| Page | URL | Who |
| --- | --- | --- |
| Home | http://localhost:5173/ | Everyone |
| Get Token | http://localhost:5173/token | Patient |
| Queue Status | http://localhost:5173/status | Patient |
| Receptionist Login | http://localhost:5173/receptionist/login | Receptionist |
| Dashboard | http://localhost:5173/receptionist | Receptionist (after login) |

**Patient:** Get Patient Token → enter name and phone → Get Token → View Queue Status. The status page refreshes automatically every few seconds.

**Receptionist:** Receptionist Login → enter the username and password from `backend/.env` → Dashboard → **Call Next**, **Complete** or **Skip**.

---

## Demo flow (for presentation)

1. Open http://localhost:5173 and click **Get Patient Token**.
2. Enter `Rahul` / `9876543210`. Token **A-01** is generated.
3. Create a few more patients (A-02, A-03, A-04). A private/incognito window makes it easy to act as a different patient.
4. Open the status page for **A-04**. It shows 3 patients ahead and about 15 minutes of waiting.
5. In another window, log in as receptionist and open the dashboard.
6. Click **Call Next**. A-01 becomes **CALLED**.
7. Click **Complete**. A-01 becomes **COMPLETED**.
8. Go back to A-04's status page. Within a few seconds the number of patients ahead and the estimated wait go down.
9. Click **Skip** on a waiting patient to show the **SKIPPED** status.

> **Start a demo from A-01 again:** token numbers restart every day. To reset on the same day, stop the app, delete the `mongodb/data` folder and run `npm start` again. This erases all queue data.

---

## Testing the API (Postman / Thunder Client)

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Body / Header |
| --- | --- | --- |
| GET | `/health` | none |
| POST | `/queue/token` | `{ "name": "Rahul", "phone": "9876543210" }` |
| GET | `/queue/A-01` | none |
| POST | `/auth/login` | `{ "username": "...", "password": "..." }` |
| GET | `/queue` | Header `Authorization: Bearer <token>` |
| PUT | `/queue/next` | Header `Authorization: Bearer <token>` |
| PUT | `/queue/<patientId>/complete` | Header `Authorization: Bearer <token>` |
| PUT | `/queue/<patientId>/skip` | Header `Authorization: Bearer <token>` |

For the receptionist endpoints, first call `POST /auth/login`, copy the `token` from the response, and add it as a **Bearer Token** under the Authorization tab. Patient ids (`_id`) come from `GET /queue`.

To view the stored data, install **MongoDB Compass** and connect to `mongodb://127.0.0.1:27017` while the app is running. Open the `clinic-queue` database and then the `patients` collection.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Port 5000 (backend) is already in use` / `Port 5173 ...` | The app is probably already running in another window. Close that window, or stop the program using that port. |
| `MongoDB did not start` | Read `mongodb/data/mongod.log`. If MongoDB was force-closed, deleting `mongodb/data/mongod.lock` usually fixes it. |
| App shows "Unable to reach the server" | The backend is not running. Start the app again with `npm start`. |
| Login says "Invalid username or password" | Use the values in `backend/.env`. If you changed them, restart the app. |
| Login says "Receptionist login is not configured" | `RECEPTIONIST_USERNAME` / `RECEPTIONIST_PASSWORD` are missing from `backend/.env`. Delete `backend/.env` and run `npm start` to regenerate it. |
| Home page shows an old token that is "not found" | Tokens are valid for one day, and the queue data may have been reset. Get a new token. |
| `'node' is not recognized` / `'npm' is not recognized` | Install Node.js from https://nodejs.org and reopen the terminal. |
| PowerShell says running scripts is disabled | Double-click `start.bat` instead, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. |
| Dependencies seem broken | Run `npm run setup -- --force`. |

---

## Manual start (alternative)

If you prefer to run each part yourself in separate terminals:

1. Make sure MongoDB is running on port 27017. You can use the bundled server:

   ```bash
   mongodb\bin\mongod.exe --dbpath mongodb\data --bind_ip 127.0.0.1
   ```

2. Start the backend. Use `npm run dev` for auto-reload while editing code:

   ```bash
   cd backend
   npm run dev
   ```

3. Start the frontend:

   ```bash
   cd frontend
   npm run dev
   ```

4. Open http://localhost:5173.

### Environment variables reference

`backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/clinic-queue
RECEPTIONIST_USERNAME=reception
RECEPTIONIST_PASSWORD=<your password>
AUTH_SECRET=<long random string>
```

`frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

Never commit `.env` files. They are listed in `.gitignore`.
