const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const config = require('./config');

const STATE_FILE = path.join(__dirname, 'state.json');
const BOT_DATA_FILE = path.join(__dirname, 'bot_data.json');

// Helper to wait for a random count of time
const delay = (min, max) => {
    const time = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, time));
};

// Check if current time is within work hours
function isWorkTime() {
    const now = new Date();
    const currentHour = now.getHours();
    return currentHour >= config.BOT_WORK_HOURS.start && currentHour < config.BOT_WORK_HOURS.end;
}

// Warm-up logic: returns the number of actions allowed for today
function getDailyLimit() {
    if (!config.WARM_UP_MODE) return config.MAX_ACTIONS_PER_RUN;

    let botData = { startDate: new Date().toISOString() };
    if (fs.existsSync(BOT_DATA_FILE)) {
        botData = JSON.parse(fs.readFileSync(BOT_DATA_FILE, 'utf8'));
    } else {
        fs.writeFileSync(BOT_DATA_FILE, JSON.stringify(botData, null, 2));
    }

    const startDate = new Date(botData.startDate);
    const today = new Date();
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const limit = config.DAILY_LIMIT_START + (diffDays * config.DAILY_LIMIT_INCREMENT);
    return Math.min(limit, config.MAX_ACTIONS_PER_RUN);
}

// Build a LinkedIn people search URL
function buildSearchUrl(keyword) {
    const encoded = encodeURIComponent(keyword);
    return `https://www.linkedin.com/search/results/people/?keywords=${encoded}&origin=GLOBAL_SEARCH_HEADER&sortBy=CONNECTIONS`;
}

// Personalized Message Generator
function generateMessage(profile) {
    let msg = config.INVITATION_MESSAGE_TEMPLATE;
    msg = msg.replace('{{firstName}}', profile.firstName || 'there');
    msg = msg.replace('{{company}}', profile.company || 'your company');
    msg = msg.replace('{{jobTitle}}', profile.jobTitle || 'your role');
    return msg;
}

// Handle the "Send invitation" popup with personalization
async function handleConnectPopup(page, profile) {
    try {
        if (config.ENABLE_PERSONALIZED_MESSAGING) {
            const addNoteBtn = await page.waitForSelector('button:has-text("Add a note")', { timeout: 3000 }).catch(() => null);
            if (addNoteBtn) {
                console.log('   Personalizing invite...');
                await addNoteBtn.click();
                await delay(1000, 2000);

                const message = generateMessage(profile);
                await page.fill('textarea[name="message"]', message);
                await delay(1500, 3000);

                const sendBtn = await page.waitForSelector('button:has-text("Send")', { timeout: 2000 }).catch(() => null);
                if (sendBtn) await sendBtn.click();
                return;
            }
        }

        // Fallback for no note or disabled personalization
        const sendWithoutNote = await page.waitForSelector('button:has-text("Send without a note")', { timeout: 2000 }).catch(() => null);
        if (sendWithoutNote) {
            await sendWithoutNote.click();
        } else {
            const genericSend = await page.waitForSelector('button:has-text("Send")', { timeout: 1000 }).catch(() => null);
            if (genericSend) await genericSend.click();
        }
    } catch (e) {
        console.log('   Popup handling skipped or failed:', e.message);
    }
}

