const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen for console messages
    page.on('console', msg => {
        console.log('Browser console:', msg.text());
    });

    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

    // Hard refresh to clear cache
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check if Send button exists and has correct styling
    const sendBtnInfo = await page.evaluate(() => {
        const sendBtn = document.getElementById('btn-send');
        if (!sendBtn) return null;

        const computed = window.getComputedStyle(sendBtn);
        return {
            exists: true,
            text: sendBtn.textContent.trim(),
            classes: sendBtn.className,
            border: computed.border,
            borderWidth: computed.borderWidth,
            background: computed.backgroundColor,
            visible: computed.display !== 'none'
        };
    });

    console.log('\n=== Send Button Test ===');
    if (sendBtnInfo) {
        console.log('✅ Send button found!');
        console.log(`   Text: "${sendBtnInfo.text}"`);
        console.log(`   Classes: ${sendBtnInfo.classes}`);
        console.log(`   Border: ${sendBtnInfo.border}`);
        console.log(`   Border width: ${sendBtnInfo.borderWidth}`);
        console.log(`   Background: ${sendBtnInfo.background}`);
        console.log(`   Visible: ${sendBtnInfo.visible}`);
    } else {
        console.log('❌ Send button not found');
    }

    // Test clicking the button
    console.log('\nClicking Send button...');
    await page.click('#btn-send');
    await page.waitForTimeout(500);

    console.log('\nTest complete! Browser will stay open for 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
})();
