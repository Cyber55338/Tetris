const { chromium } = require('playwright');

async function testFinalFix() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Opening app...');
    await page.goto('http://localhost:8888');
    await page.waitForTimeout(2000);

    // Check initial state
    let watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    console.log('Initial watermark:', watermark);

    // Test 1: Chat → Journals
    console.log('\n=== TEST 1: Chat → Journals ===');
    await page.click('#chat-header');
    await page.waitForTimeout(500);
    console.log('Entered Chat mode');

    await page.click('#journals-header');
    await page.waitForTimeout(500);

    watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    let journalsActive = await page.$eval('#journals-header', el => el.classList.contains('active'));
    let journalsSection = await page.$eval('#journals-section', el => window.getComputedStyle(el).display);
    let designSection = await page.$eval('#design-flow-section', el => window.getComputedStyle(el).display);

    console.log('Watermark:', watermark);
    console.log('Journals header active:', journalsActive);
    console.log('Journals section display:', journalsSection);
    console.log('Design Flow section display:', designSection);

    if (!watermark.includes('Design Agent') && journalsActive && journalsSection === 'flex' && designSection === 'none') {
        console.log('✓ Chat → Journals: PASS');
    } else {
        console.log('✗ Chat → Journals: FAIL');
    }

    // Test 2: Chat → Design Flow
    console.log('\n=== TEST 2: Chat → Design Flow ===');
    await page.click('#chat-header');
    await page.waitForTimeout(500);
    console.log('Entered Chat mode');

    await page.click('#design-flow-header');
    await page.waitForTimeout(500);

    watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    let designActive = await page.$eval('#design-flow-header', el => el.classList.contains('active'));
    journalsSection = await page.$eval('#journals-section', el => window.getComputedStyle(el).display);
    designSection = await page.$eval('#design-flow-section', el => window.getComputedStyle(el).display);

    console.log('Watermark:', watermark);
    console.log('Design Flow header active:', designActive);
    console.log('Journals section display:', journalsSection);
    console.log('Design Flow section display:', designSection);

    if (watermark.includes('Design Agent') && designActive && designSection === 'flex') {
        console.log('✓ Chat → Design Flow: PASS');
    } else {
        console.log('✗ Chat → Design Flow: FAIL');
    }

    // Test 3: Journals → Design Flow (verify no regression)
    console.log('\n=== TEST 3: Journals → Design Flow ===');
    await page.click('#journals-header');
    await page.waitForTimeout(500);
    await page.click('#design-flow-header');
    await page.waitForTimeout(500);

    watermark = await page.$eval('#canvas-watermark', el => el.textContent);
    designActive = await page.$eval('#design-flow-header', el => el.classList.contains('active'));
    console.log('Watermark:', watermark);
    console.log('Design Flow header active:', designActive);

    if (watermark.includes('Design Agent') && designActive) {
        console.log('✓ Journals → Design Flow: PASS');
    } else {
        console.log('✗ Journals → Design Flow: FAIL');
    }

    console.log('\n=== All tests complete ===');
    await browser.close();
}

testFinalFix().catch(console.error);
