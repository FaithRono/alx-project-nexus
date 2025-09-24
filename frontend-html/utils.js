// Utility functions for the Poll System Frontend

/**
 * Utility class for common operations
 */
class Utils {
    
    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    static formatDate(dateString) {
        if (!dateString) return 'No expiration';
        
        const date = new Date(dateString);
        const now = new Date();
        
        if (date < now) {
            return 'Expired';
        }
        
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Calculate time remaining until expiration
     * @param {string} expiresAt - ISO date string
     * @returns {string} Time remaining or 'Expired'
     */
    static getTimeRemaining(expiresAt) {
        if (!expiresAt) return 'No expiration';
        
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry - now;
        
        if (diff <= 0) return 'Expired';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h remaining`;
        if (hours > 0) return `${hours}h ${minutes}m remaining`;
        return `${minutes}m remaining`;
    }

    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Validate poll data
     * @param {Object} data - Poll data to validate
     * @returns {Array} Array of error messages
     */
    static validatePollData(data) {
        const errors = [];
        
        if (!data.title || data.title.trim().length < CONFIG.POLL.MIN_TITLE_LENGTH) {
            errors.push(`Title must be at least ${CONFIG.POLL.MIN_TITLE_LENGTH} characters long`);
        }
        
        if (data.title && data.title.length > CONFIG.POLL.MAX_TITLE_LENGTH) {
            errors.push(`Title must be less than ${CONFIG.POLL.MAX_TITLE_LENGTH} characters`);
        }
        
        if (data.description && data.description.length > CONFIG.POLL.MAX_DESCRIPTION_LENGTH) {
            errors.push(`Description must be less than ${CONFIG.POLL.MAX_DESCRIPTION_LENGTH} characters`);
        }
        
        if (!data.options || data.options.length < CONFIG.POLL.MIN_OPTIONS) {
            errors.push(`Poll must have at least ${CONFIG.POLL.MIN_OPTIONS} options`);
        }
        
        if (data.options && data.options.length > CONFIG.POLL.MAX_OPTIONS) {
            errors.push(`Poll cannot have more than ${CONFIG.POLL.MAX_OPTIONS} options`);
        }
        
        if (data.options && data.options.some(opt => !opt.trim())) {
            errors.push('All options must have text');
        }
        
        if (data.options && data.options.some(opt => opt.length > CONFIG.POLL.MAX_OPTION_LENGTH)) {
            errors.push(`Option text must be less than ${CONFIG.POLL.MAX_OPTION_LENGTH} characters`);
        }
        
        if (data.expires_at && new Date(data.expires_at) <= new Date()) {
            errors.push('Expiration date must be in the future');
        }
        
        return errors;
    }

    /**
     * Show loading state
     * @param {boolean} show - Whether to show loading
     */
    static showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, danger, warning, info)
     * @param {number} duration - Auto-dismiss duration in ms
     */
    static showAlert(message, type = 'info', duration = CONFIG.UI.NOTIFICATION_DURATION) {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        const alertId = 'alert-' + Date.now();
        const iconClass = this.getAlertIcon(type);
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${iconClass} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('beforeend', alertHTML);
        
        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }
            }, duration);
        }
    }

    /**
     * Get Font Awesome icon for alert type
     * @param {string} type - Alert type
     * @returns {string} Icon class name
     */
    static getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    static debounce(func, wait = CONFIG.UI.DEBOUNCE_DELAY) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} Throttled function
     */
    static throttle(func, limit = 1000) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Check if user has voted on a poll
     * @param {number} pollId - Poll ID
     * @returns {boolean} True if user has voted
     */
    static hasUserVoted(pollId) {
        const votedPolls = this.getFromLocalStorage(CONFIG.STORAGE.VOTED_POLLS) || [];
        return votedPolls.includes(pollId);
    }

    /**
     * Mark poll as voted
     * @param {number} pollId - Poll ID
     */
    static markAsVoted(pollId) {
        const votedPolls = this.getFromLocalStorage(CONFIG.STORAGE.VOTED_POLLS) || [];
        if (!votedPolls.includes(pollId)) {
            votedPolls.push(pollId);
            this.saveToLocalStorage(CONFIG.STORAGE.VOTED_POLLS, votedPolls);
        }
    }

    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {*} data - Data to save
     */
    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            if (CONFIG.DEBUG) {
                this.showAlert('Failed to save data locally', 'warning');
            }
        }
    }

    /**
     * Get data from localStorage
     * @param {string} key - Storage key
     * @returns {*} Parsed data or null
     */
    static getFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return null;
        }
    }

    /**
     * Clear localStorage data
     * @param {string} key - Storage key to clear (optional, clears all if not provided)
     */
    static clearLocalStorage(key = null) {
        try {
            if (key) {
                localStorage.removeItem(key);
            } else {
                localStorage.clear();
            }
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }
    }

    /**
     * Check if browser is online
     * @returns {boolean} True if online
     */
    static isOnline() {
        return navigator.onLine;
    }

    /**
     * Check if current time is within poll validity
     * @param {string} expiresAt - ISO date string
     * @returns {boolean} True if poll is still valid
     */
    static isPollActive(expiresAt) {
        if (!expiresAt) return true;
        return new Date(expiresAt) > new Date();
    }

    /**
     * Calculate percentage
     * @param {number} part - Part value
     * @param {number} total - Total value
     * @returns {number} Percentage (0-100)
     */
    static calculatePercentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }

    /**
     * Generate random color
     * @returns {string} Hex color code
     */
    static generateRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} True if successful
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showAlert('Copied to clipboard!', 'success', 2000);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showAlert('Failed to copy to clipboard', 'danger');
            return false;
        }
    }

    /**
     * Format large numbers
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Get user's timezone
     * @returns {string} Timezone identifier
     */
    static getUserTimezone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    /**
     * Check if element is in viewport
     * @param {Element} element - Element to check
     * @returns {boolean} True if in viewport
     */
    static isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Smooth scroll to element
     * @param {string} elementId - ID of element to scroll to
     */
    static scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
}

// Export Utils to global scope
window.Utils = Utils;

// Set up global error handling
window.addEventListener('error', function(event) {
    if (CONFIG.DEBUG) {
        console.error('Global error:', event.error);
    }
    Utils.showAlert('An unexpected error occurred', 'danger');
});

// Set up unhandled promise rejection handling
window.addEventListener('unhandledrejection', function(event) {
    if (CONFIG.DEBUG) {
        console.error('Unhandled promise rejection:', event.reason);
    }
    Utils.showAlert('An unexpected error occurred', 'danger');
    event.preventDefault();
});

// Log utils initialization in debug mode
if (CONFIG.DEBUG) {
    console.log('Utils initialized successfully');
}