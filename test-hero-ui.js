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

    console.log('\n=== Creating Hero Node ===');
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

    await page.waitForTimeout(1000);

    console.log('\n=== Test Results ===\n');

    // Test 1: Check for circular profile picture placeholder
    const hasCircularPlaceholder = await page.evaluate(() => {
        const propertiesContent = document.getElementById('properties-content');
        const html = propertiesContent.innerHTML;
        // Look for SVG with user icon (placeholder)
        return html.includes('width: 150px; height: 150px; border-radius: 75px');
    });
    console.log(`1. ✓ Circular profile picture placeholder (150px): ${hasCircularPlaceholder ? '✓ PASS' : '✗ FAIL'}`);

    // Test 2: Check for "Prompt" label (not "Text")
    const hasPromptLabel = await page.locator('text=Prompt').count();
    const hasTextLabel = await page.locator('text=Text').count();
    console.log(`2. "Prompt" label found: ${hasPromptLabel > 0 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`   "Text" label should NOT be found: ${hasTextLabel === 0 ? '✓ PASS' : '✗ FAIL (found ' + hasTextLabel + ')'}`);

    // Test 3: Check for "Generate with AI" button
    const generateAIBtn = await page.locator('text=Generate with AI').count();
    console.log(`3. "Generate with AI" button: ${generateAIBtn > 0 ? '✓ PASS' : '✗ FAIL'}`);

    // Test 4: Check for "Add file" button
    const addFileBtn = await page.locator('text=Add file').count();
    console.log(`4. "Add file" button: ${addFileBtn > 0 ? '✓ PASS' : '✗ FAIL'}`);

    // Test 5: Check that buttons are below image input
    const buttonsLayout = await page.evaluate(() => {
        const propertiesContent = document.getElementById('properties-content');
        const html = propertiesContent.innerHTML;
        // Check that buttons come after image input
        const imageInputIndex = html.indexOf('data-property="image"');
        const generateBtnIndex = html.indexOf('Generate with AI');
        const addFileBtnIndex = html.indexOf('Add file');
        return imageInputIndex > -1 && generateBtnIndex > imageInputIndex && addFileBtnIndex > imageInputIndex;
    });
    console.log(`5. Buttons positioned below image input: ${buttonsLayout ? '✓ PASS' : '✗ FAIL'}`);

    // Test 6: Check Progress bar is present
    const hasProgress = await page.locator('text=Progress').count();
    console.log(`6. Progress bar section: ${hasProgress > 0 ? '✓ PASS' : '✗ FAIL'}`);

    // Test 7: Check Data source dropdown
    const hasDataSource = await page.locator('text=Data source').count();
    console.log(`7. Data source dropdown: ${hasDataSource > 0 ? '✓ PASS' : '✗ FAIL'}`);

    // Take screenshot
    console.log('\n=== Taking screenshot ===');
    const propertiesPanel = await page.locator('#properties-content');
    await propertiesPanel.screenshot({ path: 'hero-ui-test.png' });
    console.log('Screenshot saved to hero-ui-test.png');

    // Get full HTML for debugging
    const html = await propertiesPanel.innerHTML();
    console.log('\n=== Properties Panel HTML Structure ===');
    console.log('Profile picture section:', html.includes('150px') ? 'Found' : 'Missing');
    console.log('Prompt textarea:', html.includes('Prompt') ? 'Found' : 'Missing');
    console.log('Generate with AI button:', html.includes('Generate with AI') ? 'Found' : 'Missing');
    console.log('Add file button:', html.includes('Add file') ? 'Found' : 'Missing');

    console.log('\n=== Test Complete ===');
    console.log('Browser will stay open for 10 seconds for manual inspection...');

    await page.waitForTimeout(10000);
    await browser.close();
})();
