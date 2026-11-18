# Support Ticket Management System

Full-stack MERN app: users raise support tickets, admins manage them and reply.

**Stack:** React (Vite), Node.js, Express.js, MongoDB (Mongoose), JWT, bcrypt

## Features
- Register / login with JWT authentication
- Role-based access: `user` and `admin`
- Users: create tickets, view only their own, edit while Open, chat with admin
- Admins: view all tickets, filter by status, change status, assign, delete, dashboard counts
- Ticket messages (user <-> admin conversation) stored in MongoDB

## Project structure
```
support-ticket-system/
├── server/
│   ├── config/db.js
│   ├── middleware/auth.js        # protect (JWT) + restrictTo (roles)
│   ├── models/User.js, Ticket.js, Message.js
│   ├── routes/auth.js, tickets.js
│   ├── seedAdmin.js
│   └── server.js
└── client/
    └── src/
        ├── api.js                # axios + JWT interceptor
        ├── context/AuthContext.jsx
        ├── components/Navbar, ProtectedRoute, StatusBadge
        └── pages/Login, Register, Dashboard, NewTicket, TicketDetail
```

## Setup and integration steps

### 1. Prerequisites
- Node.js 18+ and npm
- MongoDB: local install (https://www.mongodb.com/try/download/community) or a free MongoDB Atlas cluster

### 2. Backend
```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
```
Edit `.env`:
- `MONGO_URI`: local `mongodb://127.0.0.1:27017/support_tickets`, or your Atlas connection string
- `JWT_SECRET`: any long random string
- `CLIENT_URL`: frontend URL (default `http://localhost:5173`), used for CORS

Create the first admin, then start the server:
```bash
npm run seed:admin        # uses ADMIN_EMAIL / ADMIN_PASSWORD from .env
npm run dev               # http://localhost:5000
```
Check: open http://localhost:5000/api/health -> `{"status":"ok"}`

### 3. Frontend
```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev               # http://localhost:5173
```

### 4. How frontend and backend are connected
1. `client/src/api.js` creates one axios instance pointing at `VITE_API_URL`.
2. On login, the server returns `{ token, user }`; `AuthContext` stores them in localStorage.
3. An axios request interceptor adds `Authorization: Bearer <token>` to every call.
4. The server's `protect` middleware verifies the token and sets `req.user`; `restrictTo('admin')` guards admin-only routes.
5. CORS on the server allows only `CLIENT_URL`.
6. `ProtectedRoute` on the client guards pages by login state and role.

### 5. Test the flow
1. Register a normal user at `/register`, create a ticket.
2. Log out, log in as the admin (from `.env`), open the ticket, change status, reply.
3. Log back in as the user and see the admin reply and new status.

## API reference
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | /api/auth/register | public | Create user account |
| POST | /api/auth/login | public | Get JWT |
| GET | /api/auth/me | logged in | Current user |
| POST | /api/tickets | user/admin | Create ticket |
| GET | /api/tickets?status= | logged in | Own tickets (admin: all) |
| GET | /api/tickets/stats | admin | Count per status |
| GET | /api/tickets/:id | owner/admin | Ticket details |
| PUT | /api/tickets/:id | owner (Open only)/admin | Edit ticket |
| PATCH | /api/tickets/:id/status | admin | Update status |
| DELETE | /api/tickets/:id | admin | Delete ticket + messages |
| GET | /api/tickets/:id/messages | owner/admin | List messages |
| POST | /api/tickets/:id/messages | owner/admin | Send message |

Quick API test with curl:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@12345"}'
```

## Deployment (optional)
- Database: MongoDB Atlas
- Backend: Render / Railway (set env vars from `.env`, start command `npm start`)
- Frontend: Vercel / Netlify (set `VITE_API_URL` to the deployed API URL, build command `npm run build`, output `dist`)
- After deploying, set the server's `CLIENT_URL` to the deployed frontend URL

## Ideas to extend
Pagination and search, email notifications, file attachments, Socket.io live chat, admin user management, rate limiting with `express-rate-limit`.
