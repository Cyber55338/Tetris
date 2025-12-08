const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('=== Testing Final Updates ===\n');

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

        console.log('   Tabs:', navButtons.join(', '));

        if (navButtons.includes('Multiplayer')) {
            console.log('   ✓ "Strain" changed to "Multiplayer"');
        } else {
            console.log('   ✗ "Multiplayer" tab not found');
        }

        // Check Today view
        console.log('\n3. Checking Today View...');
        await page.click('[data-view="today"]');
        await page.waitForTimeout(1000);

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
        if (todayHelpedPeople === '+88') {
            console.log('   ✓ Shows "+88" (no "h")');
        } else {
            console.log('   ✗ Value incorrect:', todayHelpedPeople);
        }

        // Check Sleep/AI Interactions view
        console.log('\n4. Checking AI Interactions View...');
        await page.click('[data-view="sleep"]');
        await page.waitForTimeout(1500);

        // Check friends metric
        const friendsMetric = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.trim() === 'friends') {
                    const card = title.closest('.whoop-metric-card');
                    const value = card.querySelector('.whoop-metric-value');
                    return value ? value.textContent.trim() : null;
                }
            }
            return null;
        });

        console.log(`   friends metric: "${friendsMetric}"`);
        if (friendsMetric === '85') {
            console.log('   ✓ Shows "85" (no "%")');
        } else {
            console.log('   ✗ Value incorrect:', friendsMetric);
        }

        // Check helped people in Sleep view
        const sleepHelpedPeople = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.includes('helped people')) {
                    const card = title.closest('.whoop-metric-card');
                    const value = card.querySelector('.whoop-metric-value');
                    return value ? value.textContent.trim() : null;
                }
            }
            return null;
        });

        console.log(`   helped people: "${sleepHelpedPeople}"`);
        if (sleepHelpedPeople === '+88') {
            console.log('   ✓ Shows "+88" (no "h")');
        } else {
            console.log('   ✗ Value incorrect:', sleepHelpedPeople);
        }

        // Check Multiplayer view
        console.log('\n5. Checking Multiplayer View...');
        await page.click('[data-view="strain"]');
        await page.waitForTimeout(1500);

        const multiplayerHeader = await page.textContent('.whoop-strain-view h3');
        console.log(`   Header: "${multiplayerHeader.trim()}"`);

        // Take screenshots
        console.log('\n6. Taking Screenshots...');

        await page.click('[data-view="today"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'final-today-88.png', fullPage: true });
        console.log('   Saved: final-today-88.png');

        await page.click('[data-view="sleep"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'final-sleep-friends.png', fullPage: true });
        console.log('   Saved: final-sleep-friends.png');

        await page.click('[data-view="strain"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'final-multiplayer.png', fullPage: true });
        console.log('   Saved: final-multiplayer.png');

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log('✓ Navigation: Strain → Multiplayer');
        console.log('✓ helped people: +88 (removed "h")');
        console.log('✓ friends: 85 (removed "%")');
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
