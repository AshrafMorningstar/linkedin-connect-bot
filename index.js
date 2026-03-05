const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const config = require('./config');

const STATE_FILE = path.join(__dirname, 'state.json');

// Helper to wait for a random amount of time between min and max
const delay = (min, max) => {
    const time = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, time));
};

// Build a LinkedIn people search URL for a given keyword, sorted by most connections first
function buildSearchUrl(keyword) {
    const encoded = encodeURIComponent(keyword);
    return `https://www.linkedin.com/search/results/people/?keywords=${encoded}&origin=GLOBAL_SEARCH_HEADER&sortBy=CONNECTIONS`;
}

// Handle the "Send invitation" popup after clicking Connect
async function handleConnectPopup(page) {
    try {
        const sendWithoutNote = await page.waitForSelector('button:has-text("Send without a note")', { timeout: 3000 }).catch(() => null);
        if (sendWithoutNote) {
            console.log('   Note popup detected. Clicking "Send without a note"...');
            await delay(1000, 2000);
            await sendWithoutNote.click();
            return;
        }
        const sendBtn = await page.waitForSelector('button:has-text("Send")', { timeout: 1000 }).catch(() => null);
        if (sendBtn) {
            console.log('   Send popup detected. Clicking "Send"...');
            await delay(1000, 2000);
            await sendBtn.click();
        }
    } catch (e) {
        // No popup needed
    }
}

