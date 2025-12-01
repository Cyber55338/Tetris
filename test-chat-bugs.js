const { chromium } = require('playwright');

async function testChatBugs() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('=== TEST: Chat Session Persistence & View ===\n');

    // First load
    console.log('1. Opening app first time...');
    await page.goto('http://localhost:8888');
    await page.waitForTimeout(2000);

    // Enter chat mode
    console.log('2. Entering Chat mode...');
    await page.click('#chat-header');
    await page.waitForTimeout(1000);

    // Check number of sessions
    let sessionCount = await page.$$eval('.chat-session-item', items => items.length);
    console.log('   Sessions after entering chat:', sessionCount);

    // Check if nodes are visible/in view
    let nodes = await page.$$eval('#workflow-canvas', canvas => {
        // Check canvas transform/view
        return 'Canvas present';
    });
    console.log('   Canvas check:', nodes);

    // Get chat history
    let sessions = await page.$$eval('.chat-session-item', items =>
        items.map(item => ({
            id: item.dataset.sessionId,
            title: item.querySelector('.session-title')?.textContent,
            active: item.classList.contains('active')
        }))
    );
    console.log('   Chat sessions:', JSON.stringify(sessions, null, 2));

    // Check localStorage
    let storedSessions = await page.evaluate(() => {
        const data = localStorage.getItem('chatSessions');
        return data ? JSON.parse(data).length : 0;
    });
    console.log('   Sessions in localStorage:', storedSessions);

    // Now refresh the page
    console.log('\n3. Refreshing page...');
    await page.reload();
    await page.waitForTimeout(2000);

    // Go to chat mode again
    console.log('4. Entering Chat mode again after refresh...');
    await page.click('#chat-header');
    await page.waitForTimeout(1000);

    // Check sessions after refresh
    sessionCount = await page.$$eval('.chat-session-item', items => items.length);
    console.log('   Sessions after refresh:', sessionCount);

    sessions = await page.$$eval('.chat-session-item', items =>
        items.map(item => ({
            id: item.dataset.sessionId,
            title: item.querySelector('.session-title')?.textContent,
            active: item.classList.contains('active')
        }))
    );
    console.log('   Chat sessions after refresh:', JSON.stringify(sessions, null, 2));

    // Check if a NEW session was created
    storedSessions = await page.evaluate(() => {
        const data = localStorage.getItem('chatSessions');
        return data ? JSON.parse(data).length : 0;
    });
    console.log('   Sessions in localStorage after refresh:', storedSessions);

    // Bug check: Are there duplicate sessions?
    if (sessionCount > 1) {
        console.log('\n⚠️  BUG: Multiple sessions exist - new one may have been created on refresh');
    }

    // Test 2: Check if nodes are centered/in view when selecting a chat
    console.log('\n5. Testing node visibility when selecting chat...');

    // Click on first session if exists
    const firstSession = await page.$('.chat-session-item');
    if (firstSession) {
        await firstSession.click();
        await page.waitForTimeout(500);

        // Check canvas viewport and node positions
        const viewInfo = await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.canvasRenderer) {
                const nodes = app.canvasRenderer.nodes;
                const canvas = document.getElementById('workflow-canvas');
                return {
                    nodeCount: nodes.length,
                    canvasWidth: canvas?.width,
                    canvasHeight: canvas?.height,
                    offsetX: app.canvasRenderer.offsetX,
                    offsetY: app.canvasRenderer.offsetY,
                    zoom: app.canvasRenderer.zoom,
                    firstNodePos: nodes[0] ? { x: nodes[0].x, y: nodes[0].y } : null
                };
            }
            return null;
        });
        console.log('   View info:', JSON.stringify(viewInfo, null, 2));

        // Check if nodes would be visible
        if (viewInfo && viewInfo.firstNodePos) {
            const visibleX = viewInfo.firstNodePos.x * viewInfo.zoom + viewInfo.offsetX;
            const visibleY = viewInfo.firstNodePos.y * viewInfo.zoom + viewInfo.offsetY;
            console.log('   First node screen position:', { x: visibleX, y: visibleY });

            if (visibleX < 0 || visibleX > viewInfo.canvasWidth ||
                visibleY < 0 || visibleY > viewInfo.canvasHeight) {
                console.log('   ⚠️  BUG: First node is OUT OF VIEW!');
            } else {
                console.log('   ✓ First node is visible');
            }
        }
    }

    console.log('\n=== Test complete ===');
    await browser.close();
}

testChatBugs().catch(console.error);
