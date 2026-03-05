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
    NETWORK_URL: 'https://www.linkedin.com/mynetwork/',

    // ─── HIGH-PROFILE SMART TARGETING ────────────────────────────────────────
    // Set to true to skip the My Network page and instead target high-profile
    // people from LinkedIn Search results (CEOs, Founders, Influencers, etc.)
    HIGH_PROFILE_MODE: true,

    // PROFESSIONS TARGETING: Add any niche you want to dominate here!
    // The bot will cycle through each one automatically.
    HIGH_PROFILE_KEYWORDS: [
        // --- C-Level & Executives ---
        'CEO', 'Founder', 'Co-Founder', 'Entrepreneur', 'Managing Director', 'Venture Capital',

        // --- IT & Tech Professionals ---
        'IT Professional', 'Software Engineer', 'CTO', 'Data Scientist', 'DevOps Engineer',
        'Product Manager', 'Cloud Architect', 'Full Stack Developer',

        // --- Finance & Legal ---
        'Chartered Accountant', 'CA', 'Financial Analyst', 'Investment Banker', 'Legal Counsel',

        // --- Marketing & Sales ---
        'Digital Marketer', 'Growth Hacker', 'Sales Director', 'Marketing Manager', 'SEO Expert',

        // --- HR & Engagement ---
        'HR Professional', 'Talent Acquisition', 'Recruiter', 'Community Manager', 'Chatter account',

        // --- General Professional ---
        'Consultant', 'Project Manager', 'Business Development'
    ],

    // Global filters for headlines
    HEADLINE_FILTER: [],

    // ─── 2026 PRO AUTOMATION FEATURES ────────────────────────────────────────

    // WARM-UP MODE: Gradually increases your daily activity to avoid ban detection.
    // Starts with DAILY_LIMIT_START and increases by DAILY_LIMIT_INCREMENT each day.
    WARM_UP_MODE: true,
    DAILY_LIMIT_START: 10,
    DAILY_LIMIT_INCREMENT: 5,

    // WORK HOURS: Only performs actions during these hours (24h format).
    BOT_WORK_HOURS: { start: 9, end: 17 },

    // INVITATION SETTINGS: Personalized messages increase acceptance by 35%!
    ENABLE_PERSONALIZED_MESSAGING: true,
    INVITATION_MESSAGE_TEMPLATE: "Hi {{firstName}}, I've been following your progress at {{company}} and am consistently impressed by your insights in the {{jobTitle}} field. Would love to connect and keep in touch! Best, [Your Name]",

    // SEQUENCE FLOW: View profile before connecting (highly recommended for safety).
    VIEW_PROFILE_BEFORE_CONNECT: true,

    // AUTO-WITHDRAW: Automatically cancels pending requests that haven't been accepted.
    AUTO_WITHDRAW: true,
    WITHDRAW_OLDER_THAN_DAYS: 14,
};
