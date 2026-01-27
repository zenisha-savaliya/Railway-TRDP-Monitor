# Railway TRDP Monitor - Development Server

This is a mock/development server that simulates the embedded device API. Use this for testing the web application during development.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd dev-server
npm install
```

### 2. Start the Server

```bash
npm start
```

Or for auto-reload during development:

```bash
npm run dev
```

### 3. Server URLs

- **HTTP API:** `http://localhost:8080/api/v1`
- **WebSocket:** `ws://localhost:8080`

### 4. Test the Server

Open your browser and navigate to:
```
http://localhost:8080/api/v1/subsystems
```

You should see an authentication error (this is correct - it means the server is running).

## 📝 Login Credentials

```
Username: admin
Password: railway123
```

## 🔌 API Endpoints

### Authentication
```
POST /api/v1/auth/login
```

### Subsystems
```
GET    /api/v1/subsystems
POST   /api/v1/subsystems
PUT    /api/v1/subsystems/:id
DELETE /api/v1/subsystems/:id
```

### Signals
```
GET    /api/v1/signals
POST   /api/v1/signals
PUT    /api/v1/signals/:id
DELETE /api/v1/signals/:id
```

### Live Data
```
GET  /api/v1/data/live
POST /api/v1/data/write
```

### Device Configuration
```
GET /api/v1/config/device
PUT /api/v1/config/device
```

## 🧪 Testing with cURL

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"railway123"}'
```

Save the token from the response, then use it for other requests:

### Get Live Data
```bash
curl -X GET http://localhost:8080/api/v1/data/live \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Write Data
```bash
curl -X POST http://localhost:8080/api/v1/data/write \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"subsystem":"HVAC","signals":[{"id":3,"value":25}]}'
```

## 🌐 WebSocket Testing

You can test WebSocket using a tool like [websocat](https://github.com/vi/websocat) or browser developer tools:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    // Authenticate
    ws.send(JSON.stringify({
        type: 'auth',
        token: 'YOUR_TOKEN_HERE'
    }));
    
    // Subscribe to live data
    ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['livedata']
    }));
};

ws.onmessage = (event) => {
    console.log('Received:', JSON.parse(event.data));
};
```

## 🔧 Configuration

Edit `server.js` to modify:
- Port (default: 8080)
- JWT secret key
- Mock data
- Update intervals

## 📊 Features

- ✅ Full REST API implementation
- ✅ JWT authentication
- ✅ WebSocket support for real-time data
- ✅ Auto-generated live data
- ✅ CORS enabled
- ✅ Request logging
- ✅ Mock database (in-memory)

## 🛠️ Development

The server includes:
- Mock data generation
- Automatic live data updates
- All CRUD operations for subsystems and signals
- Device configuration management

## 📝 Notes

- Data is stored in memory (resets when server restarts)
- Live data values are randomly generated
- WebSocket sends updates every 2 seconds
- All API responses follow the protocol specification

## 🔍 Logs

The server logs all requests to the console:
```
[AUTH] Login attempt - Username: admin
[AUTH] Login successful - User: admin
[DATA] GET live data
[DATA] POST write data - Subsystem: HVAC, Signals: 2
[WebSocket] Client connected
[WebSocket] Client authenticated - User: admin
```

## 🚦 Status Codes

- `200` - Success
- `201` - Created
- `401` - Unauthorized (no token or invalid credentials)
- `403` - Forbidden (invalid token)
- `404` - Not found

## 🎯 Next Steps

1. Start the dev server: `npm start`
2. Update webapp API base URL to: `http://localhost:8080/api/v1`
3. Test all features in the web application
4. Use Postman collection for API testing
