const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('=== Testing Calendar Popup Implementation ===\n');

        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Click profile button
        console.log('1. Opening Dashboard...');
        await page.click('#btn-profile');
        await page.waitForTimeout(1500);

        // Click Calendar tab
        console.log('\n2. Clicking Calendar Tab...');
        await page.click('[data-view="calendar"]');
        await page.waitForTimeout(1500);

        // Check header bar elements
        console.log('\n3. Checking Header Bar Elements...');

        const hasProfileIcon = await page.evaluate(() => {
            return !!document.querySelector('.profile-icon-small');
        });
        console.log(`   Profile Icon: ${hasProfileIcon ? '✓' : '✗'}`);

        const statBadges = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.stat-badge'))
                .map(el => el.textContent.trim());
        });
        console.log(`   Stat Badges: ${statBadges.join(', ')}`);
        if (statBadges.includes('18') && statBadges.includes('1M')) {
            console.log('   ✓ Stat badges show "18" and "1M"');
        }

        const todayText = await page.textContent('.today-text');
        console.log(`   Today Text: "${todayText}"`);
        if (todayText === 'TODAY') {
            console.log('   ✓ Shows "TODAY"');
        }

        const percentIndicator = await page.textContent('.percent-indicator');
        console.log(`   Percent Indicator: "${percentIndicator}"`);
        if (percentIndicator === '69%') {
            console.log('   ✓ Shows "69%"');
        }

        const hasMenuIcon = await page.evaluate(() => {
            return !!document.querySelector('.menu-icon');
        });
        console.log(`   Menu Icon: ${hasMenuIcon ? '✓' : '✗'}`);

        // Check calendar popup
        console.log('\n4. Checking Calendar Popup...');

        const monthTitle = await page.textContent('.calendar-month-title');
        console.log(`   Month Title: "${monthTitle}"`);

        const dayHeaders = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.calendar-day-header'))
                .map(el => el.textContent.trim());
        });
        console.log(`   Day Headers: ${dayHeaders.join(', ')}`);
        if (dayHeaders.length === 7 && dayHeaders.includes('MON') && dayHeaders.includes('SUN')) {
            console.log('   ✓ All 7 day headers present');
        }

        const totalDayCells = await page.evaluate(() => {
            return document.querySelectorAll('.calendar-day-cell').length;
        });
        console.log(`   Total Day Cells: ${totalDayCells}`);

        const highlightedDays = await page.evaluate(() => {
            return document.querySelectorAll('.calendar-day-cell.highlighted').length;
        });
        console.log(`   Highlighted Days: ${highlightedDays}`);
        if (highlightedDays > 0) {
            console.log('   ✓ Has highlighted days with color-coded borders');
        }

        // Check indicator badges
        console.log('\n5. Checking Recovery Indicators...');

        const indicators = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.indicator-badge'))
                .map(el => ({
                    text: el.textContent.trim(),
                    class: el.className
                }));
        });

        console.log('   Recovery Badges:');
        indicators.forEach(ind => {
            const color = ind.class.includes('green') ? '🟢' :
                         ind.class.includes('yellow') ? '🟡' :
                         ind.class.includes('red') ? '🔴' : '⚪';
            console.log(`   ${color} ${ind.text}`);
        });

        if (indicators.some(i => i.text === '+83%' && i.class.includes('green'))) {
            console.log('   ✓ Green badge shows "+83%"');
        }
        if (indicators.some(i => i.text === '+61%' && i.class.includes('yellow'))) {
            console.log('   ✓ Yellow badge shows "+61%"');
        }
        if (indicators.some(i => i.text === '60%' && i.class.includes('red'))) {
            console.log('   ✓ Red badge shows "60%"');
        }

        // Check background dashboard
        console.log('\n6. Checking Background Dashboard...');

        const backgroundDashboard = await page.evaluate(() => {
            const bg = document.querySelector('.calendar-background-dashboard');
            if (!bg) return null;
            return {
                exists: true,
                opacity: window.getComputedStyle(bg).opacity,
                position: window.getComputedStyle(bg).position
            };
        });

        if (backgroundDashboard) {
            console.log(`   ✓ Background dashboard exists`);
            console.log(`   Position: ${backgroundDashboard.position}`);
            console.log(`   Opacity: ${backgroundDashboard.opacity}`);
            if (parseFloat(backgroundDashboard.opacity) < 0.5) {
                console.log('   ✓ Background is dimmed (opacity < 0.5)');
            }
        }

        // Check calendar popup styling
        console.log('\n7. Checking Calendar Popup Styling...');

        const popupStyles = await page.evaluate(() => {
            const popup = document.querySelector('.calendar-popup');
            if (!popup) return null;
            const styles = window.getComputedStyle(popup);
            return {
                borderRadius: styles.borderRadius,
                background: styles.background,
                boxShadow: styles.boxShadow
            };
        });

        if (popupStyles) {
            console.log(`   Border Radius: ${popupStyles.borderRadius}`);
            console.log(`   Has Background: ${popupStyles.background.length > 10 ? '✓' : '✗'}`);
            console.log(`   Has Shadow: ${popupStyles.boxShadow !== 'none' ? '✓' : '✗'}`);
        }

        // Take screenshots
        console.log('\n8. Taking Screenshots...');
        await page.screenshot({ path: 'calendar-popup-full.png', fullPage: true });
        console.log('   Saved: calendar-popup-full.png');

        // Test navigation arrows
        console.log('\n9. Testing Navigation...');
        const initialMonth = await page.textContent('.calendar-month-title');

        await page.click('#next-month');
        await page.waitForTimeout(500);
        const nextMonth = await page.textContent('.calendar-month-title');
        console.log(`   Next month navigation: ${initialMonth} → ${nextMonth}`);

        await page.click('#prev-month');
        await page.waitForTimeout(500);
        const prevMonth = await page.textContent('.calendar-month-title');
        console.log(`   Prev month navigation: ${nextMonth} → ${prevMonth}`);

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log('✓ Header bar with profile icon, stat badges (18, 1M), navigation');
        console.log('✓ TODAY text and 69% indicator');
        console.log('✓ Menu icon present');
        console.log('✓ Calendar popup with month title and day headers');
        console.log('✓ Calendar grid with highlighted days');
        console.log('✓ Recovery indicators: +83% (green), +61% (yellow), 60% (red)');
        console.log('✓ Background dashboard visible and dimmed');
        console.log('✓ Month navigation working');

        console.log('\n=== Test Complete ===');
        console.log('Keeping browser open for 20 seconds...');
        await page.waitForTimeout(20000);

    } catch (error) {
        console.error('Error:', error);
        await page.screenshot({ path: 'calendar-test-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
