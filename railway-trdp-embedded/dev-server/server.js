const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = 'railway-trdp-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Raw body parser for binary write data (only for octet-stream)
const rawParser = express.raw({ type: 'application/octet-stream', limit: '64kb' });

// Serve static files from the webapp dist folder
const webappPath = path.join(__dirname, '../webapp/dist');
app.use(express.static(webappPath));

// Mock Database
let subsystems = [
    { id: 1, name: 'HVAC', type: 'TCN', ip: '192.168.1.100', active: true },
    { id: 2, name: 'Traction', type: 'MVB', ip: '192.168.1.101', active: true }
];

let signals = [
    { id: 1, name: 'Speed', subsystemId: 2, datatype: 'FLOAT32', comid: 1000, scaling: 1.0, cycletime: 100, msgtype: 'PD', fragmentation: 'NO', access: 'READ/WRITE' },
    { id: 2, name: 'Pressure', subsystemId: 2, datatype: 'FLOAT32', comid: 1001, scaling: 0.1, cycletime: 200, msgtype: 'PD', fragmentation: 'NO', access: 'READ' },
    { id: 3, name: 'Temperature', subsystemId: 1, datatype: 'INT32', comid: 1002, scaling: 1.0, cycletime: 500, msgtype: 'PD', fragmentation: 'NO', access: 'READ/WRITE' },
    { id: 4, name: 'Door_Status', subsystemId: 1, datatype: 'BOOLEAN', comid: 1003, scaling: 1.0, cycletime: 100, msgtype: 'MD', fragmentation: 'NO', access: 'READ/WRITE' },
    { id: 5, name: 'Battery_Voltage', subsystemId: 2, datatype: 'FLOAT32', comid: 1004, scaling: 0.01, cycletime: 1000, msgtype: 'PD', fragmentation: 'NO', access: 'READ' }
];

let deviceConfig = {
    ipMode: 'static',
    ipAddress: '192.168.1.100',
    subnetMask: '255.255.255.0',
    gateway: '192.168.1.1',
    dns: '8.8.8.8'
};

// Mock live data generator
function generateLiveData() {
    const data = {};
    signals.forEach(signal => {
        if (signal.datatype === 'BOOLEAN') {
            data[signal.name] = {
                value: Math.random() > 0.5,
                quality: 'VALID',
                timestamp: new Date().toISOString(),
                comid: signal.comid
            };
        } else if (signal.datatype === 'FLOAT32') {
            data[signal.name] = {
                value: parseFloat((Math.random() * 100 * signal.scaling).toFixed(2)),
                quality: 'VALID',
                timestamp: new Date().toISOString(),
                comid: signal.comid
            };
        } else {
            data[signal.name] = {
                value: Math.floor(Math.random() * 100),
                quality: 'VALID',
                timestamp: new Date().toISOString(),
                comid: signal.comid
            };
        }
    });
    return data;
}

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'No token provided', code: 401 });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ status: 'error', message: 'Invalid token', code: 403 });
        }
        req.user = user;
        next();
    });
}

// ==================== AUTHENTICATION ROUTES ====================

// Angular-compatible login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    console.log(`[AUTH] Login attempt - Username: ${username}`);

    if (username === 'admin' && password === 'railway123') {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        
        // Return format expected by Angular
        res.json({ token });
        console.log(`[AUTH] Login successful - User: ${username}`);
    } else {
        res.status(401).json({
            status: 'error',
            message: 'Invalid credentials',
            code: 401
        });
        console.log(`[AUTH] Login failed - Invalid credentials`);
    }
});

app.post('/api/v1/auth/login', (req, res) => {
    const { username, password } = req.body;

    console.log(`[AUTH] Login attempt - Username: ${username}`);

    if (username === 'admin' && password === 'railway123') {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({
            status: 'success',
            data: {
                token: token,
                username: username,
                expiresIn: 3600
            }
        });
        console.log(`[AUTH] Login successful - User: ${username}`);
    } else {
        res.status(401).json({
            status: 'error',
            message: 'Invalid credentials',
            code: 401
        });
        console.log(`[AUTH] Login failed - Invalid credentials`);
    }
});

// ==================== ANGULAR-COMPATIBLE API ROUTES ====================

// Subsystems routes (Angular format)
app.get('/api/subsystems', authenticateToken, (req, res) => {
    console.log('[API] GET subsystems (Angular format)');
    res.json({ subsystems });
});

app.post('/api/subsystems', authenticateToken, (req, res) => {
    const { subsystems: newSubsystems } = req.body;
    if (Array.isArray(newSubsystems)) {
        subsystems = newSubsystems;
        console.log('[API] POST subsystems (Angular format) - Updated count:', subsystems.length);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid request body' });
    }
});

// Signals routes (Angular format)
app.get('/api/signals', authenticateToken, (req, res) => {
    console.log('[API] GET signals (Angular format)');
    res.json({ signals });
});

