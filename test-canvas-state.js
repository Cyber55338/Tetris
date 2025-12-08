const { chromium } = require('playwright');

async function testCanvasState() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Opening app...');
    await page.goto('http://localhost:8888');
    await page.waitForTimeout(2000);

    // Check initial watermark
    let watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    console.log('Initial watermark:', watermark);

    // Step 1: Enter Chat mode
    console.log('\n=== Step 1: Enter Chat mode ===');
    await page.click('#chat-header');
    await page.waitForTimeout(500);
    watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    console.log('Watermark in Chat mode:', watermark);

    // Step 2: Navigate to Journals
    console.log('\n=== Step 2: Navigate from Chat to Journals ===');
    await page.click('#journals-header');
    await page.waitForTimeout(500);

    watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    let journalsActive = await page.$eval('#journals-header', el => el.classList.contains('active'));
    let journalsSection = await page.$eval('#journals-section', el => window.getComputedStyle(el).display);
    let designSection = await page.$eval('#design-flow-section', el => window.getComputedStyle(el).display);

    console.log('Watermark after Chat→Journals:', watermark);
    console.log('Journals header active:', journalsActive);
    console.log('Journals section display:', journalsSection);
    console.log('Design Flow section display:', designSection);

    if (watermark.includes('Design Agent')) {
        console.log('\n✗ BUG: Watermark shows Design Flow instead of Journal date!');
    } else {
        console.log('\n✓ Watermark shows correct content');
    }

    // Step 3: Click Journals again to see if it fixes
    console.log('\n=== Step 3: Click Journals again ===');
    await page.click('#journals-header');
    await page.waitForTimeout(500);

    watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    console.log('Watermark after clicking Journals again:', watermark);

    // Step 4: Go back to Chat, then to Design Flow
    console.log('\n=== Step 4: Chat → Design Flow test ===');
    await page.click('#chat-header');
    await page.waitForTimeout(500);
    await page.click('#design-flow-header');
    await page.waitForTimeout(500);

    watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    console.log('Watermark after Chat→Design Flow:', watermark);

    console.log('\nTest complete. Browser staying open for inspection.');
    await new Promise(() => {});
}

testCanvasState().catch(console.error);
