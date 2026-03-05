// Configuration for LinkedIn Auto Connect & Follow Bot
module.exports = {
    // Maximum number of accounts to connect with or follow in a single run.
    // We recommend 20-50 max per day to avoid bans.
    MAX_ACTIONS_PER_RUN: 50,

    // Minimum delay (in milliseconds) between actions
    MIN_DELAY_MS: 5000,

    // Maximum delay (in milliseconds) between actions
    MAX_DELAY_MS: 15000,

    // Short delay for UI interactions like clicking confirm
    SHORT_MIN_DELAY_MS: 1500,
    SHORT_MAX_DELAY_MS: 3500,

    // LinkedIn My Network URL (where "Connect" and "Follow" suggestions usually live)
    NETWORK_URL: 'https://www.linkedin.com/mynetwork/'
};
