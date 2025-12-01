const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
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

    await page.waitForTimeout(1000);

    console.log('\n=== Testing All Fixes ===\n');

    // TEST 1: Check Prompt textarea height
    const textareaRows = await page.evaluate(() => {
        const textarea = document.querySelector('textarea[data-property="text"]');
        return textarea ? textarea.getAttribute('rows') : null;
    });
    console.log(`1. Prompt textarea height:`);
    console.log(`   Rows: ${textareaRows}`);
    console.log(`   ${textareaRows === '8' ? '✅ PASS' : '❌ FAIL'} - Expected 8 rows for Hero Journey node`);

    // TEST 2: Check button styling (borders)
    const buttonStyles = await page.evaluate(() => {
        const generateBtn = document.querySelector('#generate-ai-btn-node_1');
        if (!generateBtn) return null;

        const computedStyle = window.getComputedStyle(generateBtn);
        return {
            border: computedStyle.border,
            borderWidth: computedStyle.borderWidth,
            borderStyle: computedStyle.borderStyle,
            borderColor: computedStyle.borderColor,
            className: generateBtn.className,
            inlineStyle: generateBtn.getAttribute('style')
        };
    });

    console.log(`\n2. Generate with AI button styling:`);
    if (buttonStyles) {
        console.log(`   Border: ${buttonStyles.border}`);
        console.log(`   Border width: ${buttonStyles.borderWidth}`);
        console.log(`   Classes: ${buttonStyles.className}`);
        console.log(`   ${buttonStyles.borderWidth !== '0px' ? '✅ PASS' : '❌ FAIL'} - Button has visible border`);
    } else {
        console.log(`   ❌ FAIL - Button not found`);
    }

    // TEST 3: Check Data source dropdown visibility
    const dropdownInfo = await page.evaluate(() => {
        const dropdown = document.querySelector('select[data-property="dataSource"]');
        if (!dropdown) return { found: false };

        const computedStyle = window.getComputedStyle(dropdown);
        return {
            found: true,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            optionsCount: dropdown.querySelectorAll('option').length,
            selectedValue: dropdown.value,
            options: Array.from(dropdown.querySelectorAll('option')).map(opt => opt.value)
        };
    });

    console.log(`\n3. Data source dropdown:`);
    console.log(`   Found: ${dropdownInfo.found}`);
    if (dropdownInfo.found) {
        console.log(`   Display: ${dropdownInfo.display}`);
        console.log(`   Visibility: ${dropdownInfo.visibility}`);
        console.log(`   Options count: ${dropdownInfo.optionsCount}`);
        console.log(`   Selected value: "${dropdownInfo.selectedValue}"`);
        console.log(`   Options: ${JSON.stringify(dropdownInfo.options)}`);
        console.log(`   ${dropdownInfo.found && dropdownInfo.display !== 'none' && dropdownInfo.optionsCount === 3 ? '✅ PASS' : '❌ FAIL'} - Dropdown is visible with correct options`);
    } else {
        console.log(`   ❌ FAIL - Dropdown not found`);
    }

    // Take screenshot
    console.log('\n=== Taking Screenshot ===');
    const propertiesPanel = await page.locator('#properties-content');
    await propertiesPanel.screenshot({ path: 'all-fixes-test.png' });
    console.log('Screenshot saved to all-fixes-test.png');

    // Get full HTML snippet for the Prompt textarea
    const promptHTML = await page.evaluate(() => {
        const container = document.getElementById('properties-content');
        const html = container.innerHTML;

        // Extract just the Prompt section
        const promptStart = html.indexOf('Prompt');
        if (promptStart === -1) return 'Prompt section not found';

        const snippet = html.substring(promptStart, promptStart + 200);
        return snippet;
    });

    console.log('\n=== Prompt Textarea HTML Snippet ===');
    console.log(promptHTML.substring(0, 150));

    console.log('\n=== Summary ===');
    console.log(`Textarea height: ${textareaRows === '8' ? '✅' : '❌'}`);
    console.log(`Button border: ${buttonStyles && buttonStyles.borderWidth !== '0px' ? '✅' : '❌'}`);
    console.log(`Data source dropdown: ${dropdownInfo.found && dropdownInfo.display !== 'none' ? '✅' : '❌'}`);

    console.log('\nBrowser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
})();
