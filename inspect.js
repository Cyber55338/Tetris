const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(2000);

    console.log('Waiting for canvas to load...');
    await page.waitForSelector('#workflow-canvas');

    // Add a node from Mind Inventory
    console.log('Looking for Mind Inventory category...');
    const thoughtNode = await page.locator('text=Thought').first();

    if (await thoughtNode.isVisible()) {
        console.log('Found Thought node, dragging to canvas...');
        const canvas = await page.locator('#workflow-canvas');
        const box = await canvas.boundingBox();

        await thoughtNode.dragTo(canvas, {
            targetPosition: {
                x: box.width / 2,
                y: box.height / 2
            }
        });

        await page.waitForTimeout(1000);

        // Click on the canvas to select the node
        await page.click('#workflow-canvas', {
            position: {
                x: box.width / 2,
                y: box.height / 2
            }
        });

        await page.waitForTimeout(1000);

        // Take screenshot of properties panel
        console.log('Taking screenshot of properties panel...');
        const propertiesPanel = await page.locator('#properties-content');
        await propertiesPanel.screenshot({ path: 'properties-panel.png' });

        // Check for Data source dropdown
        const dataSourceLabel = await page.locator('text=Data source').count();
        console.log(`Found "Data source" label: ${dataSourceLabel} times`);

        const dataSourceSelect = await page.locator('select[data-property="dataSource"]').count();
        console.log(`Found dataSource select: ${dataSourceSelect} times`);

        // Get the HTML content of properties panel
        const html = await propertiesPanel.innerHTML();
        console.log('\nProperties panel HTML:');
        console.log(html);
    } else {
        console.log('Thought node not found. Taking full page screenshot...');
        await page.screenshot({ path: 'full-page.png', fullPage: true });
    }

    console.log('\nInspection complete! Check properties-panel.png');
    console.log('Browser will stay open for manual inspection...');

    // Keep browser open for manual inspection
    await page.waitForTimeout(60000);
    await browser.close();
})();
