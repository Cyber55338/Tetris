const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('Navigating to localhost:8000...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

        // Wait a bit for page to fully load
        await page.waitForTimeout(2000);

        console.log('Checking for profile button...');

        // Check if profile button exists
        const profileButton = await page.$('#btn-profile');

        if (profileButton) {
            console.log('✓ Profile button found!');

            // Get button properties
            const isVisible = await profileButton.isVisible();
            const text = await profileButton.textContent();
            const boundingBox = await profileButton.boundingBox();

            console.log('Button visible:', isVisible);
            console.log('Button text:', text.trim());
            console.log('Button position:', boundingBox);

            // Take screenshot before click
            await page.screenshot({ path: 'before-click.png', fullPage: true });
            console.log('Screenshot saved: before-click.png');

            // Highlight the button
            await page.evaluate((btn) => {
                btn.style.border = '3px solid red';
                btn.style.backgroundColor = 'yellow';
            }, profileButton);

            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'button-highlighted.png', fullPage: true });
            console.log('Screenshot saved: button-highlighted.png');

            // Click the button
            console.log('Clicking profile button...');
            await profileButton.click();

            // Wait for Whoop dashboard to appear
            await page.waitForTimeout(2000);

            // Check if Whoop container appeared
            const whoopContainer = await page.$('.whoop-container');
            if (whoopContainer) {
                console.log('✓ Whoop dashboard appeared!');

                // Check which view is active
                const activeView = await page.$('.whoop-nav-btn.active');
                const activeViewText = await activeView.textContent();
                console.log('Active view:', activeViewText);

                // Take screenshot of Whoop dashboard
                await page.screenshot({ path: 'whoop-dashboard.png', fullPage: true });
                console.log('Screenshot saved: whoop-dashboard.png');

                // Test navigation between views
                console.log('\nTesting view navigation...');
                const views = ['calendar', 'sleep', 'strain', 'profile'];

                for (const view of views) {
                    console.log(`Switching to ${view} view...`);
                    await page.click(`[data-view="${view}"]`);
                    await page.waitForTimeout(1000);
                    await page.screenshot({ path: `whoop-${view}.png`, fullPage: true });
                    console.log(`Screenshot saved: whoop-${view}.png`);
                }

                // Test close button
                console.log('\nTesting close button...');
                await page.click('#close-whoop');
                await page.waitForTimeout(1000);

                const whoopGone = await page.$('.whoop-container');
                if (whoopGone === null) {
                    console.log('✓ Whoop dashboard closed successfully!');
                } else {
                    console.log('✗ Whoop dashboard still visible after close');
                }

                await page.screenshot({ path: 'after-close.png', fullPage: true });
                console.log('Screenshot saved: after-close.png');

            } else {
                console.log('✗ Whoop dashboard did not appear');
            }

        } else {
            console.log('✗ Profile button NOT found!');

            // Check what buttons exist
            console.log('\nChecking all toolbar buttons...');
            const allButtons = await page.$$('.toolbar-btn');
            console.log(`Found ${allButtons.length} toolbar buttons`);

            for (let i = 0; i < allButtons.length; i++) {
                const id = await allButtons[i].getAttribute('id');
                const title = await allButtons[i].getAttribute('title');
                console.log(`Button ${i + 1}: id="${id}", title="${title}"`);
            }

            // Take screenshot
            await page.screenshot({ path: 'no-profile-button.png', fullPage: true });
            console.log('Screenshot saved: no-profile-button.png');
        }

        console.log('\n=== Test Complete ===');
        console.log('Press Ctrl+C to close or wait 10 seconds...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('Error:', error);
        await page.screenshot({ path: 'error.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