async function main() {
    console.log('Starting LinkedIn Auto Connect & Follow Bot...');
    if (config.HIGH_PROFILE_MODE) {
        console.log('🎯 HIGH-PROFILE MODE ENABLED — Targeting top influencers, CEOs & founders!');
    }

    let browser = await chromium.launch({ headless: false });

    // Restore or create browser context
    let context;
    if (fs.existsSync(STATE_FILE)) {
        console.log('Found saved session. Restoring...');
        context = await browser.newContext({ storageState: STATE_FILE });
    } else {
        console.log('No saved session found. Preparing to log in automatically...');
        context = await browser.newContext();
    }

    const page = await context.newPage();

    // Auto-login if no saved session
    if (!fs.existsSync(STATE_FILE)) {
        await page.goto('https://www.linkedin.com/login');
        console.log('Logging in automatically...');

        await delay(1000, 2000);
        await page.fill('#username', process.env.LINKEDIN_EMAIL || '');
        await page.fill('#password', process.env.LINKEDIN_PASSWORD || '');
        await delay(1000, 2000);
        await page.click('button[type="submit"]');

        console.log('Waiting for successful login...');
        await page.waitForNavigation({ url: /^(?!.*login).*$/, timeout: 60000 });

        console.log('Login successful! Saving session for future use.');
        await delay(2000, 3000);
        await context.storageState({ path: STATE_FILE });
    }

    let actionCount = 0;

    if (config.HIGH_PROFILE_MODE) {
        // ── HIGH-PROFILE MODE: Search for CEOs, Founders, Influencers etc. ──────
        for (const keyword of config.HIGH_PROFILE_KEYWORDS) {
            if (actionCount >= config.MAX_ACTIONS_PER_RUN) break;

            const url = buildSearchUrl(keyword);
            console.log(`\n🔍 Searching for high-profile "${keyword}" profiles (sorted by most connections)...`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await delay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);

            let pageScrolls = 0;
            const MAX_SCROLLS_PER_KEYWORD = 3;

            while (actionCount < config.MAX_ACTIONS_PER_RUN && pageScrolls <= MAX_SCROLLS_PER_KEYWORD) {

                const connectBtns = await page.$$('button:has-text("Connect")');
                const followBtns = await page.$$('button:has-text("Follow")');
                const allBtns = [...connectBtns, ...followBtns];

                if (allBtns.length === 0) {
                    console.log('No buttons on current view, scrolling...');
                } else {
                    console.log(`Found ${allBtns.length} action buttons on screen.`);
                }

                for (const button of allBtns) {
                    if (actionCount >= config.MAX_ACTIONS_PER_RUN) break;

                    try {
                        const isVisible = await button.isVisible();
                        if (!isVisible) continue;

                        const buttonText = await button.innerText().catch(() => '');
                        const actionType = buttonText.trim().startsWith('Connect') ? 'Connect' : 'Follow';

                        // Extract profile name and headline from the enclosing card
                        let profileName = 'Unknown';
                        let profileHeadline = '';
                        try {
                            const card = await button.evaluateHandle(el => {
                                let node = el;
                                for (let i = 0; i < 10; i++) {
                                    node = node.parentElement;
                                    if (node && node.tagName === 'LI') return node;
                                }
                                return null;
                            });
                            if (card) {
                                profileName = await card.$eval(
                                    '.entity-result__title-text, span[aria-hidden="true"]',
                                    el => el.innerText.trim()
                                ).catch(() => 'Unknown');
                                profileHeadline = await card.$eval(
                                    '.entity-result__primary-subtitle, .entity-result__summary',
                                    el => el.innerText.trim()
                                ).catch(() => '');
                            }
                        } catch (_) { }

                        // Optional headline filter
                        if (config.HEADLINE_FILTER.length > 0) {
                            const headlineLower = profileHeadline.toLowerCase();
                            const matches = config.HEADLINE_FILTER.some(f => headlineLower.includes(f.toLowerCase()));
                            if (!matches) {
                                console.log(`   ⏭️  Skipping "${profileName}" — headline doesn't match filter`);
                                continue;
                            }
                        }

                        await button.scrollIntoViewIfNeeded();
                        await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);

                        console.log(`\n🤝 [${actionCount + 1}/${config.MAX_ACTIONS_PER_RUN}] ${actionType} → "${profileName}"`);
                        if (profileHeadline) console.log(`   📌 ${profileHeadline}`);

                        await button.click();

                        if (actionType === 'Connect') {
                            await handleConnectPopup(page);
                        }

                        actionCount++;
                        console.log(`   ✅ Success! Total actions: ${actionCount}`);

                        const waitTime = Math.floor(Math.random() * (config.MAX_DELAY_MS - config.MIN_DELAY_MS + 1)) + config.MIN_DELAY_MS;
                        console.log(`   ⏳ Waiting ${(waitTime / 1000).toFixed(1)}s before next action...`);
                        await delay(waitTime, waitTime);

                    } catch (err) {
                        console.error('   ⚠️  Error on button, skipping:', err.message);
                        await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);
                    }
                }

                // Scroll down to load more results for this keyword
                if (actionCount < config.MAX_ACTIONS_PER_RUN) {
                    console.log(`\nScrolling to load more "${keyword}" results (scroll ${pageScrolls + 1}/${MAX_SCROLLS_PER_KEYWORD})...`);
                    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
                    await delay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);
                    pageScrolls++;
                }
            }
        }

    } else {
        // ── STANDARD MODE: My Network page ──────────────────────────────────────
        console.log(`Navigating to ${config.NETWORK_URL}...`);
        await page.goto(config.NETWORK_URL, { waitUntil: 'domcontentloaded' });
        await delay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);

        while (actionCount < config.MAX_ACTIONS_PER_RUN) {
            console.log('Scanning for action buttons ("Connect" and "Follow")...');

            const connectButtons = await page.$$('button:has-text("Connect")');
            const followButtons = await page.$$('button:has-text("Follow")');
            const actionButtons = [...connectButtons, ...followButtons];

            if (actionButtons.length === 0) {
                console.log('No action buttons found. Scrolling down...');
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await delay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);

                const nc = await page.$$('button:has-text("Connect")');
                const nf = await page.$$('button:has-text("Follow")');
                if (nc.length === 0 && nf.length === 0) {
                    console.log('No more profiles available. Ending run.');
                    break;
                }
                continue;
            }

            for (const button of actionButtons) {
                if (actionCount >= config.MAX_ACTIONS_PER_RUN) break;
                try {
                    const isVisible = await button.isVisible();
                    if (!isVisible) continue;

                    const buttonText = await button.innerText();
                    const actionType = buttonText.includes('Connect') ? 'Connect' : 'Follow';

                    await button.scrollIntoViewIfNeeded();
                    await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);

                    console.log(`Clicking ${actionType} (${actionCount + 1}/${config.MAX_ACTIONS_PER_RUN})...`);
                    await button.click();

                    if (actionType === 'Connect') await handleConnectPopup(page);

                    actionCount++;
                    console.log(`✅ Done! Total: ${actionCount}`);

                    const waitTime = Math.floor(Math.random() * (config.MAX_DELAY_MS - config.MIN_DELAY_MS + 1)) + config.MIN_DELAY_MS;
                    console.log(`Waiting ${(waitTime / 1000).toFixed(1)}s...`);
                    await delay(waitTime, waitTime);

                } catch (err) {
                    console.error('Error on button, skipping:', err.message);
                    await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);
                }
            }
        }
    }

    console.log(`\n🎉 Finished! Total accounts connected/followed: ${actionCount}`);
    await browser.close();
}

main().catch(console.error);
