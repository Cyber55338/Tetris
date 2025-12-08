const { chromium } = require('playwright');

async function debugNavigationBug() {
    const browser = await chromium.launch({ headless: false, devtools: true });
    const page = await browser.newPage();

    // Inject console logging to trace function calls
    await page.addInitScript(() => {
        window._debugCalls = [];

        // Wait for functions to be defined then wrap them
        setTimeout(() => {
            const origEnterChatMode = window.enterChatMode;
            const origExitChatMode = window.exitChatMode;
            const origEnterJournalMode = window.enterJournalMode;
            const origExitJournalMode = window.exitJournalMode;

            if (origEnterChatMode) {
                window.enterChatMode = function() {
                    console.log('>>> enterChatMode() CALLED');
                    window._debugCalls.push('enterChatMode');
                    return origEnterChatMode.apply(this, arguments);
                };
            }
            if (origExitChatMode) {
                window.exitChatMode = function() {
                    console.log('>>> exitChatMode() CALLED');
                    window._debugCalls.push('exitChatMode');
                    return origExitChatMode.apply(this, arguments);
                };
            }
            if (origEnterJournalMode) {
                window.enterJournalMode = function() {
                    console.log('>>> enterJournalMode() CALLED');
                    window._debugCalls.push('enterJournalMode');
                    return origEnterJournalMode.apply(this, arguments);
                };
            }
            if (origExitJournalMode) {
                window.exitJournalMode = function() {
                    console.log('>>> exitJournalMode() CALLED');
                    window._debugCalls.push('exitJournalMode');
                    return origExitJournalMode.apply(this, arguments);
                };
            }
            console.log('Debug wrappers installed');
        }, 1000);
    });

    // Capture console logs
    page.on('console', msg => {
        if (msg.text().includes('>>>') || msg.text().includes('Debug')) {
            console.log('[BROWSER]', msg.text());
        }
    });

    console.log('Opening app...');
    await page.goto('http://localhost:8888');
    await page.waitForTimeout(2000);

    // Step 1: Enter Chat mode
    console.log('\n=== STEP 1: Click Chat header ===');
    await page.evaluate(() => window._debugCalls = []);
    await page.click('#chat-header');
    await page.waitForTimeout(500);

    let calls = await page.evaluate(() => window._debugCalls);
    console.log('Function calls:', calls);

    // Check header states
    let chatActive = await page.$eval('#chat-header', el => el.classList.contains('active'));
    let journalsActive = await page.$eval('#journals-header', el => el.classList.contains('active'));
    let designActive = await page.$eval('#design-flow-header', el => el.classList.contains('active'));
    console.log('Headers after step 1 - Chat:', chatActive, 'Journals:', journalsActive, 'Design:', designActive);

    // Step 2: Click Journals from Chat
    console.log('\n=== STEP 2: Click Journals header (from Chat mode) ===');
    await page.evaluate(() => window._debugCalls = []);
    await page.click('#journals-header');
    await page.waitForTimeout(500);

    calls = await page.evaluate(() => window._debugCalls);
    console.log('Function calls:', calls);

    chatActive = await page.$eval('#chat-header', el => el.classList.contains('active'));
    journalsActive = await page.$eval('#journals-header', el => el.classList.contains('active'));
    designActive = await page.$eval('#design-flow-header', el => el.classList.contains('active'));
    console.log('Headers after step 2 - Chat:', chatActive, 'Journals:', journalsActive, 'Design:', designActive);

    // Check chatMode variable
    let chatModeValue = await page.evaluate(() => typeof chatMode !== 'undefined' ? chatMode : 'undefined');
    console.log('chatMode variable:', chatModeValue);

    console.log('\n=== Debug complete. Check browser DevTools for more details ===');

    // Keep open
    await new Promise(() => {});
}

debugNavigationBug().catch(console.error);
