const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Waiting for canvas to load...');
    await page.waitForSelector('#workflow-canvas');

    // Test Hero node
    console.log('\n=== Testing Hero Node ===');
    const heroNode = await page.locator('text=Hero').first();

    if (await heroNode.isVisible()) {
        console.log('Found Hero node, dragging to canvas...');
        const canvas = await page.locator('#workflow-canvas');
        const box = await canvas.boundingBox();

        await heroNode.dragTo(canvas, {
            targetPosition: {
                x: box.width / 2,
                y: box.height / 2
            }
        });

        await page.waitForTimeout(2000);

        // Click on the canvas to select the node - try multiple times
        for (let i = 0; i < 3; i++) {
            await page.click('#workflow-canvas', {
                position: {
                    x: box.width / 2,
                    y: box.height / 2
                }
            });
            await page.waitForTimeout(500);
        }

        await page.waitForTimeout(1000);

        // Take screenshot of properties panel
        console.log('Taking screenshot of properties panel...');
        const propertiesPanel = await page.locator('#properties-content');
        await propertiesPanel.screenshot({ path: 'hero-properties-panel.png' });

        // Check for Data source dropdown
        const dataSourceLabel = await page.locator('text=Data source').count();
        console.log(`Found "Data source" label: ${dataSourceLabel} times`);

        const dataSourceSelect = await page.locator('select[data-property="dataSource"]').count();
        console.log(`Found dataSource select: ${dataSourceSelect} times`);

        // Get the options from the dropdown
        if (dataSourceSelect > 0) {
            const options = await page.locator('select[data-property="dataSource"] option').allTextContents();
            console.log('Dropdown options:', options);
        }

        // Get the HTML content of properties panel
        const html = await propertiesPanel.innerHTML();
        console.log('\nProperties panel HTML (dataSource section):');
        const dataSourceMatch = html.match(/<div[^>]*>.*?Data source.*?<\/select><\/div>/s);
        if (dataSourceMatch) {
            console.log(dataSourceMatch[0]);
        }
    } else {
        console.log('Hero node not found.');
    }

    console.log('\n\nInspection complete! Check hero-properties-panel.png');
    console.log('Browser will stay open for 10 seconds...');

    await page.waitForTimeout(10000);
    await browser.close();
})();
