// Simple proxy server for Claude API to avoid CORS issues
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Load .env file
try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
    });
} catch (e) {}

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const PORT = 3000;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Only handle POST requests to /api/generate
    if (req.method === 'POST' && req.url === '/api/generate') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);

                // Prepare request to Claude API
                const apiData = JSON.stringify({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 2000,
                    messages: [{
                        role: 'user',
                        content: requestData.prompt
                    }],
                    system: requestData.system
                });

                const options = {
                    hostname: 'api.anthropic.com',
                    port: 443,
                    path: '/v1/messages',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': API_KEY,
                        'anthropic-version': '2023-06-01',
                        'Content-Length': Buffer.byteLength(apiData)
                    }
                };

                // Make request to Claude API
                const apiReq = https.request(options, (apiRes) => {
                    let responseData = '';

                    apiRes.on('data', (chunk) => {
                        responseData += chunk;
                    });

                    apiRes.on('end', () => {
                        // Log errors for debugging
                        if (apiRes.statusCode !== 200) {
                            console.error('Claude API Error:', apiRes.statusCode);
                            console.error('Response:', responseData);
                        }
                        res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(responseData);
                    });
                });

                apiReq.on('error', (error) => {
                    console.error('API Error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                });

                apiReq.write(apiData);
                apiReq.end();

            } catch (error) {
                console.error('Server Error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
    console.log(`📡 Ready to forward requests to Claude API`);
});
