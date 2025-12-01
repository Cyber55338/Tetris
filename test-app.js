// Quick test to verify the application loads correctly
const http = require('http');

const BASE_URL = 'http://localhost:8888';

const tests = [
    { name: 'Index page', path: '/', check: (body) => body.includes('IDEA Engine') && body.includes('workflow-canvas') },
    { name: 'CSS file', path: '/styles.css', check: (body) => body.includes('.toolbar') && body.includes('.canvas-container') },
    { name: 'Nodes.js', path: '/nodes.js', check: (body) => body.includes('NodeDefinitions') && body.includes('class Node') },
    { name: 'Canvas.js', path: '/canvas.js', check: (body) => body.includes('class CanvasRenderer') && body.includes('renderMinimap') },
    { name: 'Connections.js', path: '/connections.js', check: (body) => body.includes('class ConnectionManager') },
    { name: 'Workflow.js', path: '/workflow.js', check: (body) => body.includes('class WorkflowManager') },
    { name: 'ComfyUI.js', path: '/comfyui.js', check: (body) => body.includes('class ComfyUIApp') },
    { name: 'Journals.js', path: '/journals.js', check: (body) => body.includes('journalMode') && body.includes('initJournals') },
];

let passed = 0;
let failed = 0;

function runTest(test) {
    return new Promise((resolve) => {
        http.get(BASE_URL + test.path, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 && test.check(body)) {
                    console.log(`[PASS] ${test.name}`);
                    passed++;
                } else {
                    console.log(`[FAIL] ${test.name} - Status: ${res.statusCode}`);
                    failed++;
                }
                resolve();
            });
        }).on('error', (err) => {
            console.log(`[FAIL] ${test.name} - Error: ${err.message}`);
            failed++;
            resolve();
        });
    });
}

async function runAllTests() {
    console.log('Running IDEA Engine Tests...\n');

    for (const test of tests) {
        await runTest(test);
    }

    console.log(`\n--------------------`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`Total: ${tests.length} tests`);

    if (failed === 0) {
        console.log('\nAll tests passed! The application is working correctly.');
    } else {
        console.log('\nSome tests failed. Please check the errors above.');
    }
}

runAllTests();
