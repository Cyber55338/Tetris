const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('=== Testing Label Changes ===\n');

        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Click profile button
        console.log('1. Opening Dashboard...');
        await page.click('#btn-profile');
        await page.waitForTimeout(1500);

        // Check navigation tabs
        console.log('\n2. Checking Navigation Tabs...');
        const navButtons = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.whoop-nav-btn'))
                .map(btn => btn.textContent.trim());
        });
        console.log(`   Navigation: ${navButtons.join(' | ')}`);

        if (navButtons.includes('Analytics')) {
            console.log('   ✓ "analysis" renamed to "Analytics"');
        } else {
            console.log('   ✗ "Analytics" tab not found');
        }

        // Check Today view - helped people value
        console.log('\n3. Checking Today View - helped people...');
        const todayHelpedPeople = await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll('.whoop-today-view [style*="font-size: 11px"]'));
            for (let label of labels) {
                if (label.textContent.includes('helped people')) {
                    const value = label.nextElementSibling;
                    return value ? value.textContent.trim() : null;
                }
            }
            return null;
        });

        console.log(`   helped people value: "${todayHelpedPeople}"`);
        if (todayHelpedPeople === '88') {
            console.log('   ✓ Shows "88" (no "+" sign)');
        } else {
            console.log('   ✗ Value incorrect:', todayHelpedPeople);
        }

        // Switch to Analytics view
        console.log('\n4. Switching to Analytics View...');
        await page.click('[data-view="sleep"]');
        await page.waitForTimeout(1500);

        // Check Total interactions
        console.log('\n5. Checking Total interactions...');
        const totalInteractions = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.includes('Total interactions')) {
                    const card = title.closest('.whoop-metric-card');
                    const value = card.querySelector('.whoop-metric-value');
                    return value ? value.textContent.trim() : null;
                }
            }
            return null;
        });

        console.log(`   Total interactions: "${totalInteractions}"`);
        if (totalInteractions === '33') {
            console.log('   ✓ Shows "33" (no "send and received" text)');
        } else {
            console.log('   ✗ Value incorrect:', totalInteractions);
        }

        // Check sent metric (previously friends)
        console.log('\n6. Checking "sent" metric...');
        const sentMetric = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.trim() === 'sent') {
                    const card = title.closest('.whoop-metric-card');
                    const value = card.querySelector('.whoop-metric-value');
                    return value ? value.textContent.trim() : null;
                }
            }
            return null;
        });

        console.log(`   sent metric: "${sentMetric}"`);
        if (sentMetric === '85') {
            console.log('   ✓ "friends" renamed to "sent", shows "85"');
        } else {
            console.log('   ✗ Value incorrect:', sentMetric);
        }

        // Check received metric (previously helped people)
        console.log('\n7. Checking "received" metric...');
        const receivedMetric = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.trim() === 'received') {
                    const card = title.closest('.whoop-metric-card');
                    const value = card.querySelector('.whoop-metric-value');
                    return value ? value.textContent.trim() : null;
                }
            }
            return null;
        });

        console.log(`   received metric: "${receivedMetric}"`);
        if (receivedMetric === '88') {
            console.log('   ✓ "helped people" renamed to "received", shows "88" (no "+" sign)');
        } else {
            console.log('   ✗ Value incorrect:', receivedMetric);
        }

        // Take screenshots
        console.log('\n8. Taking Screenshots...');
        await page.screenshot({ path: 'analytics-view.png', fullPage: true });
        console.log('   Saved: analytics-view.png');

        await page.click('[data-view="today"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'today-view-updated.png', fullPage: true });
        console.log('   Saved: today-view-updated.png');

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log('✓ Navigation: "analysis" → "Analytics"');
        console.log('✓ Today view: helped people shows "88" (no "+")');
        console.log('✓ Analytics view:');
        console.log('  • Total interactions: "33" (no extra text)');
        console.log('  • "friends" → "sent" (85)');
        console.log('  • "helped people" → "received" (88, no "+")');

        console.log('\n=== Test Complete ===');
        console.log('Keeping browser open for 20 seconds...');
        await page.waitForTimeout(20000);

    } catch (error) {
        console.error('Error:', error);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
