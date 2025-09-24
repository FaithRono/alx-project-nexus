// Complete Main JavaScript file for Poll System Frontend

/**
 * API Service for Poll System
 */
class PollAPI {
    constructor() {
        this.baseURL = 'http://localhost:8000/api/v1';
        this.timeout = 10000;
    }

    /**
     * Make HTTP request with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: this.timeout,
            ...options
        };

        try {
            showLoading(true);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - please try again');
            }
            
            if (!navigator.onLine) {
                throw new Error('No internet connection');
            }
            
            throw new Error(error.message || 'Something went wrong');
        } finally {
            showLoading(false);
        }
    }

    // API Endpoints
    async getPolls() {
        return await this.request('/polls/');
    }

    async getPoll(id) {
        return await this.request(`/polls/${id}/`);
    }

    async createPoll(pollData) {
        return await this.request('/polls/create/', {
            method: 'POST',
            body: JSON.stringify(pollData)
        });
    }

    async vote(voteData) {
        return await this.request('/vote/', {
            method: 'POST',
            body: JSON.stringify(voteData)
        });
    }

    async getPollResults(id) {
        return await this.request(`/polls/${id}/results/`);
    }

    async getStatistics() {
        return await this.request('/statistics/');
    }
}

/**
 * Main Application Class
 */
class PollApp {
    constructor() {
        this.api = new PollAPI();
        this.currentPage = 'home';
        this.currentPoll = null;
        this.polls = [];
        this.statistics = {};
        this.selectedOptionId = null;
        this.refreshInterval = null;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.showPage('home');
        this.loadInitialData();
        this.setupAutoRefresh();
        
        console.log('Poll App initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create poll form submission
        const createForm = document.getElementById('create-poll-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => this.handleCreatePoll(e));
        }

        // Handle browser navigation
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.showPage(event.state.page, false);
            }
        });

        // Handle online/offline events
        window.addEventListener('online', () => {
            showAlert('Connection restored!', 'success');
            this.refreshCurrentPage();
        });

        window.addEventListener('offline', () => {
            showAlert('Connection lost. Some features may not work.', 'warning');
        });