// Auto-Withdraw old invitations
async function performWithdrawal(page) {
    if (!config.AUTO_WITHDRAW) return;
    console.log('\n🧹 Starting Auto-Withdrawal of old invitations...');
    await page.goto('https://www.linkedin.com/mynetwork/invitation-manager/sent/');
    await delay(5000, 8000);

    const withdrawButtons = await page.$$('button:has-text("Withdraw")');
    console.log(`Found ${withdrawButtons.length} pending invitations.`);

    // In a real 2026 bot, we'd check dates, but for now we withdraw a few old ones
    if (withdrawButtons.length > 50) {
        console.log('Withdrawing the oldest 5 invitations to maintain account health...');
        for (let i = withdrawButtons.length - 1; i >= withdrawButtons.length - 5; i--) {
            try {
                await withdrawButtons[i].scrollIntoViewIfNeeded();
                await withdrawButtons[i].click();
                await delay(1500, 3000);
                const confirm = await page.waitForSelector('button.artdeco-button--primary:has-text("Withdraw")', { timeout: 3000 }).catch(() => null);
                if (confirm) await confirm.click();
                await delay(2000, 4000);
            } catch (e) { }
        }
    }
}

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 LinkedIn Pro Automation 2026 — Initializing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!isWorkTime()) {
        console.log(`⏰ Current time is outside of Work Hours (${config.BOT_WORK_HOURS.start}:00 - ${config.BOT_WORK_HOURS.end}:00).`);
        console.log('Stopping for safety. Human-like scheduling active.');
        return;
    }

    const dailyLimit = getDailyLimit();
    console.log(`📊 Adaptive Limit: ${dailyLimit} actions for today (Warm-up Mode: ${config.WARM_UP_MODE ? 'ON' : 'OFF'})`);

    let browser = await chromium.launch({ headless: false });
    let context;
    if (fs.existsSync(STATE_FILE)) {
        console.log('🔓 Restoring secure cloud-mimic session...');
        context = await browser.newContext({ storageState: STATE_FILE });
    } else {
        context = await browser.newContext();
    }

    const page = await context.newPage();

    // Auto-login logic
    if (!fs.existsSync(STATE_FILE)) {
        await page.goto('https://www.linkedin.com/login');
        console.log('🔑 Performing secure automated login...');
        await delay(1000, 2000);
        await page.fill('#username', process.env.LINKEDIN_EMAIL || '');
        await page.fill('#password', process.env.LINKEDIN_PASSWORD || '');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ url: /^(?!.*login).*$/, timeout: 60000 });
        await delay(3000, 5000);
        await context.storageState({ path: STATE_FILE });
    }

    // Withdrawal step
    if (config.AUTO_WITHDRAW) {
        await performWithdrawal(page);
    }

    let actionCount = 0;

    // Start Targeting (Simplified for brevity, assuming HIGH_PROFILE_MODE for v2)
    for (const keyword of config.HIGH_PROFILE_KEYWORDS) {
        if (actionCount >= dailyLimit) break;

        const searchUrl = buildSearchUrl(keyword);
        console.log(`\n🔍 Searching for: ${keyword}...`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await delay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);

        const profiles = await page.$$eval('li.reusable-search__result-container', (elements) => {
            return elements.map(el => {
                const name = el.querySelector('.entity-result__title-text')?.innerText.trim() || 'Unknown';
                const headline = el.querySelector('.entity-result__primary-subtitle')?.innerText.trim() || '';
                const profileUrl = el.querySelector('a.app-aware-link')?.href || '';
                return { name, headline, profileUrl };
            });
        });

        for (const p of profiles) {
            if (actionCount >= dailyLimit) break;

            try {
                // Visit profile first for human-like sequence
                if (config.VIEW_PROFILE_BEFORE_CONNECT && p.profileUrl) {
                    console.log(`👀 Visiting profile: ${p.name}...`);
                    await page.goto(p.profileUrl, { waitUntil: 'domcontentloaded' });
                    await delay(4000, 8000); // Spend some "reading" time
                }

                // Check for connect button on profile page
                let connectBtn = await page.waitForSelector('button.pvs-profile-actions__action:has-text("Connect")', { timeout: 3000 }).catch(() => null);

                // If not on profile, it might be hidden in 'More'
                if (!connectBtn) {
                    const moreBtn = await page.waitForSelector('button:has-text("More")', { timeout: 2000 }).catch(() => null);
                    if (moreBtn) {
                        await moreBtn.click();
                        await delay(1000, 2000);
                        connectBtn = await page.waitForSelector('div[role="button"]:has-text("Connect")', { timeout: 2000 }).catch(() => null);
                    }
                }

                if (connectBtn) {
                    const firstName = p.name.split(' ')[0];
                    const jobTitle = p.headline.split(' at ')[0] || p.headline;
                    const companyMatch = p.headline.match(/ at (.*)$/);
                    const company = companyMatch ? companyMatch[1] : 'your company';

                    console.log(`🤝 [${actionCount + 1}/${dailyLimit}] Connecting with ${p.name}...`);
                    await connectBtn.click();
                    await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);

                    await handleConnectPopup(page, { firstName, jobTitle, company });

                    actionCount++;
                    console.log(`✨ Success. Human-imitation delay active...`);
                    const waitTime = Math.floor(Math.random() * (config.MAX_DELAY_MS - config.MIN_DELAY_MS + 1)) + config.MIN_DELAY_MS;
                    await delay(waitTime, waitTime);
                } else {
                    console.log(`⏭️  Already connected or button not found for ${p.name}. Skipping.`);
                }
            } catch (err) {
                console.log(`⚠️  Error processing ${p.name}:`, err.message);
                await delay(2000, 4000);
            }

            // Return to search results if we visited a profile
            if (config.VIEW_PROFILE_BEFORE_CONNECT) {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
                await delay(3000, 5000);
            }
        }
    }

    console.log(`\n🎉 Sequence Complete! Total: ${actionCount} actions.`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await browser.close();
}

main().catch(console.error);
