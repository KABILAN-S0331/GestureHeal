import http from 'http';

const PORT = 3000;

// Default State
let currentState = {
    active: false,
    patientLocation: null,
    patientGesture: null,
    gestureConfidence: 0,
    emergencyType: null,
    doctorResponse: null,
    chatHistory: [] // Array of { sender: 'doctor', text: '...', time: ... }
};

const server = http.createServer((req, res) => {
    // CORS Headers - Allow connection from any device on network
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Preflight settings
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // GET /state - Fetch current state
    if (req.method === 'GET' && req.url === '/state') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(currentState));
        return;
    }

    // POST /state - Update state
    if (req.method === 'POST' && req.url === '/state') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const updates = JSON.parse(body);
                currentState = { ...currentState, ...updates }; // Merge updates
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, state: currentState }));
                console.log('Update received:', Object.keys(updates));
            } catch (e) {
                console.error('Invalid JSON received:', e);
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n📡 Sync Server running on port ${PORT}`);
    console.log(`   - Local:    http://localhost:${PORT}`);
    console.log(`   - Network:  http://<YOUR_IP_ADDRESS>:${PORT}`);
    console.log(`\n👉 Start this server to enable 2-laptop communication!\n`);
});
