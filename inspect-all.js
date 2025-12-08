const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        bypassCSP: true
    });
    const page = await context.newPage();

    // Disable cache
    await page.route('**/*', route => {
        route.continue({
            headers: {
                ...route.request().headers(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
    });

    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

    // Hard refresh to clear cache
    console.log('Performing hard refresh to clear cache...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Waiting for canvas to load...');
    await page.waitForSelector('#workflow-canvas');

    // Test nodes from different categories
    const nodesToTest = [
        { name: 'Emotion', category: 'Mind Inventory', shouldHaveDataSource: true },
        { name: 'Dreams', category: 'Perception Graph', shouldHaveDataSource: true },
        { name: 'Hero', category: 'Hero Journey', shouldHaveDataSource: false },
        { name: 'Friends', category: 'Social', shouldHaveDataSource: false },
        { name: 'Picture', category: 'Utility', shouldHaveDataSource: false }
    ];

    for (const nodeTest of nodesToTest) {
        console.log(`\n=== Testing ${nodeTest.name} (${nodeTest.category}) ===`);

        // Clear canvas first - handle the confirm dialog
        page.once('dialog', async dialog => {
            await dialog.accept();
        });
        await page.click('#btn-clear');
        await page.waitForTimeout(1000);

        // Find and drag the node
        const nodeElement = await page.locator(`text=${nodeTest.name}`).first();

        if (await nodeElement.isVisible()) {
            console.log(`Found ${nodeTest.name} node, dragging to canvas...`);
            const canvas = await page.locator('#workflow-canvas');
            const box = await canvas.boundingBox();

            await nodeElement.dragTo(canvas, {
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

            await page.waitForTimeout(1500);

            // Verify which node is selected
            const selectedNodeType = await page.locator('.property-value').first().textContent({ timeout: 5000 }).catch(() => 'Unknown');
            console.log(`Selected node type: ${selectedNodeType}`);

            // Check for Data source dropdown
            const dataSourceLabel = await page.locator('text=Data source').count();
            const dataSourceSelect = await page.locator('select[data-property="dataSource"]').count();

            console.log(`Found "Data source" label: ${dataSourceLabel} times`);
            console.log(`Found dataSource select: ${dataSourceSelect} times`);

            const hasDataSource = dataSourceLabel > 0 && dataSourceSelect > 0;

            if (nodeTest.shouldHaveDataSource) {
                console.log(`✓ PASS: ${nodeTest.name} ${hasDataSource ? 'HAS' : 'MISSING'} Data source dropdown (expected to have it)`);
            } else {
                console.log(`✓ PASS: ${nodeTest.name} ${hasDataSource ? 'HAS' : 'DOES NOT HAVE'} Data source dropdown (expected NOT to have it)`);
            }

            if (hasDataSource !== nodeTest.shouldHaveDataSource) {
                console.log(`✗ FAIL: Mismatch for ${nodeTest.name}!`);
            }
        } else {
            console.log(`✗ FAIL: ${nodeTest.name} node not found!`);
        }
    }

    console.log('\n\nInspection complete!');
    console.log('Browser will close in 5 seconds...');

    await page.waitForTimeout(5000);
    await browser.close();
})();
