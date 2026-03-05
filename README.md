<div align="center">
  <h1>🚀 LinkedIn Auto Connect & Follow Bot 🚀</h1>
  <p><b>The absolute best, safest, and most human-like automation tool to drastically expand your LinkedIn network.</b></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Playwright](https://img.shields.io/badge/Playwright-Automated-2EAD33.svg)](https://playwright.dev)
  [![GitHub stars](https://img.shields.io/github/stars/AshrafMorningstar/linkedin-connect-bot?style=social)](https://github.com/AshrafMorningstar/linkedin-connect-bot/stargazers)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

  *Want to grow your network but tired of manually clicking "Connect" on hundreds of profiles? Let this bot safely do the heavy lifting for you while you grab a coffee ☕.*
</div>

---

## 🔥 Features
Why is this the **Best of the Best**? 

- 🕵️ **100% Human-like Behavior:** Unlike traditional APIs or headless scrapers, this bot controls a real, visible browser window. It literally scrolls and clicks exactly like a human would.
- ⏱️ **Randomized Safe Delays:** To avoid tripping any server alarms, it waits for dynamic, highly randomized amounts of time between every single click.
- 🔑 **Auto Login Securely:** Logs you in automatically using credentials strictly stored in your local `.env` file! No more annoying manual logins or captcha struggles.
- 🤝 **Smart Popups:** Automatically handles the "Add a note" popup by safely clicking "Send without a note" so it never gets stuck.
- 🛑 **Action Limits:** Built-in safeguards stop the script after a configured amount of connections/follows to ensure your account stays completely clear of rate limits.

---

## 💻 Setup & Installation

**1. Clone this repository**
```bash
git clone https://github.com/AshrafMorningstar/linkedin-connect-bot.git
cd linkedin-connect-bot
```

**2. Install Dependencies**
You'll need Node.js installed. Then, install the required packages (including Playwright):
```bash
npm install
npx playwright install chromium
```

**3. Configure Credentials**
Create a `.env` file in the root of the project to securely hold your credentials:
```env
LINKEDIN_EMAIL=your_email@domain.com
LINKEDIN_PASSWORD=your_super_secret_password
```

**4. Adjust Bot Safety Limits (Optional)**
You can edit the `config.js` file to change how many people the bot should connect with in one session, or tweak the human-like delays. By default, it follows an extremely safe threshold of 50 actions per run and waits 5 to 15 seconds per click.

---

## 🕹️ Usage

Simply fire it up!
```bash
node index.js
```
*Sit back, relax, and watch the terminal output as the bot perfectly imitates human scrolling, navigates to your network page, and expands your reach.* 📈

---

## ⚙️ How It Works Under The Hood
1. **Puppeteering**: Uses Playwright to spawn an actual Chromium browser instance.
2. **Authentication**: If there's no stored session, the bot injects your `.env` credentials safely, logs in, bypasses standard walls via organic DOM interaction, and saves your cookies locally to `state.json`. Subsequent runs instantly reuse the session!
3. **Execution**: Scans the DOM for specific `Connect` and `Follow` button node trees, scrolls them neatly into view, and executes clicks with jitter delays.

## ⚠️ Disclaimer
*Web scraping and automation violate LinkedIn's Terms of Service. This script was created strictly for educational purposes. Use this heavily at your own risk. The author is not responsible for any banned or restricted accounts resulting from the use of this software. Always keep your configured daily limits extremely low to simulate real human capacity.*

---

**Like this project?** Please consider giving it a 🌟 **Star** to help it go viral! Let's build the absolute best tools together!
