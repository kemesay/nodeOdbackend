# Socket.IO in production

Payment status updates use Socket.IO on the **same host** as the REST API (`api.odatransportation.com`).

## Path

| Setting | Default |
|---------|---------|
| Backend `SOCKET_IO_PATH` | `/api/v1/socket.io` |
| React `REACT_APP_SOCKET_IO_PATH` | `/api/v1/socket.io` |

Clients connect to:

`wss://api.odatransportation.com/api/v1/socket.io/`

## Backend `.env`

```env
SOCKET_IO_PATH=/api/v1/socket.io
SOCKET_CORS_ORIGINS=https://odatransportation.com,https://www.odatransportation.com,http://localhost:3000
SOCKET_ROOM_JWT_SECRET=your_long_random_secret
```

`SOCKET_ROOM_JWT_SECRET` (or `JWT_PRIVATE_KEY`) must match the value used to sign booking `roomToken` responses.

## Nginx (required)

The reverse proxy must pass **WebSocket upgrades** to Node. See `oda-ride-transport/nginx-api.conf.example`.

Without this, the browser shows:

`WebSocket connection to 'wss://api.odatransportation.com/socket.io/...' failed`

After deploying the path change, the URL should end with `/api/v1/socket.io/`.

Reload Nginx after updating config:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## React `.env`

```env
REACT_APP_BACKEND_API=https://api.odatransportation.com
REACT_APP_SOCKET_IO_PATH=/api/v1/socket.io
# Optional override:
# REACT_APP_SOCKET_URL=https://api.odatransportation.com
```

Restart `npm start` / rebuild after changing `.env`.

## Verify

1. Restart Node API on port 5100 — log should show: `Socket.IO listening on path /api/v1/socket.io`
2. From your machine:

```bash
curl -s "https://api.odatransportation.com/api/v1/socket.io/?EIO=4&transport=polling" | head -c 120
```

You should get a Socket.IO handshake payload (starts with `0` or similar), not HTML 404.

3. Create a booking — browser Network tab should show successful `/api/v1/socket.io/` polling or websocket.
