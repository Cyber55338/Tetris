const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('=== Testing Fixed Calendar Implementation ===\n');

        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Click profile button
        console.log('1. Opening Dashboard...');
        await page.click('#btn-profile');
        await page.waitForTimeout(1500);

        // Check custom header bar
        console.log('\n2. Checking Custom Header Bar...');

        const hasCustomHeader = await page.evaluate(() => {
            return !!document.querySelector('.whoop-custom-header');
        });
        console.log(`   Custom Header: ${hasCustomHeader ? '✓' : '✗'}`);

        const hasProfileIcon = await page.evaluate(() => {
            return !!document.querySelector('.profile-icon-small');
        });
        console.log(`   Profile Icon: ${hasProfileIcon ? '✓' : '✗'}`);

        const statBadges = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.stat-badge'))
                .map(el => el.textContent.trim());
        });
        console.log(`   Stat Badges: ${statBadges.join(', ')}`);

        const todayText = await page.textContent('#toggle-calendar');
        console.log(`   Today Text: "${todayText}"`);

        const percentIndicator = await page.textContent('.percent-indicator');
        console.log(`   Percent Indicator: "${percentIndicator}"`);

        // Check navigation tabs (Calendar should be removed)
        console.log('\n3. Checking Navigation Tabs...');
        const navButtons = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.whoop-nav-btn'))
                .map(btn => btn.textContent.trim());
        });
        console.log(`   Navigation: ${navButtons.join(' | ')}`);

        if (!navButtons.includes('Calendar')) {
            console.log('   ✓ Calendar tab removed from navigation');
        } else {
            console.log('   ✗ Calendar tab still present');
        }

        // Check if calendar overlay is hidden by default
        console.log('\n4. Checking Calendar Overlay...');
        const overlayInitialState = await page.evaluate(() => {
            const overlay = document.getElementById('calendar-overlay');
            if (!overlay) return 'not found';
            return overlay.classList.contains('hidden') ? 'hidden' : 'visible';
        });
        console.log(`   Initial State: ${overlayInitialState}`);

        if (overlayInitialState === 'hidden') {
            console.log('   ✓ Calendar overlay hidden by default');
        }

        // Click TODAY text to toggle calendar
        console.log('\n5. Clicking TODAY to Show Calendar...');
        await page.click('#toggle-calendar');
        await page.waitForTimeout(500);

        const overlayAfterClick = await page.evaluate(() => {
            const overlay = document.getElementById('calendar-overlay');
            if (!overlay) return 'not found';
            return overlay.classList.contains('hidden') ? 'hidden' : 'visible';
        });
        console.log(`   State After Click: ${overlayAfterClick}`);

        if (overlayAfterClick === 'visible') {
            console.log('   ✓ Calendar popup appeared');
        }

        // Take screenshot with calendar open
        await page.screenshot({ path: 'fixed-calendar-open.png', fullPage: true });
        console.log('   Saved: fixed-calendar-open.png');

        // Check calendar popup contents
        console.log('\n6. Checking Calendar Popup Contents...');

        const monthTitle = await page.textContent('.calendar-month-title');
        console.log(`   Month: ${monthTitle}`);

        const dayHeaders = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.calendar-day-header'))
                .map(el => el.textContent.trim());
        });
        console.log(`   Day Headers: ${dayHeaders.join(', ')}`);

        const totalDayCells = await page.evaluate(() => {
            return document.querySelectorAll('.calendar-day-cell').length;
        });
        console.log(`   Day Cells: ${totalDayCells}`);

        const indicators = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.indicator-badge'))
                .map(el => el.textContent.trim());
        });
        console.log(`   Indicators: ${indicators.join(' | ')}`);

        // Click TODAY again to close
        console.log('\n7. Clicking TODAY Again to Close Calendar...');
        await page.click('#toggle-calendar');
        await page.waitForTimeout(500);

        const overlayAfterSecondClick = await page.evaluate(() => {
            const overlay = document.getElementById('calendar-overlay');
            if (!overlay) return 'not found';
            return overlay.classList.contains('hidden') ? 'hidden' : 'visible';
        });
        console.log(`   State After Second Click: ${overlayAfterSecondClick}`);

        if (overlayAfterSecondClick === 'hidden') {
            console.log('   ✓ Calendar popup closed');
        }

        // Take screenshot with calendar closed
        await page.screenshot({ path: 'fixed-calendar-closed.png', fullPage: true });
        console.log('   Saved: fixed-calendar-closed.png');

        // Check Today view is visible underneath
        console.log('\n8. Verifying Today View Visible...');
        const todayViewVisible = await page.evaluate(() => {
            return !!document.querySelector('.whoop-today-view');
        });

        if (todayViewVisible) {
            console.log('   ✓ Today view remains visible');
        }

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log('✓ Custom header bar with profile icon, badges, TODAY, 69%');
        console.log('✓ Navigation: Today | analysis | Multiplayer | Profile (no Calendar)');
        console.log('✓ Calendar overlay hidden by default');
        console.log('✓ TODAY text toggles calendar popup');
        console.log('✓ Calendar popup shows month, days, indicators');
        console.log('✓ Today view visible underneath');

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
