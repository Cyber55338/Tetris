const { chromium } = require('playwright');

async function verifyFix() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Opening app...');
    await page.goto('http://localhost:8888');
    await page.waitForTimeout(2000);

    // Step 1: Enter Chat mode
    console.log('\n=== Step 1: Enter Chat mode ===');
    await page.click('#chat-header');
    await page.waitForTimeout(500);

    let chatActive = await page.$eval('#chat-header', el => el.classList.contains('active'));
    console.log('Chat header active:', chatActive);

    // Step 2: Navigate to Journals
    console.log('\n=== Step 2: Navigate to Journals ===');
    await page.click('#journals-header');
    await page.waitForTimeout(500);

    chatActive = await page.$eval('#chat-header', el => el.classList.contains('active'));
    let journalsActive = await page.$eval('#journals-header', el => el.classList.contains('active'));
    let chatModeValue = await page.evaluate(() => typeof chatMode !== 'undefined' ? chatMode : 'undefined');

    console.log('Chat header active (should be FALSE):', chatActive);
    console.log('Journals header active (should be TRUE):', journalsActive);
    console.log('chatMode variable (should be FALSE):', chatModeValue);

    if (!chatActive && journalsActive && chatModeValue === false) {
        console.log('\n✓ BUG FIXED! Navigation works correctly.');
    } else {
        console.log('\n✗ Bug still exists.');
    }

    // Step 3: Navigate back to Chat
    console.log('\n=== Step 3: Navigate back to Chat ===');
    await page.click('#chat-header');
    await page.waitForTimeout(500);

    // Step 4: Navigate to Design Flow
    console.log('\n=== Step 4: Navigate to Design Flow ===');
    await page.click('#design-flow-header');
    await page.waitForTimeout(500);

    chatActive = await page.$eval('#chat-header', el => el.classList.contains('active'));
    let designActive = await page.$eval('#design-flow-header', el => el.classList.contains('active'));
    chatModeValue = await page.evaluate(() => typeof chatMode !== 'undefined' ? chatMode : 'undefined');

    console.log('Chat header active (should be FALSE):', chatActive);
    console.log('Design Flow header active (should be TRUE):', designActive);
    console.log('chatMode variable (should be FALSE):', chatModeValue);

    if (!chatActive && designActive && chatModeValue === false) {
        console.log('\n✓ Chat → Design Flow works correctly!');
    } else {
        console.log('\n✗ Bug in Chat → Design Flow transition.');
    }

    await browser.close();
    console.log('\nTest complete.');
}

verifyFix().catch(console.error);