        // Handle visibility change for auto-refresh
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else {
                this.setupAutoRefresh();
            }
        });
        // Navigation event listeners
        document.addEventListener('click', (e) => {
        if (e.target.matches('[data-page]') || e.target.closest('[data-page]')) {
            e.preventDefault();
            const target = e.target.matches('[data-page]') ? e.target : e.target.closest('[data-page]');
            const page = target.getAttribute('data-page');
            this.showPage(page);
        }
        
        // Handle option removal
        if (e.target.matches('.btn-outline-danger') || e.target.closest('.btn-outline-danger')) {
            const button = e.target.matches('.btn-outline-danger') ? e.target : e.target.closest('.btn-outline-danger');
            this.removeOption(button);
        }
        });
    
        // Add option button
        const addOptionBtn = document.querySelector('[onclick*="addOption"]');
        if (addOptionBtn) {
            addOptionBtn.removeAttribute('onclick');
            addOptionBtn.addEventListener('click', () => this.addOption());
        }
    }


    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            await Promise.allSettled([
                this.loadPolls(),
                this.loadStatistics()
            ]);
            
            showAlert('Welcome to the Poll System!', 'success', 3000);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            showAlert('Welcome! Some features may be limited due to connection issues.', 'warning');
        }
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.refreshCurrentPage();
        }, 30000); // Refresh every 30 seconds
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Refresh current page data
     */
    refreshCurrentPage() {
        switch (this.currentPage) {
            case 'polls':
                this.loadPolls();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'poll-detail':
                if (this.currentPoll) {
                    this.showPollDetail(this.currentPoll.id);
                }
                break;
        }
    }

    /**
     * Show specific page
     */
    showPage(pageName, addToHistory = true) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;

            // Add to browser history
            if (addToHistory) {
                history.pushState({ page: pageName }, '', `#${pageName}`);
            }

            // Load page-specific data
            this.loadPageData(pageName);
            this.updateNavigation(pageName);
        }
    }

    /**
     * Load page-specific data
     */
    loadPageData(pageName) {
        switch (pageName) {
            case 'polls':
                this.loadPolls();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'create':
                this.resetCreateForm();
                break;
        }
    }

    /**
     * Update navigation active state
     */
    updateNavigation(activePage) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('onclick')?.includes(activePage)) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Load all polls
     */
    async loadPolls() {
        try {
            this.polls = await this.api.getPolls();
            this.displayPolls();
            
            saveToLocalStorage('cachedPolls', this.polls);
        } catch (error) {
            console.error('Failed to load polls:', error);
            this.handlePollsLoadError(error);
        }
    }

    /**
     * Handle polls load error
     */
    handlePollsLoadError(error) {
        const container = document.getElementById('polls-container');
        if (container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load polls: ${error.message}
                        <button class="btn btn-outline-danger btn-sm ms-3" onclick="pollApp.loadPolls()">
                            <i class="fas fa-redo me-1"></i>Retry
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Try to load from cache
        const cachedPolls = getFromLocalStorage('cachedPolls');
        if (cachedPolls) {
            this.polls = cachedPolls;
            this.displayPolls();
            showAlert('Showing cached data. Some information may be outdated.', 'info');
        }
    }

    /**
     * Display polls in the polls page
     */
    displayPolls() {
        const container = document.getElementById('polls-container');
        if (!container) return;

        if (!this.polls || this.polls.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No polls available</h4>
                    <p class="text-muted">Be the first to create a poll!</p>
                    <button class="btn btn-primary" onclick="pollApp.showPage('create')">
                        <i class="fas fa-plus me-2"></i>Create First Poll
                    </button>
                </div>
            `;
            return;
        }

        const pollsHTML = this.polls.map(poll => this.renderPollCard(poll)).join('');
        container.innerHTML = pollsHTML;
    }

    /**
     * Render individual poll card
     */
    renderPollCard(poll) {
        const hasVoted = hasUserVoted(poll.id);
        const timeRemaining = getTimeRemaining(poll.expires_at);
        const isActive = isPollActive(poll.expires_at);

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card poll-card h-100" onclick="pollApp.showPollDetail(${poll.id})">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${escapeHtml(poll.title)}</h5>
                            <span class="badge ${isActive ? 'bg-success' : 'bg-danger'}">
                                ${isActive ? 'Active' : 'Expired'}
                            </span>
                        </div>
                        <p class="card-text text-muted">
                            ${escapeHtml(poll.description || 'No description')}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">
                                <i class="fas fa-vote-yea me-1"></i>
                                ${formatNumber(poll.total_votes || 0)} votes
                            </small>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                ${timeRemaining}
                            </small>
                        </div>
                        ${hasVoted ? '<div class="mt-2"><span class="badge bg-info">You voted</span></div>' : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <button class="btn btn-outline-primary btn-sm w-100">
                            <i class="fas fa-eye me-1"></i>
                            ${hasVoted || !isActive ? 'View Results' : 'Vote Now'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show poll detail page
     */
    async showPollDetail(pollId) {
        try {
            this.currentPoll = await this.api.getPoll(pollId);
            this.displayPollDetail();
            this.showPage('poll-detail');
        } catch (error) {
            console.error('Failed to load poll detail:', error);
            showAlert(`Failed to load poll details: ${error.message}`, 'danger');
        }
    }

    /**
     * Display poll detail with voting interface or results
     */
    displayPollDetail() {
        if (!this.currentPoll) return;

        const container = document.getElementById('poll-detail-content');
        if (!container) return;

        const hasVoted = hasUserVoted(this.currentPoll.id);
        const isActive = isPollActive(this.currentPoll.expires_at);
        const canVote = !hasVoted && isActive;

        container.innerHTML = `
            <div class="row">
                <div class="col-md-8 mx-auto">
                    <div class="card shadow-lg">
                        <div class="card-header bg-primary text-white">
                            <h3 class="card-title mb-0">${escapeHtml(this.currentPoll.title)}</h3>
                        </div>
                        <div class="card-body">
                            <p class="lead">${escapeHtml(this.currentPoll.description || 'No description provided')}</p>
                            
                            ${this.renderPollMeta()}
                            
                            ${canVote ? this.renderVotingInterface() : this.renderPollResults()}
                            
                            <div class="mt-3">
                                <small class="text-muted">
                                    <i class="fas fa-clock me-1"></i>
                                    ${getTimeRemaining(this.currentPoll.expires_at)}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render poll metadata
     */
    renderPollMeta() {
        const isActive = isPollActive(this.currentPoll.expires_at);
        
        return `
            <div class="poll-meta mb-4">
                <div class="row text-center">
                    <div class="col-md-4">
                        <div class="stat-card">
                            <div class="stat-number">${formatNumber(this.currentPoll.total_votes || 0)}</div>
                            <div class="stat-label">Total Votes</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="stat-card">
                            <div class="stat-number">${this.currentPoll.options?.length || 0}</div>
                            <div class="stat-label">Options</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="stat-card">
                            <div class="stat-number ${isActive ? 'text-success' : 'text-danger'}">
                                ${isActive ? 'Active' : 'Expired'}
                            </div>
                            <div class="stat-label">Status</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render voting interface
     */
    renderVotingInterface() {
        const optionsHTML = this.currentPoll.options.map(option => `
            <div class="option-item" onclick="pollApp.selectOption(${option.id})" data-option-id="${option.id}">
                <div class="option-text">${escapeHtml(option.text)}</div>
            </div>
        `).join('');

        return `
            <div class="voting-section">
                <h5 class="mb-3">Choose your option:</h5>
                <div id="options-list">
                    ${optionsHTML}
                </div>
                <button id="submit-vote-btn" class="btn btn-primary btn-lg mt-3" onclick="pollApp.submitVote()" disabled>
                    <i class="fas fa-vote-yea me-2"></i>Submit Vote
                </button>
            </div>
        `;
    }

    /**
     * Render poll results
     */
    renderPollResults() {
        const totalVotes = this.currentPoll.total_votes || 0;

        const resultsHTML = this.currentPoll.options.map(option => {
            const voteCount = option.vote_count || 0;
            const percentage = calculatePercentage(voteCount, totalVotes);

            return `
                <div class="result-item">
                    <div class="result-label">
                        <span>${escapeHtml(option.text)}</span>
                        <span class="vote-percentage">${formatNumber(voteCount)} votes (${percentage}%)</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="poll-results">
                <h5 class="mb-3">Results:</h5>
                ${resultsHTML}
            </div>
        `;
    }

    /**
     * Handle option selection
     */
    selectOption(optionId) {
        // Remove previous selection
        document.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to clicked option
        const selectedOption = document.querySelector(`[data-option-id="${optionId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
            this.selectedOptionId = optionId;

            // Enable submit button
            const submitBtn = document.getElementById('submit-vote-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Submit vote
     */
    async submitVote() {
        if (!this.selectedOptionId) {
            showAlert('Please select an option', 'warning');
            return;
        }

        try {
            await this.api.vote({ option: this.selectedOptionId });
            markAsVoted(this.currentPoll.id);
            showAlert('Vote submitted successfully!', 'success');

            // Refresh poll detail and polls list
            await this.showPollDetail(this.currentPoll.id);
            this.loadPolls();

        } catch (error) {
            console.error('Failed to submit vote:', error);
            showAlert(`Failed to submit vote: ${error.message}`, 'danger');
        }
    }

    /**
     * Handle create poll form submission
     */
    async handleCreatePoll(event) {
        event.preventDefault();

        const title = document.getElementById('poll-title').value.trim();
        const description = document.getElementById('poll-description').value.trim();
        const expiresAt = document.getElementById('poll-expires').value;

        // Get options
        const optionInputs = document.querySelectorAll('.option-input');
        const options = Array.from(optionInputs)
            .map(input => input.value.trim())
            .filter(value => value.length > 0);

        // Validate data
        const pollData = {
            title,
            description,
            options,
            expires_at: expiresAt || null
        };

        const errors = validatePollData(pollData);
        if (errors.length > 0) {
            showAlert(errors.join('<br>'), 'danger');
            return;
        }

        try {
            await this.api.createPoll(pollData);
            showAlert('Poll created successfully!', 'success');

            // Reset form and redirect
            this.resetCreateForm();
            await this.loadPolls();
            this.showPage('polls');

        } catch (error) {
            console.error('Failed to create poll:', error);
            showAlert(`Failed to create poll: ${error.message}`, 'danger');
        }
    }

    /**
     * Add new option input
     */
    addOption() {
        const container = document.getElementById('options-container');
        const optionCount = container.children.length;
        
        if (optionCount >= 10) {
            showAlert('Maximum 10 options allowed', 'warning');
            return;
        }
        
        const optionHTML = `
            <div class="input-group mb-2">
                <input type="text" class="form-control option-input" placeholder="Option ${optionCount + 1}" required>
                <button class="btn btn-outline-danger" type="button" onclick="pollApp.removeOption(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', optionHTML);
    }

    /**
     * Remove option input
     */
    removeOption(button) {
        const container = document.getElementById('options-container');
        
        if (container.children.length <= 2) {
            showAlert('Minimum 2 options required', 'warning');
            return;
        }
        
        button.closest('.input-group').remove();
        
        // Update placeholders
        const inputs = container.querySelectorAll('.option-input');
        inputs.forEach((input, index) => {
            input.placeholder = `Option ${index + 1}`;
        });
        
        // Disable remove button for first option if only 2 remain
        if (container.children.length === 2) {
            container.children[0].querySelector('.btn-outline-danger').disabled = true;
        }
    }

    /**
     * Reset create poll form
     */
    resetCreateForm() {
        const form = document.getElementById('create-poll-form');
        if (form) {
            form.reset();
            
            // Reset options to default 2
            const container = document.getElementById('options-container');
            if (container) {
                container.innerHTML = `
                    <div class="input-group mb-2">
                        <input type="text" class="form-control option-input" placeholder="Option 1" required>
                        <button class="btn btn-outline-danger" type="button" onclick="pollApp.removeOption(this)" disabled>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="input-group mb-2">
                        <input type="text" class="form-control option-input" placeholder="Option 2" required>
                        <button class="btn btn-outline-danger" type="button" onclick="pollApp.removeOption(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Load and display statistics
     */
    async loadStatistics() {
        try {
            this.statistics = await this.api.getStatistics();
            this.displayStatistics();
        } catch (error) {
            console.error('Failed to load statistics:', error);
            const container = document.getElementById('statistics-content');
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Failed to load statistics: ${error.message}
                            <button class="btn btn-outline-danger btn-sm ms-3" onclick="pollApp.loadStatistics()">
                                <i class="fas fa-redo me-1"></i>Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Display statistics
     */
    displayStatistics() {
        const container = document.getElementById('statistics-content');
        if (!container) return;

        const statsHTML = `
            <div class="col-md-3 mb-4">
                <div class="stat-card">
                    <i class="fas fa-poll fa-2x text-primary mb-2"></i>
                    <div class="stat-number">${formatNumber(this.statistics.total_polls || 0)}</div>
                    <div class="stat-label">Total Polls</div>
                </div>
            </div>
            <div class="col-md-3 mb-4">
                <div class="stat-card">
                    <i class="fas fa-vote-yea fa-2x text-success mb-2"></i>
                    <div class="stat-number">${formatNumber(this.statistics.total_votes || 0)}</div>
                    <div class="stat-label">Total Votes</div>
                </div>
            </div>
            <div class="col-md-3 mb-4">
                <div class="stat-card">
                    <i class="fas fa-check-circle fa-2x text-info mb-2"></i>
                    <div class="stat-number">${formatNumber(this.statistics.active_polls || 0)}</div>
                    <div class="stat-label">Active Polls</div>
                </div>
            </div>
            <div class="col-md-3 mb-4">
                <div class="stat-card">
                    <i class="fas fa-clock fa-2x text-warning mb-2"></i>
                    <div class="stat-number">${formatNumber(this.statistics.expired_polls || 0)}</div>
                    <div class="stat-label">Expired Polls</div>
                </div>
            </div>
        `;

        container.innerHTML = statsHTML;
    }
}

// Utility Functions
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alert-container');
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto-dismiss after duration
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, duration);
}

function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function getTimeRemaining(expiresAt) {
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

function isPollActive(expiresAt) {
    if (!expiresAt) return true;
    return new Date(expiresAt) > new Date();
}

function calculatePercentage(count, total) {
    return total > 0 ? Math.round((count / total) * 100) : 0;
}

function hasUserVoted(pollId) {
    const votedPolls = getFromLocalStorage('votedPolls') || [];
    return votedPolls.includes(pollId);
}

function markAsVoted(pollId) {
    const votedPolls = getFromLocalStorage('votedPolls') || [];
    if (!votedPolls.includes(pollId)) {
        votedPolls.push(pollId);
        saveToLocalStorage('votedPolls', votedPolls);
    }
}

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to read from localStorage:', error);
        return null;
    }
}

function validatePollData(data) {
    const errors = [];
    
    if (!data.title || data.title.trim().length < 3) {
        errors.push('Title must be at least 3 characters long');
    }
    
    if (!data.options || data.options.length < 2) {
        errors.push('Poll must have at least 2 options');
    }
    
    if (data.options && data.options.some(opt => !opt.trim())) {
        errors.push('All options must have text');
    }
    
    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
        errors.push('Expiration date must be in the future');
    }
    
    return errors;
}

// Initialize the application when DOM is loaded
let pollApp;
document.addEventListener('DOMContentLoaded', function() {
    pollApp = new PollApp();
});

// Global function for navigation
function showPage(pageName) {
    if (pollApp) {
        pollApp.showPage(pageName);
    }
}

// Global functions for create poll form
function addOption() {
    if (pollApp) {
        pollApp.addOption();
    }
}

function removeOption(button) {
    if (pollApp) {
        pollApp.removeOption(button);
    }
}
// GLOBAL FUNCTIONS FOR HTML onclick EVENTS
// =============================================================================

// Global function for navigation
window.showPage = function(pageName) {
    if (window.pollApp) {
        window.pollApp.showPage(pageName);
    } else {
        console.error('Poll app not initialized yet');
    }
};

// Global functions for create poll form
window.addOption = function() {
    if (window.pollApp) {
        window.pollApp.addOption();
    } else {
        console.error('Poll app not initialized yet');
    }
};

window.removeOption = function(button) {
    if (window.pollApp) {
        window.pollApp.removeOption(button);
    } else {
        console.error('Poll app not initialized yet');
    }
};
// Global function for poll detail
window.showPollDetail = function(pollId) {
    if (window.pollApp) {
        window.pollApp.showPollDetail(pollId);
    } else {
        console.error('Poll app not initialized yet');
    }
};

// Initialize the application when DOM is loaded
window.pollApp = null;
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Poll App...');
    window.pollApp = new PollApp();
    console.log('Poll App initialized and available globally');
});