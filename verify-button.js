const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Opening page with cache disabled...');

        // Navigate with cache disabled
        await page.goto('http://localhost:8000', {
            waitUntil: 'networkidle'
        });

        // Wait for page to load
        await page.waitForTimeout(2000);

        // Check HTML content to see if profile button exists in source
        const htmlContent = await page.content();
        const hasProfileButton = htmlContent.includes('btn-profile');

        console.log('Profile button in HTML:', hasProfileButton ? '✓ YES' : '✗ NO');

        // Check if button is in DOM
        const profileBtn = await page.$('#btn-profile');
        console.log('Profile button in DOM:', profileBtn ? '✓ YES' : '✗ NO');

        // Check loaded script versions
        const scripts = await page.$$eval('script[src]', (scripts) =>
            scripts.map(s => s.src)
        );

        console.log('\nLoaded scripts:');
        scripts.forEach(src => {
            console.log('  -', src);
        });

        // Check CSS version
        const cssVersion = await page.$eval('link[rel="stylesheet"]', (link) => link.href);
        console.log('\nLoaded CSS:', cssVersion);

        if (profileBtn) {
            console.log('\n✓✓✓ PROFILE BUTTON IS PRESENT ✓✓✓');

            // Highlight it
            await page.evaluate(() => {
                const btn = document.getElementById('btn-profile');
                if (btn) {
                    btn.style.border = '5px solid lime';
                    btn.style.boxShadow = '0 0 20px lime';
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });

            console.log('\nButton is highlighted with LIME border!');
            console.log('Look at the browser window - it should be glowing green!');

        } else {
            console.log('\n✗✗✗ PROFILE BUTTON IS MISSING ✗✗✗');
            console.log('This means the browser is still loading old cached files.');
            console.log('\nTry these steps:');
            console.log('1. Close ALL browser tabs with localhost:8000');
            console.log('2. Press Ctrl+Shift+Delete to clear cache');
            console.log('3. Or try a different browser (Edge, Firefox, Chrome)');
        }

        console.log('\nKeeping browser open for 30 seconds...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
