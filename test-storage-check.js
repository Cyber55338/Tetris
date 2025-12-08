const { chromium } = require('playwright');

async function testStorageCheck() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const CORRECT_KEY = 'idea-engine-chat-sessions';

    console.log('=== TEST: Chat Session Storage ===\n');

    // First load
    console.log('1. Opening app...');
    await page.goto('http://localhost:8888');
    await page.waitForTimeout(2000);

    // Check storage with correct key
    let stored = await page.evaluate((key) => localStorage.getItem(key), CORRECT_KEY);
    console.log('   Storage before chat:', stored ? `${stored.length} chars` : 'null');

    // Enter chat mode
    console.log('\n2. Entering Chat mode...');
    await page.click('#chat-header');
    await page.waitForTimeout(1000);

    // Check storage after entering chat
    stored = await page.evaluate((key) => localStorage.getItem(key), CORRECT_KEY);
    console.log('   Storage after entering chat:', stored ? `${stored.length} chars` : 'null');
    if (stored) {
        const parsed = JSON.parse(stored);
        console.log('   Sessions saved:', parsed.length);
        console.log('   First session:', parsed[0]?.title, parsed[0]?.id);
    }

    // Type something in user message
    console.log('\n3. Modifying session...');
    await page.keyboard.type('Hello world');
    await page.waitForTimeout(1000);

    // Check storage after typing
    stored = await page.evaluate((key) => localStorage.getItem(key), CORRECT_KEY);
    console.log('   Storage after typing:', stored ? `${stored.length} chars` : 'null');

    // Refresh
    console.log('\n4. Refreshing page...');
    await page.reload();
    await page.waitForTimeout(2000);

    // Check storage after refresh
    stored = await page.evaluate((key) => localStorage.getItem(key), CORRECT_KEY);
    console.log('   Storage after refresh:', stored ? `${stored.length} chars` : 'null');
    if (stored) {
        const parsed = JSON.parse(stored);
        console.log('   Sessions after refresh:', parsed.length);
        parsed.forEach((s, i) => console.log(`   [${i}] ${s.title} - ${s.id}`));
    }

    // Enter chat mode again
    console.log('\n5. Entering Chat mode again...');
    await page.click('#chat-header');
    await page.waitForTimeout(1000);

    // Check sessions now
    let sessionCount = await page.$$eval('.chat-session-item', items => items.length);
    console.log('   UI sessions count:', sessionCount);

    stored = await page.evaluate((key) => localStorage.getItem(key), CORRECT_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        console.log('   Storage sessions count:', parsed.length);
    }

    if (sessionCount > 1) {
        console.log('\n⚠️  BUG: Duplicate sessions created!');
    } else {
        console.log('\n✓ Session persistence working correctly');
    }

    console.log('\n=== Test complete ===');
    await browser.close();
}

testStorageCheck().catch(console.error);
