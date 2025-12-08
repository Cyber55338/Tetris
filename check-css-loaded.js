const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check what CSS is loaded
    const cssInfo = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        const results = [];

        for (const sheet of stylesheets) {
            try {
                const href = sheet.href || 'inline';
                const rules = Array.from(sheet.cssRules || []);

                // Find .btn-primary rule
                const btnPrimaryRule = rules.find(r => r.selectorText === '.btn-primary');

                if (btnPrimaryRule) {
                    results.push({
                        href: href,
                        selector: btnPrimaryRule.selectorText,
                        cssText: btnPrimaryRule.style.cssText,
                        border: btnPrimaryRule.style.border,
                        borderWidth: btnPrimaryRule.style.borderWidth
                    });
                }
            } catch (e) {
                // CORS might prevent access to some stylesheets
            }
        }

        return results;
    });

    console.log('\n=== CSS Rules for .btn-primary ===');
    cssInfo.forEach(info => {
        console.log(`Stylesheet: ${info.href}`);
        console.log(`CSS Text: ${info.cssText}`);
        console.log(`Border: ${info.border}`);
        console.log(`Border Width: ${info.borderWidth}`);
        console.log('---');
    });

    await browser.close();
})();