app.post('/api/signals', authenticateToken, (req, res) => {
    const { signals: newSignals } = req.body;
    if (Array.isArray(newSignals)) {
        signals = newSignals;
        console.log('[API] POST signals (Angular format) - Updated count:', signals.length);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid request body' });
    }
});

// Live data route (Angular format - returns binary/octet-stream)
app.get('/api/livedata', authenticateToken, (req, res) => {
    console.log('[API] GET live data (Angular format)');
    // For now, return JSON. Angular expects binary but we'll return JSON for simplicity
    const liveData = generateLiveData();
    res.json({
        data: liveData,
        status: 'Connected'
    });
});

// Write data route (Angular format) - accepts binary (application/octet-stream)
app.post('/api/writedata', rawParser, authenticateToken, (req, res) => {
    console.log('[API] POST write data (Angular format)', req.body ? `body length: ${req.body.length}` : '');
    // Return 200; client expects arraybuffer response
    res.set('Content-Type', 'application/octet-stream');
    res.status(200).send(Buffer.from([]));
});

// Batch write data route - accepts binary (application/octet-stream)
app.post('/api/writedata/batch', rawParser, authenticateToken, (req, res) => {
    console.log('[API] POST batch write data (Angular format)', req.body ? `body length: ${req.body.length}` : '');
    res.set('Content-Type', 'application/octet-stream');
    res.status(200).send(Buffer.from([]));
});

// Files route
app.get('/api/files', authenticateToken, (req, res) => {
    console.log('[API] GET files (Angular format)');
    res.json({ files: [] });
});

// Version route
app.get('/api/version', authenticateToken, (req, res) => {
    console.log('[API] GET version (Angular format)');
    res.json({
        application: '1.0.0',
        firmware: '1.0.0'
    });
});

// Download route
app.get('/api/download/:filename', authenticateToken, (req, res) => {
    console.log('[API] GET download file:', req.params.filename);
    res.status(404).json({ error: 'File not found' });
});

// Firmware route
app.post('/api/firmware', authenticateToken, (req, res) => {
    console.log('[API] POST firmware upload (Angular format)');
    res.json({ success: true, message: 'Firmware uploaded successfully' });
});

// ==================== SUBSYSTEMS ROUTES ====================

app.get('/api/v1/subsystems', authenticateToken, (req, res) => {
    console.log('[SUBSYSTEMS] GET all subsystems');
    res.json({
        status: 'success',
        data: { subsystems }
    });
});

app.post('/api/v1/subsystems', authenticateToken, (req, res) => {
    const { name, type, ip } = req.body;
    const newId = Math.max(...subsystems.map(s => s.id), 0) + 1;
    
    const newSubsystem = {
        id: newId,
        name,
        type,
        ip,
        active: true
    };
    
    subsystems.push(newSubsystem);
    
    console.log(`[SUBSYSTEMS] POST new subsystem - ID: ${newId}, Name: ${name}`);
    res.status(201).json({
        status: 'success',
        data: newSubsystem
    });
});

app.put('/api/v1/subsystems/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const index = subsystems.findIndex(s => s.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            status: 'error',
            message: 'Subsystem not found',
            code: 404
        });
    }
    
    subsystems[index] = { ...subsystems[index], ...req.body };
    
    console.log(`[SUBSYSTEMS] PUT update subsystem - ID: ${id}`);
    res.json({
        status: 'success',
        data: subsystems[index]
    });
});

app.delete('/api/v1/subsystems/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const index = subsystems.findIndex(s => s.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            status: 'error',
            message: 'Subsystem not found',
            code: 404
        });
    }
    
    subsystems.splice(index, 1);
    
    console.log(`[SUBSYSTEMS] DELETE subsystem - ID: ${id}`);
    res.json({
        status: 'success',
        message: 'Subsystem deleted'
    });
});

// ==================== SIGNALS ROUTES ====================

app.get('/api/v1/signals', authenticateToken, (req, res) => {
    console.log('[SIGNALS] GET all signals');
    res.json({
        status: 'success',
        data: { signals }
    });
});

app.post('/api/v1/signals', authenticateToken, (req, res) => {
    const newId = Math.max(...signals.map(s => s.id), 0) + 1;
    const newSignal = { id: newId, ...req.body };
    
    signals.push(newSignal);
    
    console.log(`[SIGNALS] POST new signal - ID: ${newId}, Name: ${req.body.name}`);
    res.status(201).json({
        status: 'success',
        data: newSignal
    });
});

app.put('/api/v1/signals/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const index = signals.findIndex(s => s.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            status: 'error',
            message: 'Signal not found',
            code: 404
        });
    }
    
    signals[index] = { ...signals[index], ...req.body };
    
    console.log(`[SIGNALS] PUT update signal - ID: ${id}`);
    res.json({
        status: 'success',
        data: signals[index]
    });
});

