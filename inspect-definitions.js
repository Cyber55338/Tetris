const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Evaluate JavaScript in the browser context to check NodeDefinitions
    const heroDefinition = await page.evaluate(() => {
        if (typeof NodeDefinitions !== 'undefined' && NodeDefinitions.Hero) {
            return {
                properties: NodeDefinitions.Hero.properties
            };
        }
        return null;
    });

    console.log('=== Hero Node Definition (from browser) ===');
    console.log(JSON.stringify(heroDefinition, null, 2));

    if (heroDefinition && heroDefinition.properties) {
        const hasDataSource = heroDefinition.properties.some(p => p.name === 'dataSource');
        console.log(`\n${hasDataSource ? '❌ FAIL' : '✓ PASS'}: Hero ${hasDataSource ? 'HAS' : 'DOES NOT HAVE'} dataSource property`);
    }

    console.log('\nBrowser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
})();
