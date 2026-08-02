# Poll & Survey Builder — Frontend

React (Vite) SPA, `axios` + `@microsoft/signalr`, matching the confirmed
backend API contract in `API.md`.

## Run locally

```bash
cd frontend
cp .env.example .env   # pick the right VITE_API_URL / VITE_HUB_URL block for your backend
npm install
npm run dev
```

Opens on `http://localhost:5173`.

First-time HTTPS note: if the backend runs via Visual Studio (`https://localhost:7188`),
open that URL directly once and click "Advanced > Proceed" to trust the
self-signed cert — otherwise every API call fails with a network error.

## Run with Docker

```bash
docker build -t poll-frontend --build-arg VITE_API_URL=http://localhost:8080/api .
docker run -p 8080:80 poll-frontend
```

## Structure

```
src/
  api.js             axios instance (withCredentials: true) + SignalR hub connector
  App.jsx            navbar + routes
  main.jsx           entry point
  styles.css         "ballot ticket" theme
  pages/
    CreatePoll.jsx    "/"                    question + 2-6 options form
    Vote.jsx          "/poll/:code"          single-choice voting UI
    Results.jsx       "/poll/:code/results"  live bar chart via SignalR
```

## API contract (see API.md for full detail)

- `POST /api/polls` → `{ question, options[2-6], expiresAt }` → `201 { code }`
- `GET /api/polls/{code}` → `{ code, question, status, expiresAt, hasVoted, options: [{optionIndex, text}] }`
- `POST /api/polls/{code}/vote` → `{ optionIndex }` → `204`
- `GET /api/polls/{code}/results` → `{ code, question, status, totalVotes, options: [{optionIndex, text, voteCount}] }`
- `POST /api/polls/{code}/close` → `204` (creator only, via cookie)

No `type` field — the backend only supports single-choice polls (2-6 options).
No login — vote-duplication and close-permission are handled by
`voter_token` / `creator_token_{code}` cookies, which is why every request
needs `withCredentials: true`.

## Live results

`Results.jsx` connects to the SignalR hub (`VITE_HUB_URL`) and listens for
`resultsUpdated`, joining the poll's group on mount and leaving it on
unmount — no polling needed.

## CORS reminder

The backend needs to allow this origin with credentials enabled:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()); // required alongside withCredentials on the client
});
app.UseCors("AllowFrontend");
```
