// Configuration file for the Poll System Frontend

const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'http://localhost:8000/api/v1',
        ENDPOINTS: {
            POLLS: '/polls/',
            POLL_CREATE: '/polls/create/',
            POLL_DETAIL: '/polls/{id}/',
            POLL_RESULTS: '/polls/{id}/results/',
            VOTE: '/vote/',
            STATISTICS: '/statistics/',
            OPTIONS: '/polls/{id}/options/'
        },
        TIMEOUT: 10000, // 10 seconds
        RETRY_ATTEMPTS: 3
    },

    // UI Configuration
    UI: {
        ITEMS_PER_PAGE: 12,
        AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
        NOTIFICATION_DURATION: 5000, // 5 seconds
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 500
    },

    // Poll Configuration
    POLL: {
        MIN_OPTIONS: 2,
        MAX_OPTIONS: 10,
        MIN_TITLE_LENGTH: 3,
        MAX_TITLE_LENGTH: 200,
        MAX_DESCRIPTION_LENGTH: 1000,
        MAX_OPTION_LENGTH: 100
    },

    // Local Storage Keys
    STORAGE: {
        VOTED_POLLS: 'votedPolls',
        USER_PREFERENCES: 'userPreferences',
        CACHED_POLLS: 'cachedPolls',
        LAST_REFRESH: 'lastRefresh'
    },

    // Error Messages
    MESSAGES: {
        ERRORS: {
            NETWORK: 'Unable to connect to server. Please check your internet connection.',
            SERVER: 'Server error occurred. Please try again later.',
            VALIDATION: 'Please check your input and try again.',
            NOT_FOUND: 'The requested resource was not found.',
            TIMEOUT: 'Request timed out. Please try again.',
            GENERIC: 'Something went wrong. Please try again.'
        },
        SUCCESS: {
            POLL_CREATED: 'Poll created successfully!',
            VOTE_SUBMITTED: 'Your vote has been submitted successfully!',
            DATA_LOADED: 'Data loaded successfully!',
            CONNECTION_RESTORED: 'Connection restored!'
        },
        INFO: {
            LOADING: 'Loading...',
            NO_POLLS: 'No polls available at the moment.',
            VOTE_RECORDED: 'You have already voted on this poll.',
            POLL_EXPIRED: 'This poll has expired.'
        }
    },

    // Feature Flags
    FEATURES: {
        AUTO_REFRESH: true,
        DARK_MODE: true,
        NOTIFICATIONS: true,
        ANALYTICS: false,
        CACHE_POLLS: true,
        OFFLINE_MODE: false
    },

    // Development Settings
    DEBUG: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Theme Configuration
    THEME: {
        PRIMARY_COLOR: '#0d6efd',
        SECONDARY_COLOR: '#6c757d',
        SUCCESS_COLOR: '#198754',
        DANGER_COLOR: '#dc3545',
        WARNING_COLOR: '#ffc107',
        INFO_COLOR: '#0dcaf0'
    }
};

// Environment-specific configurations
if (CONFIG.DEBUG) {
    CONFIG.API.BASE_URL = 'http://localhost:8000/api/v1';
    CONFIG.UI.AUTO_REFRESH_INTERVAL = 5000; // Faster refresh in development
} else {
    // Production settings
    CONFIG.API.BASE_URL = 'https://your-production-domain.com/api/v1';
    CONFIG.FEATURES.ANALYTICS = true;
}

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);

// Export for use in other files
window.CONFIG = CONFIG;

// Log configuration in debug mode
if (CONFIG.DEBUG) {
    console.log('Poll System Configuration:', CONFIG);
}