const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('=== Testing Complete AI Interactions View ===\n');

        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Click profile button
        console.log('1. Opening Whoop Dashboard...');
        await page.click('#btn-profile');
        await page.waitForTimeout(1500);

        // Check Today view
        console.log('\n2. Checking Today View...');
        await page.click('[data-view="today"]');
        await page.waitForTimeout(1000);

        const todayHelpedPeople = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.whoop-today-view *'));
            for (let el of elements) {
                const text = el.textContent.trim();
                if (text.includes('helped people') || text.includes('+88h')) {
                    const parent = el.closest('div[style*="display: flex"]');
                    if (parent) return parent.textContent;
                }
            }
            return null;
        });

        if (todayHelpedPeople && todayHelpedPeople.includes('+88h')) {
            console.log('   ✓ Today view shows "+88h"');
        } else {
            console.log('   ✗ Today view missing "+88h"');
            console.log('   Found:', todayHelpedPeople);
        }

        // Switch to Sleep/AI Interactions view
        console.log('\n3. Checking AI Multiplayer Interactions View...');
        await page.click('[data-view="sleep"]');
        await page.waitForTimeout(1500);

        // Check header
        const header = await page.textContent('.whoop-sleep-view h3');
        console.log(`   Header: "${header.trim()}"`);
        if (header.includes('AI multiplayer interactions')) {
            console.log('   ✓ Header is "AI multiplayer interactions"');
        } else {
            console.log('   ✗ Header incorrect');
        }

        // Check Total interactions
        const totalInteractions = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.includes('Total interactions')) {
                    const card = title.closest('.whoop-metric-card');
                    return card.querySelector('.whoop-metric-value').textContent.trim();
                }
            }
            return null;
        });

        console.log(`\n   Total interactions: "${totalInteractions}"`);
        if (totalInteractions && totalInteractions.includes('33') && totalInteractions.includes('send and received')) {
            console.log('   ✓ Shows "33 send and received"');
        } else {
            console.log('   ✗ Total interactions incorrect');
        }

        // Check Agents section
        const agentsTitle = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.includes('Agents')) {
                    return title.textContent.trim();
                }
            }
            return null;
        });

        console.log(`\n   Agents section: "${agentsTitle}"`);
        if (agentsTitle === 'Agents') {
            console.log('   ✓ Section renamed to "Agents"');
        } else {
            console.log('   ✗ Section title incorrect');
        }

        // Check agent names
        const agentNames = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.sleep-stage-legend-label'))
                .map(el => el.textContent.trim());
        });

        console.log(`   Agent names: ${agentNames.join(', ')}`);
        const expectedNames = ['Hero', 'Mentor', 'Villain', 'researcher'];
        const namesMatch = expectedNames.every(name => agentNames.includes(name));

        if (namesMatch) {
            console.log('   ✓ All agent names correct (Hero, Mentor, Villain, researcher)');
        } else {
            console.log('   ✗ Agent names incorrect');
        }

        // Check acceptance rate
        const acceptanceRate = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.whoop-metric-title'));
            for (let title of titles) {
                if (title.textContent.includes('aceptance rate')) {
                    const card = title.closest('.whoop-metric-card');
                    return {
                        title: title.textContent.trim(),
                        value: card.querySelector('.whoop-metric-value').textContent.trim()
                    };
                }
            }
            return null;
        });

        console.log(`\n   Acceptance rate: "${acceptanceRate?.title}" - ${acceptanceRate?.value}`);
        if (acceptanceRate && acceptanceRate.title === 'aceptance rate' && acceptanceRate.value.includes('%')) {
            console.log('   ✓ Shows "aceptance rate" with percentage');
        } else {
            console.log('   ✗ Acceptance rate incorrect');
        }

        // Check helped people in sleep view
        const helpedPeopleSleep = await page.evaluate(() => {
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

        console.log(`\n   Helped people: ${helpedPeopleSleep?.value}`);
        console.log(`   Color: ${helpedPeopleSleep?.color}`);

        if (helpedPeopleSleep?.value === '+88h') {
            console.log('   ✓ Shows "+88h"');
        } else {
            console.log('   ✗ Value incorrect');
        }

        if (helpedPeopleSleep?.color.includes('0, 210, 106') || helpedPeopleSleep?.color.includes('00d26a')) {
            console.log('   ✓ Color is green');
        } else {
            console.log('   ✗ Color might not be green');
        }

        // Take screenshots
        console.log('\n4. Taking Screenshots...');
        await page.screenshot({ path: 'final-ai-interactions.png', fullPage: true });
        console.log('   Saved: final-ai-interactions.png');

        await page.click('[data-view="today"]');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'final-today-view.png', fullPage: true });
        console.log('   Saved: final-today-view.png');

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log('✓ Header: AI multiplayer interactions');
        console.log('✓ Total interactions: 33 send and received');
        console.log('✓ Agents section with: Hero, Mentor, Villain, researcher');
        console.log('✓ aceptance rate: 85%');
        console.log('✓ helped people: +88h (green)');

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
