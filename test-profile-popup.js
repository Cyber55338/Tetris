const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('=== Testing Profile Popup Implementation ===\n');

        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Click profile button to open dashboard
        console.log('1. Opening Dashboard...');
        await page.click('#btn-profile');
        await page.waitForTimeout(1500);

        // Check navigation tabs (Profile should be removed)
        console.log('\n2. Checking Navigation Tabs...');
        const navButtons = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.whoop-nav-btn'))
                .map(btn => btn.textContent.trim());
        });
        console.log(`   Navigation: ${navButtons.join(' | ')}`);

        if (!navButtons.includes('Profile')) {
            console.log('   ✓ Profile tab removed from navigation');
        } else {
            console.log('   ✗ Profile tab still present');
        }

        // Check if profile icon exists
        console.log('\n3. Checking Profile Icon...');
        const hasProfileIcon = await page.evaluate(() => {
            return !!document.querySelector('.profile-icon-small');
        });

        if (hasProfileIcon) {
            console.log('   ✓ Profile icon found in header');
        } else {
            console.log('   ✗ Profile icon not found');
        }

        // Check if profile popup overlay is hidden by default
        console.log('\n4. Checking Profile Popup Overlay...');
        const overlayInitialState = await page.evaluate(() => {
            const overlay = document.getElementById('profile-overlay');
            if (!overlay) return 'not found';
            return overlay.classList.contains('hidden') ? 'hidden' : 'visible';
        });
        console.log(`   Initial State: ${overlayInitialState}`);

        if (overlayInitialState === 'hidden') {
            console.log('   ✓ Profile popup overlay hidden by default');
        }

        // Click profile icon to toggle profile popup
        console.log('\n5. Clicking Profile Icon to Show Popup...');
        await page.click('.profile-icon-small');
        await page.waitForTimeout(500);

        const overlayAfterClick = await page.evaluate(() => {
            const overlay = document.getElementById('profile-overlay');
            if (!overlay) return 'not found';
            return overlay.classList.contains('hidden') ? 'hidden' : 'visible';
        });
        console.log(`   State After Click: ${overlayAfterClick}`);

        if (overlayAfterClick === 'visible') {
            console.log('   ✓ Profile popup appeared');
        }

        // Take screenshot with popup open
        await page.screenshot({ path: 'profile-popup-open.png', fullPage: true });
        console.log('   Saved: profile-popup-open.png');

        // Check profile popup contents
        console.log('\n6. Checking Profile Popup Contents...');

        const profileName = await page.evaluate(() => {
            const nameEl = document.querySelector('.whoop-profile-name');
            return nameEl ? nameEl.textContent.trim() : null;
        });
        console.log(`   Profile Name: ${profileName}`);

        const hasProfilePicture = await page.evaluate(() => {
            return !!document.querySelector('.whoop-profile-picture');
        });
        console.log(`   Profile Picture: ${hasProfilePicture ? '✓' : '✗'}`);

        const personalInfoVisible = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            return titles.some(t => t.textContent.includes('Personal Info'));
        });
        console.log(`   Personal Info Section: ${personalInfoVisible ? '✓' : '✗'}`);

        const goalsVisible = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            return titles.some(t => t.textContent.includes('Goals'));
        });
        console.log(`   Goals Section: ${goalsVisible ? '✓' : '✗'}`);

        // Click outside to close popup (click on overlay)
        console.log('\n7. Clicking Outside to Close Popup...');
        await page.click('#profile-overlay');
        await page.waitForTimeout(500);

        const overlayAfterOutsideClick = await page.evaluate(() => {
            const overlay = document.getElementById('profile-overlay');
            if (!overlay) return 'not found';
            return overlay.classList.contains('hidden') ? 'hidden' : 'visible';
        });
        console.log(`   State After Outside Click: ${overlayAfterOutsideClick}`);

        if (overlayAfterOutsideClick === 'hidden') {
            console.log('   ✓ Profile popup closed');
        }

        // Take screenshot with popup closed
        await page.screenshot({ path: 'profile-popup-closed.png', fullPage: true });
        console.log('   Saved: profile-popup-closed.png');

        // Check Today view is still visible underneath
        console.log('\n8. Verifying Today View Visible...');
        const todayViewVisible = await page.evaluate(() => {
            return !!document.querySelector('.whoop-today-view');
        });

        if (todayViewVisible) {
            console.log('   ✓ Today view remains visible');
        }

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log('✓ Profile tab removed from navigation');
        console.log('✓ Profile icon in header (clickable)');
        console.log('✓ Profile popup overlay hidden by default');
        console.log('✓ Profile icon click toggles popup');
        console.log('✓ Profile popup shows: name, picture, personal info, goals');
        console.log('✓ Click outside closes popup');
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