app.delete('/api/v1/signals/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const index = signals.findIndex(s => s.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            status: 'error',
            message: 'Signal not found',
            code: 404
        });
    }
    
    signals.splice(index, 1);
    
    console.log(`[SIGNALS] DELETE signal - ID: ${id}`);
    res.json({
        status: 'success',
        message: 'Signal deleted'
    });
});

// ==================== LIVE DATA ROUTES ====================

app.get('/api/v1/data/live', authenticateToken, (req, res) => {
    const subsystem = req.query.subsystem;
    const liveData = generateLiveData();
    
    console.log(`[DATA] GET live data${subsystem ? ' - Subsystem: ' + subsystem : ''}`);
    
    res.json({
        status: 'success',
        timestamp: new Date().toISOString(),
        data: liveData,
        connectionStatus: 'connected'
    });
});

app.post('/api/v1/data/write', authenticateToken, (req, res) => {
    const { subsystem, signals: writeSignals } = req.body;
    
    console.log(`[DATA] POST write data - Subsystem: ${subsystem}, Signals: ${writeSignals.length}`);
    
    const results = writeSignals.map(signal => ({
        signalId: signal.id,
        name: signal.name,
        status: 'success',
        timestamp: new Date().toISOString()
    }));
    
    res.json({
        status: 'success',
        message: 'Data written successfully',
        data: {
            subsystem,
            written: writeSignals.length,
            failed: 0,
            results,
            timestamp: new Date().toISOString()
        }
    });
});

// ==================== DEVICE CONFIGURATION ROUTES ====================

app.get('/api/v1/config/device', authenticateToken, (req, res) => {
    console.log('[CONFIG] GET device configuration');
    res.json({
        status: 'success',
        data: deviceConfig
    });
});

app.put('/api/v1/config/device', authenticateToken, (req, res) => {
    deviceConfig = { ...deviceConfig, ...req.body };
    
    console.log('[CONFIG] PUT update device configuration');
    res.json({
        status: 'success',
        data: deviceConfig,
        message: 'Device configuration updated'
    });
});

// ==================== HTTP SERVER ====================

const server = http.createServer(app);

// ==================== WEBSOCKET SERVER ====================

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    
    let authenticated = false;
    let liveDataInterval = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Authentication
            if (data.type === 'auth') {
                jwt.verify(data.token, JWT_SECRET, (err, user) => {
                    if (err) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Authentication failed'
                        }));
                        ws.close();
                    } else {
                        authenticated = true;
                        console.log(`[WebSocket] Client authenticated - User: ${user.username}`);
                        ws.send(JSON.stringify({
                            type: 'auth',
                            status: 'success'
                        }));
                    }
                });
            }
            
            // Subscribe to live data
            else if (data.type === 'subscribe' && authenticated) {
                console.log(`[WebSocket] Client subscribed to channels: ${data.channels.join(', ')}`);
                
                if (data.channels.includes('livedata')) {
                    // Send live data every 2 seconds
                    liveDataInterval = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'livedata',
                                timestamp: new Date().toISOString(),
                                data: generateLiveData()
                            }));
                        }
                    }, 2000);
                }
            }
            
            // Write data
            else if (data.type === 'write' && authenticated) {
                console.log(`[WebSocket] Write request - Subsystem: ${data.subsystem}`);
                ws.send(JSON.stringify({
                    type: 'write',
                    status: 'success',
                    message: 'Data written successfully'
                }));
            }
            
        } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
        if (liveDataInterval) {
            clearInterval(liveDataInterval);
        }
    });

    ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
    });
});

// ==================== START SERVER ====================

server.listen(PORT, () => {
    console.log('================================================================================');
    console.log('  RAILWAY TRDP MONITOR - SERVER');
    console.log('================================================================================');
    console.log(`  Web Application:  http://localhost:${PORT}`);
    console.log(`  API Base URL:     http://localhost:${PORT}/api/v1`);
    console.log(`  WebSocket:        ws://localhost:${PORT}`);
    console.log('================================================================================');
    console.log('  Login Credentials:');
    console.log('    Username: admin');
    console.log('    Password: railway123');
    console.log('================================================================================');
    console.log('  Available API Endpoints:');
    console.log('    POST   /api/v1/auth/login');
    console.log('    GET    /api/v1/subsystems');
    console.log('    POST   /api/v1/subsystems');
    console.log('    GET    /api/v1/signals');
    console.log('    POST   /api/v1/signals');
    console.log('    GET    /api/v1/data/live');
    console.log('    POST   /api/v1/data/write');
    console.log('    GET    /api/v1/config/device');
    console.log('    PUT    /api/v1/config/device');
    console.log('================================================================================');
    console.log('  Static Files:     Serving from ../webapp/dist');
    console.log('  Server is ready! Press Ctrl+C to stop.');
    console.log('================================================================================\n');
});

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(webappPath, 'index.html'));
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[SERVER] Shutting down gracefully...');
    server.close(() => {
        console.log('[SERVER] HTTP server closed');
        process.exit(0);
    });
});
