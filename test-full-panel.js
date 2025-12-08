const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

    // Hard refresh to clear cache
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Creating Hero node...');
    await page.evaluate(() => {
        if (window.app && window.app.addNodeAtCenter) {
            window.app.addNodeAtCenter('Hero');
        }
    });

    await page.waitForTimeout(1000);

    // Select the node
    await page.evaluate(() => {
        if (window.app && window.app.canvasRenderer && window.app.canvasRenderer.nodes.length > 0) {
            const node = window.app.canvasRenderer.nodes[0];
            window.app.canvasRenderer.selectNode(node);
            window.app.updatePropertiesPanel(node);
        }
    });

    await page.waitForTimeout(1500);

    // Take full screenshot of the entire properties panel
    console.log('Taking full screenshot of properties panel...');
    const propertiesPanel = await page.locator('#properties-content');
    await propertiesPanel.screenshot({ path: 'full-properties-panel.png', fullPage: true });

    // Check if buttons exist
    const buttonsInfo = await page.evaluate(() => {
        const generateBtn = document.querySelector('button[id^="generate-ai-btn"]');
        const addFileBtn = document.querySelector('button[id^="add-file-btn"]');

        const getButtonStyle = (btn) => {
            if (!btn) return null;
            const computed = window.getComputedStyle(btn);
            return {
                id: btn.id,
                className: btn.className,
                border: computed.border,
                borderWidth: computed.borderWidth,
                padding: computed.padding,
                display: computed.display
            };
        };

        return {
            generateBtn: getButtonStyle(generateBtn),
            addFileBtn: getButtonStyle(addFileBtn)
        };
    });

    console.log('\n=== Button Inspection ===');
    console.log('Generate with AI button:');
    if (buttonsInfo.generateBtn) {
        console.log(`  ID: ${buttonsInfo.generateBtn.id}`);
        console.log(`  Classes: ${buttonsInfo.generateBtn.className}`);
        console.log(`  Border: ${buttonsInfo.generateBtn.border}`);
        console.log(`  Border width: ${buttonsInfo.generateBtn.borderWidth}`);
        console.log(`  ✅ PASS - Button found with border: ${buttonsInfo.generateBtn.borderWidth}`);
    } else {
        console.log('  ❌ FAIL - Button not found');
    }

    console.log('\nAdd file button:');
    if (buttonsInfo.addFileBtn) {
        console.log(`  ID: ${buttonsInfo.addFileBtn.id}`);
        console.log(`  Classes: ${buttonsInfo.addFileBtn.className}`);
        console.log(`  Border: ${buttonsInfo.addFileBtn.border}`);
        console.log(`  Border width: ${buttonsInfo.addFileBtn.borderWidth}`);
        console.log(`  ✅ PASS - Button found with border: ${buttonsInfo.addFileBtn.borderWidth}`);
    } else {
        console.log('  ❌ FAIL - Button not found');
    }

    console.log('\nFull screenshot saved to full-properties-panel.png');
    console.log('Browser will stay open for 15 seconds...');
    await page.waitForTimeout(15000);
    await browser.close();
})();
