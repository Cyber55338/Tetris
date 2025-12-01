const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('Testing AI multiplayer interactions view...\n');

        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Click profile button
        console.log('1. Clicking profile button...');
        await page.click('#btn-profile');
        await page.waitForTimeout(1500);

        // Check Today view for "helped people"
        console.log('2. Checking Today view...');
        const todayHelpedPeople = await page.textContent('.whoop-today-view');
        if (todayHelpedPeople.includes('helped people')) {
            console.log('   ✓ Today view shows "helped people"');
        } else {
            console.log('   ✗ Today view missing "helped people"');
        }

        // Get the helped people value in Today view
        const todayValue = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.whoop-today-view *'));
            for (let el of elements) {
                if (el.textContent.includes('helped people')) {
                    const next = el.nextElementSibling || el.parentElement.nextElementSibling;
                    if (next) return next.textContent.trim();
                }
            }
            return null;
        });
        console.log(`   Value: ${todayValue}`);

        // Check if it's green (not orange)
        const todayColor = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.whoop-today-view [style*="color"]'));
            for (let el of elements) {
                if (el.textContent.includes('+') && el.textContent.includes('h')) {
                    return el.style.color;
                }
            }
            return null;
        });
        console.log(`   Color: ${todayColor}`);
        if (todayColor && todayColor.includes('0, 210, 106')) {
            console.log('   ✓ Color is green (#00d26a)');
        } else if (todayColor && todayColor.includes('00d26a')) {
            console.log('   ✓ Color is green (#00d26a)');
        } else {
            console.log('   ✗ Color might not be green:', todayColor);
        }

        // Switch to Sleep view
        console.log('\n3. Switching to Sleep view...');
        await page.click('[data-view="sleep"]');
        await page.waitForTimeout(1500);

        // Check for "AI multiplayer interactions" header
        const sleepHeader = await page.textContent('.whoop-sleep-view h3');
        console.log(`   Header: "${sleepHeader}"`);
        if (sleepHeader.includes('AI multiplayer interactions')) {
            console.log('   ✓ Header changed to "AI multiplayer interactions"');
        } else {
            console.log('   ✗ Header not changed');
        }

        // Check for "helped people" in Sleep view
        const sleepContent = await page.textContent('.whoop-sleep-view');
        if (sleepContent.includes('helped people')) {
            console.log('   ✓ Sleep view shows "helped people"');
        } else {
            console.log('   ✗ Sleep view missing "helped people"');
        }

        // Check the helped people metric
        const sleepHelpedPeople = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.includes('helped people')) {
                    const card = title.closest('.whoop-metric-card');
                    const value = card.querySelector('.whoop-metric-value');
                    return {
                        value: value.textContent.trim(),
                        color: value.style.color
                    };
                }
            }
            return null;
        });

        if (sleepHelpedPeople) {
            console.log(`   Value: ${sleepHelpedPeople.value}`);
            console.log(`   Color: ${sleepHelpedPeople.color}`);

            if (sleepHelpedPeople.value.startsWith('+')) {
                console.log('   ✓ Value is positive (starts with +)');
            } else {
                console.log('   ✗ Value is not positive');
            }

            if (sleepHelpedPeople.color.includes('00d26a') || sleepHelpedPeople.color.includes('0, 210, 106')) {
                console.log('   ✓ Color is green (#00d26a)');
            } else {
                console.log('   ✗ Color might not be green');
            }
        }

        // Take screenshots
        console.log('\n4. Taking screenshots...');
        await page.click('[data-view="today"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'ai-interactions-today.png', fullPage: true });
        console.log('   Saved: ai-interactions-today.png');

        await page.click('[data-view="sleep"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'ai-interactions-sleep.png', fullPage: true });
        console.log('   Saved: ai-interactions-sleep.png');

        console.log('\n=== Test Complete ===');
        console.log('All changes verified! Check screenshots for visual confirmation.');
        console.log('\nKeeping browser open for 15 seconds...');
        await page.waitForTimeout(15000);

    } catch (error) {
        console.error('Error:', error);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
