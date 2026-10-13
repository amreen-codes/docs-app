# Docs App

A small collaborative document editor with sharing and access control.

## Features
- Login with seeded demo users
- Create, edit and rename documents (rich text: bold, italic, underline, headings, lists)
- Auto-save ("Saving..." / "Saved")
- Share a document with another user as **Can view** or **Can edit**
- "Shared with me" list on the dashboard
- View-only mode (editor is locked, and the API also rejects edits)
- Upload `.txt` / `.md` files as documents; other file types are rejected
- Automated tests for access control and upload validation

## Tech Stack
- Client: React + Vite
- Server: Node.js, Express, Sequelize, SQLite
- Tests: Jest + Supertest

## Setup

### Server
```
cd server
npm install
npm start
```
Runs on http://localhost:3000

### Client
```
cd client
npm install
npm run dev
```
Runs on http://localhost:5173

### Tests
```
cd server
npm test
```

## Demo Users
| Email           | Password    |
|-----------------|-------------|
| alice@test.com  | password123 |
| bob@test.com    | password123 |
| carol@test.com  | password123 |

## How to Test Sharing
1. Log in as Alice, create a document and click Share.
2. Enter bob@test.com, choose "Can view" and click Share.
3. In an Incognito window, log in as Bob. The document appears under "Shared with me" in view-only mode.
4. As Alice, share again with "Can edit". Refresh Bob's page; Bob can now edit.

## Access Rules
- Owner: full access, can share
- Editor: can read and save changes
- Viewer: read only
- Anyone else: 403

## Assumptions / Limitations
- SQLite is used for simplicity.
- Uploads accept only `.txt` and `.md`.
- No real-time collaboration; changes appear after refresh.
- Demo users are seeded, there is no public registration.

## Future Improvements
- Real-time collaboration
- Invites for unregistered emails
- Document version history