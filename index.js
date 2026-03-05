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

async function main() {
    console.log('Starting LinkedIn Auto Connect & Follow Bot...');
    let context;
    let browser;

    // Launch browser (not headless so we can see what's happening)
    browser = await chromium.launch({ headless: false });

    // Check if we have saved session state
    if (fs.existsSync(STATE_FILE)) {
        console.log('Found saved session. Restoring...');
        context = await browser.newContext({ storageState: STATE_FILE });
    } else {
        console.log('No saved session found. Preparing to log in automatically...');
        context = await browser.newContext();
    }

    const page = await context.newPage();

    // If no state file, auto-login
    if (!fs.existsSync(STATE_FILE)) {
        await page.goto('https://www.linkedin.com/login');
        console.log('Logging in automatically...');

        await delay(1000, 2000); // small delay to ensure inputs are loaded
        await page.fill('#username', process.env.LINKEDIN_EMAIL || '');
        await page.fill('#password', process.env.LINKEDIN_PASSWORD || '');

        await delay(1000, 2000);
        await page.click('button[type="submit"]');

        console.log('Waiting for successful login (navigating away from login page)...');

        // Wait until URL changes from login
        await page.waitForNavigation({ url: /^(?!.*login).*$/, timeout: 60000 });

        console.log('Login successful! Saving session for future use.');
        await delay(2000, 3000);
        await context.storageState({ path: STATE_FILE });
    }

    // Navigate to the Network page
    console.log(`Navigating to ${config.NETWORK_URL}...`);
    await page.goto(config.NETWORK_URL, { waitUntil: 'domcontentloaded' });

    let actionCount = 0;

    // Wait a bit for the page to fully render
    await delay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);

    while (actionCount < config.MAX_ACTIONS_PER_RUN) {
        console.log('Scanning for action buttons ("Connect" and "Follow")...');

        // Find both "Connect" and "Follow" buttons on the standard network page
        // LinkedIn UI varies, usually buttons contain exact texts
        const connectButtons = await page.$$('button:has-text("Connect")');
        const followButtons = await page.$$('button:has-text("Follow")');

        // Combine arrays and filter out buttons that might not be visible or relevant ones 
        // Note: we just pool all found interactable buttons
        const actionButtons = [...connectButtons, ...followButtons];

        if (actionButtons.length === 0) {
            console.log('No action buttons found on the current screen.');
            console.log('Scrolling down to load more profiles...');
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));

            await delay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);

            const newConnect = await page.$$('button:has-text("Connect")');
            const newFollow = await page.$$('button:has-text("Follow")');
            if (newConnect.length === 0 && newFollow.length === 0) {
                console.log('Still no buttons found after scrolling. Reached end of currently available suggestions.');
                break;
            }
            continue;
        }

        for (const button of actionButtons) {
            if (actionCount >= config.MAX_ACTIONS_PER_RUN) {
                break;
            }

            try {
                // Skip elements that became detached or hidden
                const isVisible = await button.isVisible();
                if (!isVisible) continue;

                // Get button text to log what action we are taking
                const buttonText = await button.innerText();
                const actionType = buttonText.includes('Connect') ? 'Connect' : 'Follow';

                await button.scrollIntoViewIfNeeded();
                await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);

                console.log(`Clicking ${actionType} button (${actionCount + 1}/${config.MAX_ACTIONS_PER_RUN})...`);
                await button.click();

                // Handling popups usually happens only on 'Connect'
                if (actionType === 'Connect') {
                    try {
                        // LinkedIn sometimes prompts "You can add a note to personalize..."
                        // We check if the modal appeared by looking for "Send without a note" or "Send"
                        // Or similarly titled buttons in dialogs.

                        const sendWithoutNoteButton = await page.waitForSelector('button:has-text("Send without a note")', { timeout: 3000 }).catch(() => null);
                        if (sendWithoutNoteButton) {
                            console.log('Note popup detected. Clicking "Send without a note"...');
                            await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);
                            await sendWithoutNoteButton.click();
                        } else {
                            // Some UIs just have a "Send" button
                            const sendButton = await page.waitForSelector('button:has-text("Send")', { timeout: 1000 }).catch(() => null);
                            if (sendButton) {
                                console.log('Standard Send popup detected. Clicking "Send"...');
                                await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);
                                await sendButton.click();
                            }
                        }
                    } catch (e) {
                        // Normal if no connection note prompt appears
                        console.log('No connection note prompt required.');
                    }
                }

                actionCount++;
                console.log(`Successfully performed action: ${actionType}! Total: ${actionCount}`);

                // Crucial safeguard: wait a long random time before the next action
                const waitTime = Math.floor(Math.random() * (config.MAX_DELAY_MS - config.MIN_DELAY_MS + 1)) + config.MIN_DELAY_MS;
                console.log(`Waiting ${waitTime / 1000} seconds before next action to simulate human behavior safety...`);
                await delay(waitTime, waitTime);

            } catch (err) {
                console.error('Error processing a button, skipping to next one:', err.message);
                await delay(config.SHORT_MIN_DELAY_MS, config.SHORT_MAX_DELAY_MS);
            }
        }
    }

    console.log(`\nFinished! Total accounts connected/followed: ${actionCount}`);
    await browser.close();
}

main().catch(console.error);
