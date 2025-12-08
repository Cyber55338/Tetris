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

    // Check the node's properties
    const nodeInfo = await page.evaluate(() => {
        if (window.app && window.app.canvasRenderer && window.app.canvasRenderer.nodes.length > 0) {
            const node = window.app.canvasRenderer.nodes[0];

            // Get node properties
            const properties = {};
            for (const key in node.properties) {
                properties[key] = node.properties[key];
            }

            // Get node definition
            const definition = NodeDefinitions[node.type];
            const defProps = definition?.properties?.map(p => p.name) || [];

            return {
                nodeType: node.type,
                nodeProperties: properties,
                definitionProperties: defProps,
                hasDataSourceProp: 'dataSource' in node.properties,
                dataSourceValue: node.properties.dataSource
            };
        }
        return null;
    });

    console.log('\n=== Node Investigation ===');
    console.log('Node Type:', nodeInfo.nodeType);
    console.log('Has dataSource property:', nodeInfo.hasDataSourceProp);
    console.log('DataSource value:', nodeInfo.dataSourceValue);
    console.log('\nActual properties on node:', JSON.stringify(nodeInfo.nodeProperties, null, 2));
    console.log('\nDefined properties:', nodeInfo.definitionProperties);

    // Select the node and check UI
    await page.evaluate(() => {
        if (window.app && window.app.canvasRenderer && window.app.canvasRenderer.nodes.length > 0) {
            const node = window.app.canvasRenderer.nodes[0];
            window.app.canvasRenderer.selectNode(node);
            window.app.updatePropertiesPanel(node);
        }
    });

    await page.waitForTimeout(1000);

    // Check if dropdown is in the HTML
    const dropdownCount = await page.locator('select[data-property="dataSource"]').count();
    const dataSourceLabelCount = await page.locator('text=Data source').count();

    console.log('\n=== UI Check ===');
    console.log('Data source dropdown found:', dropdownCount > 0);
    console.log('Data source label found:', dataSourceLabelCount > 0);

    // Get the full properties HTML
    const propertiesHTML = await page.evaluate(() => {
        const content = document.getElementById('properties-content');
        return content ? content.innerHTML : 'Not found';
    });

    // Check for dataSource in HTML
    console.log('\ndataSource in HTML:', propertiesHTML.includes('dataSource'));
    console.log('Data source label in HTML:', propertiesHTML.includes('Data source'));

    console.log('\nBrowser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
})();
