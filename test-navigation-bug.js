const { chromium } = require('playwright');

async function testNavigationBug() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Opening app...');
    await page.goto('http://localhost:8888');
    await page.waitForTimeout(2000);

    // Step 1: Click on Chat mode
    console.log('\n=== Step 1: Entering Chat mode ===');
    const chatHeader = page.locator('#chat-header');
    await chatHeader.click();
    await page.waitForTimeout(1000);

    // Check state after entering Chat
    const chatHeaderActive = await page.locator('#chat-header.active').count();
    const propertiesContent = await page.locator('#properties-content').innerHTML();
    console.log('Chat header active:', chatHeaderActive > 0);
    console.log('Properties panel has chat content:', propertiesContent.includes('chat'));

    // Step 2: Click on Journals from Chat mode
    console.log('\n=== Step 2: Navigating from Chat to Journals ===');
    const journalsHeader = page.locator('#journals-header');
    await journalsHeader.click();
    await page.waitForTimeout(1000);

    // Check state after transition
    const journalsHeaderActive = await page.locator('#journals-header.active').count();
    const chatHeaderStillActive = await page.locator('#chat-header.active').count();
    const designFlowHeaderActive = await page.locator('#design-flow-header.active').count();

    console.log('Journals header active:', journalsHeaderActive > 0);
    console.log('Chat header still active (BUG if true):', chatHeaderStillActive > 0);
    console.log('Design Flow header active:', designFlowHeaderActive > 0);

    // Check for duplicated headers
    const allHeaders = await page.locator('.nav-item.active').count();
    console.log('Total active headers (should be 1):', allHeaders);

    // Check if chat history can be closed
    const chatHistoryContainer = page.locator('#chat-history-container');
    const chatHistoryDisplay = await chatHistoryContainer.evaluate(el => window.getComputedStyle(el).display);
    console.log('Chat history display style:', chatHistoryDisplay);

    // Check properties panel state
    const propertiesContentAfter = await page.locator('#properties-content').innerHTML();
    console.log('Properties panel still has chat content (BUG if true):', propertiesContentAfter.includes('chat-panel'));

    // Step 3: Try going back to Design Flow
    console.log('\n=== Step 3: Navigating to Design Flow ===');
    const designFlowHeader = page.locator('#design-flow-header');
    await designFlowHeader.click();
    await page.waitForTimeout(1000);

    const designFlowActiveAfter = await page.locator('#design-flow-header.active').count();
    console.log('Design Flow header active:', designFlowActiveAfter > 0);

    // Step 4: Go to Chat mode again
    console.log('\n=== Step 4: Entering Chat mode again ===');
    await chatHeader.click();
    await page.waitForTimeout(1000);

    // Step 5: Now go directly to Design Flow from Chat
    console.log('\n=== Step 5: Navigating from Chat to Design Flow ===');
    await designFlowHeader.click();
    await page.waitForTimeout(1000);

    const designFlowActive2 = await page.locator('#design-flow-header.active').count();
    const chatHeaderActive2 = await page.locator('#chat-header.active').count();
    console.log('Design Flow header active:', designFlowActive2 > 0);
    console.log('Chat header still active (BUG if true):', chatHeaderActive2 > 0);

    // Take screenshot
    await page.screenshot({ path: 'navigation-bug-result.png', fullPage: true });
    console.log('\nScreenshot saved as navigation-bug-result.png');

    // Keep browser open for inspection
    console.log('\n=== Test complete. Browser staying open for inspection ===');
    console.log('Press Ctrl+C to close.');

    // Wait indefinitely
    await new Promise(() => {});
}

testNavigationBug().catch(console.error);
