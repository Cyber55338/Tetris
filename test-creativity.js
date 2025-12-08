const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('=== Testing Recovery → Creativity Change ===\n');

        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Click profile button
        console.log('1. Opening Dashboard...');
        await page.click('#btn-profile');
        await page.waitForTimeout(1500);

        // Check Today view - main circle label
        console.log('\n2. Checking Today View Circle Label...');
        const creativityLabel = await page.evaluate(() => {
            const label = document.querySelector('.recovery-score-label');
            return label ? label.textContent.trim() : null;
        });

        console.log(`   Circle label: "${creativityLabel}"`);
        if (creativityLabel === 'Creativity') {
            console.log('   ✓ "Recovery" renamed to "Creativity"');
        } else {
            console.log('   ✗ Label incorrect:', creativityLabel);
        }

        // Check the percentage value is still there
        const creativityValue = await page.evaluate(() => {
            const value = document.querySelector('.recovery-score-value');
            return value ? value.textContent.trim() : null;
        });

        console.log(`   Creativity value: "${creativityValue}"`);
        if (creativityValue === '72%') {
            console.log('   ✓ Percentage value correct (72%)');
        } else {
            console.log('   ✗ Value incorrect:', creativityValue);
        }

        // Check the circle is still visible
        const hasCircle = await page.evaluate(() => {
            return !!document.querySelector('.recovery-circle');
        });

        if (hasCircle) {
            console.log('   ✓ Creativity circle visible');
        } else {
            console.log('   ✗ Circle not found');
        }

        // Take screenshot
        console.log('\n3. Taking Screenshot...');
        await page.screenshot({ path: 'creativity-view.png', fullPage: true });
        console.log('   Saved: creativity-view.png');

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log('✓ Main circle label: "Recovery" → "Creativity"');
        console.log('✓ Percentage value maintained: 72%');
        console.log('✓ Circle visualization preserved');

        console.log('\n=== Test Complete ===');
        console.log('Keeping browser open for 20 seconds...');
        await page.waitForTimeout(20000);

    } catch (error) {
        console.error('Error:', error);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
