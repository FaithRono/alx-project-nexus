/**
 * Poll System Main Application - Enhanced Version
 * Handles navigation, polls, voting, and user interactions with full CRUD operations
 */

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function showLoading(show) {
    let loading = document.getElementById('loading');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loading';
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                <h5 class="text-primary">Loading...</h5>
            </div>
        `;
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        document.body.appendChild(loading);
    }
    
    loading.style.display = show ? 'flex' : 'none';
}

function showAlert(message, type = 'info', duration = 5000) {
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(alertContainer);
    }
    
    const alertId = 'alert-' + Date.now();
    const typeClass = type === 'error' ? 'danger' : type;
    const icon = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    }[typeClass] || 'info-circle';
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${typeClass} alert-dismissible fade show animate__animated animate__fadeInRight" role="alert" style="margin-bottom: 10px;">
            <i class="fas fa-${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" onclick="document.getElementById('${alertId}').remove()"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.classList.add('animate__fadeOutRight');
            setTimeout(() => alert.remove(), 500);
        }
    }, duration);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num || 0);
}

// =============================================================================
// MAIN APPLICATION CLASS
// =============================================================================

class PollApp {
    constructor() {
        this.baseURL = window.location.origin;
        this.currentPage = 'home';
        this.polls = [];
        this.userPolls = [];
        this.statistics = {};
        this.currentFilter = {
            search: '',
            status: 'all',
            category: 'all',
            sort: 'newest'
        };
        this.searchTimeout = null;
        
        this.init();
    }

    init() {
        console.log('Initializing Poll App...');
        this.setupEventListeners();
        this.loadInitialData();
        console.log('Poll App initialized successfully');
    }

    setupEventListeners() {
        // Navigation clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-page]');
            if (target) {
                e.preventDefault();
                const page = target.getAttribute('data-page');
                console.log('Navigation clicked:', page);
                this.navigateToPage(page);
            }
        });

        // Create poll form
        const createForm = document.getElementById('create-poll-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreatePoll(e);
            });
        }

        // Add option button
        const addOptionBtn = document.getElementById('add-option-btn');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => this.addOption());
        }

        // Filter inputs
        this.setupFilterListeners();

        // Remove option buttons (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-option')) {
                this.removeOption(e.target.closest('.input-group'));
            }
        });
    }

    setupFilterListeners() {
        const elements = [
            { id: 'search-polls', event: 'input', filter: 'search' },
            { id: 'sort-polls', event: 'change', filter: 'sort' },
            { id: 'filter-status', event: 'change', filter: 'status' },
            { id: 'filter-category', event: 'change', filter: 'category' }
        ];

        elements.forEach(({ id, event, filter }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, (e) => {
                    this.currentFilter[filter] = e.target.value;
                    // Add slight delay for search input to prevent excessive filtering
                    if (filter === 'search') {
                        clearTimeout(this.searchTimeout);
                        this.searchTimeout = setTimeout(() => {
                            this.filterPolls();
                        }, 300);
                    } else {
                        this.filterPolls();
                    }
                });
            }
        });
        
        // Add manual filter button listener
        const filterBtn = document.querySelector('[onclick*="filterPolls"]');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.filterPolls());
        }
        
        // Add clear filters button listener
        const clearBtn = document.querySelector('[onclick*="clearFilters"]');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    navigateToPage(page) {
        console.log(`Navigating to: ${page}`);
        
        // Check authentication for protected pages
        const protectedPages = ['polls', 'create', 'my-polls', 'statistics', 'profile'];
        const isAuthenticated = this.isAuthenticated();
        
        if (protectedPages.includes(page) && !isAuthenticated) {
            console.log('Authentication required for page:', page);
            showAlert('Please log in to access this feature', 'warning');
            this.showLoginModal();
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
            
            // Update navigation
            this.updateNavigationState(page);
            
            // Load page data
            this.loadPageData(page);
            
            // Update URL
            window.history.pushState({ page }, '', page === 'home' ? '/' : `/#${page}`);
            
            console.log(`Successfully navigated to: ${page}`);
        } else {
            console.error(`Page not found: ${page}-page`);
        }
    }

    updateNavigationState(currentPage) {
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const currentNavLink = document.querySelector(`[data-page="${currentPage}"].nav-link`);
        if (currentNavLink) {
            currentNavLink.classList.add('active');
        }
    }

    showLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(loginModal);
            modal.show();
        }
    }

    isAuthenticated() {
        return document.querySelector('meta[name="user-authenticated"]')?.content === 'true';
    }

    getCurrentUser() {
        try {
            const userMeta = document.querySelector('meta[name="current-user"]');
            return userMeta ? JSON.parse(userMeta.content) : null;
        } catch {
            return null;
        }
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               document.querySelector('meta[name="csrf-token"]')?.content || '';
    }

    async loadInitialData() {
        try {
            // Only load data if authenticated
            if (this.isAuthenticated()) {
                await Promise.allSettled([
                    this.loadPolls(),
                    this.loadStatistics()
                ]);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    loadPageData(page) {
        console.log(`Loading data for page: ${page}`);
        
        switch (page) {
            case 'home':
                this.loadDashboardData();
                break;
            case 'polls':
                this.loadPolls();
                break;
            case 'my-polls':
                this.loadUserPolls();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'create':
                this.initializeCreateForm();
                break;
        }
    }

    async loadDashboardData() {
        if (!this.isAuthenticated()) return;
        
        try {
            await Promise.all([
                this.loadQuickStats(),
                this.loadRecentPolls()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

        // Add these methods to your PollApp class:
    
    async loadQuickStats() {
        console.log('Loading quick stats...');
        const container = document.getElementById('statistics-content');
        if (!container) {
            console.warn('Statistics container not found');
            return;
        }
    
        // Show loading state
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading stats...</span>
                </div>
            </div>
        `;
    
        try {
            const response = await fetch('/api/statistics/', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });
    
            if (response.ok) {
                const data = await response.json();
                this.displayQuickStats(data);
                console.log('✅ Quick stats loaded successfully');
            } else {
                console.log('📊 API not available, using fallback stats');
                this.displayFallbackStats();
            }
        } catch (error) {
            console.error('Error loading quick stats:', error);
            this.displayFallbackStats();
        }
    }
    
    displayQuickStats(stats) {
        const container = document.getElementById('statistics-content');
        if (!container) return;
    
        container.innerHTML = `
            <div class="col-lg-3 col-md-6">
                <div class="card card-modern text-center h-100" style="background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%); color: white;">
                    <div class="card-body">
                        <i class="fas fa-poll fa-3x mb-3 opacity-75"></i>
                        <div class="display-6 fw-bold">${formatNumber(stats.totalPolls || 0)}</div>
                        <div class="text-white-50">Total Polls</div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div class="card card-modern text-center h-100" style="background: linear-gradient(135deg, #06d6a0 0%, #05c290 100%); color: white;">
                    <div class="card-body">
                        <i class="fas fa-vote-yea fa-3x mb-3 opacity-75"></i>
                        <div class="display-6 fw-bold">${formatNumber(stats.totalVotes || 0)}</div>
                        <div class="text-white-50">Total Votes</div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div class="card card-modern text-center h-100" style="background: linear-gradient(135deg, #ffd166 0%, #ffba08 100%); color: white;">
                    <div class="card-body">
                        <i class="fas fa-chart-line fa-3x mb-3 opacity-75"></i>
                        <div class="display-6 fw-bold">${stats.avgParticipation || 0}%</div>
                        <div class="text-white-50">Participation</div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div class="card card-modern text-center h-100" style="background: linear-gradient(135deg, #ef476f 0%, #e5365f 100%); color: white;">
                    <div class="card-body">
                        <i class="fas fa-clock fa-3x mb-3 opacity-75"></i>
                        <div class="display-6 fw-bold">${formatNumber(stats.activePollsCount || 0)}</div>
                        <div class="text-white-50">Active Polls</div>
                    </div>
                </div>
            </div>
        `;
    }
    
        // Replace your displayFallbackStats method:
    
    displayFallbackStats() {
        console.log('📊 Displaying fallback stats');
        console.log('📊 Available userPolls:', this.userPolls);
        
        const container = document.getElementById('statistics-content');
        if (!container) return;
    
        // Calculate stats from existing data
        const totalPolls = this.userPolls ? this.userPolls.length : 0;
        const totalVotes = this.userPolls ? this.userPolls.reduce((sum, poll) => {
            const votes = poll.vote_count || 0;
            console.log(`Poll "${poll.title}" has ${votes} votes`);
            return sum + votes;
        }, 0) : 0;
        
        const activePolls = this.userPolls ? this.userPolls.filter(poll => poll.is_active).length : 0;
        const participation = totalPolls > 0 ? Math.round((totalVotes / totalPolls) * 10) : 0;
    
        const stats = {
            totalPolls,
            totalVotes,
            avgParticipation: Math.min(100, participation),
            activePollsCount: activePolls
        };
    
        console.log('📊 Fallback stats calculated:', stats);
        this.displayQuickStats(stats);
    }
    
   
    
    async loadDashboardData() {
        if (!this.isAuthenticated()) {
            this.displayGuestStats();
            return;
        }
        
        try {
            console.log('Loading dashboard data...');
            
            // 🔥 FIRST: Load user polls and WAIT for them
            console.log('📊 Loading user polls first...');
            await this.loadUserPolls();
            console.log('📊 User polls loaded, count:', this.userPolls?.length || 0);
            
            // 🔥 THEN: Try to load stats from API
            try {
                await this.loadQuickStats();
            } catch (error) {
                console.log('📊 API failed, using fallback with loaded polls');
                this.displayFallbackStats();
            }
            
            // 🔥 FINALLY: Load recent polls (non-blocking)
            this.loadRecentPolls().catch(err => console.log('Recent polls failed:', err));
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Even if everything fails, try fallback
            this.displayFallbackStats();
        }
    }
    
    displayGuestStats() {
        const container = document.getElementById('statistics-content');
        if (!container) return;
    
        container.innerHTML = `
            <div class="col-12">
                <div class="card card-modern text-center p-5">
                    <i class="fas fa-sign-in-alt fa-4x text-primary mb-4"></i>
                    <h4 class="fw-bold mb-3">Welcome to Poll Nexus!</h4>
                    <p class="text-muted mb-4">Sign in to view your personalized dashboard with statistics and recent activity.</p>
                    <div class="d-flex justify-content-center gap-3">
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#loginModal">
                            <i class="fas fa-sign-in-alt me-2"></i>Login
                        </button>
                        <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#registerModal">
                            <i class="fas fa-user-plus me-2"></i>Register
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Also update the loadPageData method to ensure home page loads stats:
    loadPageData(page) {
        console.log(`Loading data for page: ${page}`);
        
        switch (page) {
            case 'home':
                this.loadDashboardData();
                break;
            case 'polls':
                this.loadPolls();
                break;
            case 'my-polls':
                this.loadUserPolls();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'create':
                this.initializeCreateForm();
                break;
            default:
                // For any other page, try to load basic data
                if (this.isAuthenticated()) {
                    this.loadQuickStats();
                }
                break;
        }
    }

    async loadRecentPolls() {
        const container = document.getElementById('recent-polls');
        if (!container) return;

        try {
            const response = await fetch('/api/polls/?limit=3', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                const recentPolls = (data.polls || data || []).slice(0, 3);
                container.innerHTML = recentPolls.map(poll => this.renderPollCard(poll)).join('');
            } else {
                container.innerHTML = '<div class="col-12 text-center text-muted">No recent polls available</div>';
            }
        } catch (error) {
            console.error('Error loading recent polls:', error);
            container.innerHTML = '<div class="col-12 text-center text-muted">Unable to load recent polls</div>';
        }
    }

    async loadPolls() {
        console.log('Loading all polls...');
        const container = document.getElementById('polls-container');
        if (!container) return;

        showLoading(true);
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary"></div></div>';

        try {
            const response = await fetch('/api/polls/', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.polls = data.polls || data || [];
                this.displayPolls();
                console.log(`Loaded ${this.polls.length} polls`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading polls:', error);
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning text-center">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Unable to load polls at the moment. Please try again later.
                        <br><br>
                        <button class="btn btn-outline-primary" onclick="window.app.loadPolls()">
                            <i class="fas fa-redo me-1"></i>Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            showLoading(false);
        }
    }

    async loadUserPolls() {
        console.log('Loading user polls...');
        const container = document.getElementById('user-polls');
        if (!container) return;

        if (!this.isAuthenticated()) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="card card-modern p-5">
                        <i class="fas fa-lock fa-5x text-muted mb-4"></i>
                        <h3>Authentication Required</h3>
                        <p class="text-muted mb-4">Please log in to view your polls.</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#loginModal">
                            <i class="fas fa-sign-in-alt me-2"></i>Login
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        showLoading(true);
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary"></div></div>';

        try {
            const response = await fetch('/api/my-polls/', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.userPolls = data.polls || data || [];
                this.displayUserPolls();
                console.log(`Loaded ${this.userPolls.length} user polls`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading user polls:', error);
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning text-center">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Unable to load your polls. Please try again later.
                        <br><br>
                        <button class="btn btn-outline-primary" onclick="window.app.loadUserPolls()">
                            <i class="fas fa-redo me-1"></i>Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            showLoading(false);
        }
    }

    async loadStatistics() {
        console.log('Loading statistics...');
        
        // Load dashboard stats
        await this.loadQuickStats();
        
        // Load detailed analytics
        await this.loadDetailedAnalytics();
        await this.loadTopPolls();
    }

    async loadDetailedAnalytics() {
        const container = document.getElementById('detailed-statistics');
        if (!container) return;

        try {
            const response = await fetch('/api/statistics/detailed/', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayDetailedStatistics(data);
            } else {
                this.displayPlaceholderDetailedStats();
            }
        } catch (error) {
            console.error('Error loading detailed analytics:', error);
            this.displayPlaceholderDetailedStats();
        }
    }

    async loadTopPolls() {
        const container = document.getElementById('top-polls');
        if (!container) return;

        try {
            const response = await fetch('/api/statistics/top-polls/', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayTopPolls(data);
            } else {
                container.innerHTML = '<div class="col-12 text-center text-muted">No data available</div>';
            }
        } catch (error) {
            console.error('Error loading top polls:', error);
            container.innerHTML = '<div class="col-12 text-center text-muted">Unable to load top polls</div>';
        }
    }

    displayStatistics(stats) {
        const container = document.getElementById('statistics-content');
        if (!container) return;

        container.innerHTML = `
            <div class="col-lg-3 col-md-6">
                <div class="stat-card">
                    <i class="fas fa-poll fa-2x mb-3"></i>
                    <div class="stat-number">${formatNumber(stats.totalPolls || 0)}</div>
                    <div class="stat-label">Total Polls</div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div class="stat-card">
                    <i class="fas fa-vote-yea fa-2x mb-3"></i>
                    <div class="stat-number">${formatNumber(stats.totalVotes || 0)}</div>
                    <div class="stat-label">Total Votes</div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div class="stat-card">
                    <i class="fas fa-chart-line fa-2x mb-3"></i>
                    <div class="stat-number">${stats.avgParticipation || 0}%</div>
                    <div class="stat-label">Avg Participation</div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div class="stat-card">
                    <i class="fas fa-clock fa-2x mb-3"></i>
                    <div class="stat-number">${formatNumber(stats.activePollsCount || 0)}</div>
                    <div class="stat-label">Active Polls</div>
                </div>
            </div>
        `;
    }

    displayDetailedStatistics(stats) {
        const container = document.getElementById('detailed-statistics');
        if (!container) return;

        container.innerHTML = `
            <div class="mb-4">
                <h6 class="fw-bold mb-3">Performance Metrics</h6>
                <div class="d-flex justify-content-between mb-2">
                    <span>Poll Completion Rate:</span>
                    <strong>${stats.completionRate || 75}%</strong>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Avg Votes per Poll:</span>
                    <strong>${formatNumber(stats.avgVotesPerPoll || 0)}</strong>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>User Engagement:</span>
                    <strong>${stats.engagementRate || 60}%</strong>
                </div>
            </div>
            <div>
                <h6 class="fw-bold mb-3">Category Distribution</h6>
                ${(stats.categoryDistribution || []).map(cat => `
                    <div class="d-flex justify-content-between mb-1">
                        <span>${cat.name || 'Category'}:</span>
                        <strong>${cat.count || 0}</strong>
                    </div>
                `).join('')}
            </div>
        `;
    }

    displayTopPolls(polls) {
        const container = document.getElementById('top-polls');
        if (!container) return;

        const topPolls = polls.topPolls || polls || [];
        
        if (topPolls.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted">No polls available</div>';
            return;
        }

        container.innerHTML = topPolls.map((poll, index) => `
            <div class="col-md-6 col-lg-4">
                <div class="card card-modern h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <span class="badge bg-primary me-2">#${index + 1}</span>
                            <h6 class="mb-0 flex-grow-1">${escapeHtml(poll.title || 'Untitled Poll')}</h6>
                        </div>
                        <div class="d-flex justify-content-between text-sm">
                            <span><i class="fas fa-vote-yea me-1"></i>${formatNumber(poll.vote_count || 0)} votes</span>
                            <span><i class="fas fa-chart-line me-1"></i>${poll.participation_rate || 0}%</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayPlaceholderStatistics() {
        const container = document.getElementById('statistics-content');
        if (!container) return;

        const stats = {
            totalPolls: 0,
            totalVotes: 0,
            avgParticipation: 0,
            activePollsCount: 0
        };

        this.displayStatistics(stats);
    }

    displayPlaceholderDetailedStats() {
        const container = document.getElementById('detailed-statistics');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-chart-bar fa-2x mb-2"></i>
                <p>Analytics data will appear here</p>
            </div>
        `;
    }
    

    displayPolls() {
        const container = document.getElementById('polls-container');
        if (!container) return;

        if (!this.polls || this.polls.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="card card-modern p-5">
                        <i class="fas fa-poll fa-5x text-muted mb-4"></i>
                        <h4>No polls available</h4>
                        <p class="text-muted mb-4">Be the first to create a poll!</p>
                        <button class="btn btn-primary btn-modern" data-page="create">
                            <i class="fas fa-plus me-2"></i>Create Poll
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.polls.map(poll => this.renderPollCard(poll)).join('');
    }

    displayUserPolls() {
        const container = document.getElementById('user-polls');
        if (!container) return;

        if (!this.userPolls || this.userPolls.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="card card-modern p-5">
                        <i class="fas fa-poll fa-5x text-muted mb-4"></i>
                        <h4>No polls yet</h4>
                        <p class="text-muted mb-4">Create your first poll to get started!</p>
                        <button class="btn btn-primary btn-modern" data-page="create">
                            <i class="fas fa-plus me-2"></i>Create Your First Poll
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.userPolls.map(poll => this.renderUserPollCard(poll)).join('');
    }

    // =============================================================================
    // SEARCH AND FILTER FUNCTIONALITY - FIXED IMPLEMENTATION
    // =============================================================================

    filterPolls() {
        console.log('Filtering polls with:', this.currentFilter);
        
        const container = document.getElementById('polls-container');
        if (!container || !this.polls || this.polls.length === 0) return;
        
        let filteredPolls = [...this.polls];
        
        // 1. Search filter (title and description)
        if (this.currentFilter.search) {
            const searchTerm = this.currentFilter.search.toLowerCase();
            filteredPolls = filteredPolls.filter(poll => 
                poll.title.toLowerCase().includes(searchTerm) ||
                (poll.description && poll.description.toLowerCase().includes(searchTerm))
            );
        }
        
        // 2. Status filter
        if (this.currentFilter.status !== 'all') {
            filteredPolls = filteredPolls.filter(poll => 
                this.currentFilter.status === 'active' ? poll.is_active : !poll.is_active
            );
        }
        
        // 3. Category filter
        if (this.currentFilter.category !== 'all') {
            filteredPolls = filteredPolls.filter(poll => 
                poll.category === this.currentFilter.category
            );
        }
        
        // 4. Sort filter
        switch (this.currentFilter.sort) {
            case 'oldest':
                filteredPolls.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'popular':
                filteredPolls.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
                break;
            case 'trending':
                // Simple trending: recent polls with high votes
                filteredPolls.sort((a, b) => {
                    const aScore = (a.vote_count || 0) * (new Date(a.created_at).getTime() / 1000000000000);
                    const bScore = (b.vote_count || 0) * (new Date(b.created_at).getTime() / 1000000000000);
                    return bScore - aScore;
                });
                break;
            case 'newest':
            default:
                filteredPolls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }
        
        // Display filtered results
        this.displayFilteredPolls(filteredPolls);
    }

    displayFilteredPolls(filteredPolls) {
        const container = document.getElementById('polls-container');
        if (!container) return;
        
        if (filteredPolls.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="card card-modern p-5">
                        <i class="fas fa-search fa-5x text-muted mb-4"></i>
                        <h4>No polls found</h4>
                        <p class="text-muted mb-4">Try adjusting your search or filters</p>
                        <button class="btn btn-outline-primary" onclick="window.app.clearFilters()">
                            <i class="fas fa-times me-2"></i>Clear Filters
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredPolls.map(poll => this.renderPollCard(poll)).join('');
        
        // Add filter result count
        const filterInfo = document.createElement('div');
        filterInfo.className = 'col-12 mb-3';
        filterInfo.innerHTML = `
            <div class="alert alert-info d-flex justify-content-between align-items-center">
                <span>
                    <i class="fas fa-filter me-2"></i>
                    Showing ${filteredPolls.length} of ${this.polls.length} polls
                </span>
                <button class="btn btn-sm btn-outline-info" onclick="window.app.clearFilters()">
                    <i class="fas fa-times me-1"></i>Clear
                </button>
            </div>
        `;
        container.insertBefore(filterInfo, container.firstChild);
    }

    clearFilters() {
        this.currentFilter = {
            search: '',
            status: 'all',
            category: 'all',
            sort: 'newest'
        };
        
        // Reset form elements
        const elements = {
            'search-polls': '',
            'sort-polls': 'newest',
            'filter-status': 'all',
            'filter-category': 'all'
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.tagName === 'SELECT') {
                    element.value = elements[id];
                } else {
                    element.value = elements[id];
                }
            }
        });
        
        // Show all polls
        this.displayPolls();
    }

    // =============================================================================
    // POLL CARD RENDERING (existing methods)
    // =============================================================================

    renderPollCard(poll) {
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card card-modern h-100 poll-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h5 class="card-title fw-bold">${escapeHtml(poll.title || 'Untitled Poll')}</h5>
                            <span class="badge ${poll.is_active ? 'bg-success' : 'bg-secondary'}">
                                ${poll.is_active ? 'Active' : 'Closed'}
                            </span>
                        </div>
                        <p class="card-text text-muted">${escapeHtml(poll.description || 'No description')}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <small class="text-muted">
                                <i class="fas fa-users me-1"></i>${formatNumber(poll.vote_count || 0)} votes
                            </small>
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>${this.formatDate(poll.created_at)}
                            </small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary btn-modern flex-fill" onclick="window.app.viewPoll(${poll.id})">
                                <i class="fas fa-vote-yea me-2"></i>Vote Now
                            </button>
                            <button class="btn btn-outline-secondary btn-modern" onclick="window.app.viewResults(${poll.id})" title="View Results">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    

        
    // Replace the dropdown section in renderUserPollCard with this:
    
    renderUserPollCard(poll) {
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card card-modern h-100" style="overflow: visible !important;">
                    <div class="card-body" style="overflow: visible !important;">
                        <h5 class="card-title mb-3">${escapeHtml(poll.title || 'Untitled Poll')}</h5>
                        <p class="card-text text-muted">${escapeHtml(poll.description || 'No description')}</p>
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="d-flex gap-2">
                                <span class="badge bg-primary">${poll.vote_count || 0} votes</span>
                                <span class="badge bg-${poll.is_active ? 'success' : 'secondary'}">
                                    ${poll.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <small class="text-muted">${this.formatDate(poll.created_at)}</small>
                        </div>
                    </div>
                    
                    <!-- ✅ ALWAYS VISIBLE BUTTONS -->
                    <div class="card-footer bg-transparent border-top">
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary btn-sm" onclick="window.app.viewResults(${poll.id})">
                                <i class="fas fa-chart-bar me-2"></i>📊 View Results
                            </button>
                            
                            <div class="row g-2">
                                <div class="col-6">
                                    <button class="btn btn-outline-warning btn-sm w-100" onclick="window.app.editPoll(${poll.id})">
                                        <i class="fas fa-edit me-1"></i> Edit
                                    </button>
                                </div>
                                <div class="col-6">
                                    <button class="btn btn-danger btn-sm w-100" 
                                            onclick="window.app.deletePoll(${poll.id})"
                                            style="background-color: #dc3545 !important; border-color: #dc3545 !important; color: white !important; font-weight: 600 !important;">
                                        <i class="fas fa-trash me-1"></i>Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    }

    // =============================================================================
    // REST OF YOUR EXISTING METHODS (unchanged)
    // =============================================================================

    initializeCreateForm() {
        console.log('Initializing create form...');
    }

    async handleCreatePoll(event) {
        event.preventDefault();
        
        if (!this.isAuthenticated()) {
            showAlert('Please log in to create polls', 'warning');
            this.showLoginModal();
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        
        // Get options
        const options = Array.from(document.querySelectorAll('.option-input'))
            .map(input => input.value.trim())
            .filter(value => value);

        if (options.length < 2) {
            showAlert('Please provide at least 2 options', 'warning');
            return;
        }

        const pollData = {
            title: formData.get('title'),
            description: formData.get('description') || '',
            category: formData.get('category') || '',
            options: options
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
            submitBtn.disabled = true;

            const response = await fetch('/api/polls/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(pollData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showAlert('Poll created successfully!', 'success');
                form.reset();
                this.updateOptionCount();
                setTimeout(() => this.navigateToPage('polls'), 1500);
            } else {
                throw new Error(data.error || 'Failed to create poll');
            }
        } catch (error) {
            console.error('Error creating poll:', error);
            showAlert(`Error: ${error.message}`, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    addOption() {
        const container = document.getElementById('options-container');
        if (!container) return;
        
        const optionCount = container.children.length;
        
        if (optionCount >= 10) {
            showAlert('Maximum 10 options allowed', 'warning');
            return;
        }
        
        const letter = String.fromCharCode(65 + optionCount);
        
        const optionHTML = `
            <div class="input-group mb-3">
                <span class="input-group-text fw-bold">${letter}</span>
                <input type="text" class="form-control option-input" placeholder="Enter option" required>
                <button class="btn btn-outline-danger remove-option" type="button">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', optionHTML);
        this.updateOptionCount();
        
        // Focus new input
        const newInput = container.lastElementChild.querySelector('.option-input');
        newInput.focus();
    }

    removeOption(optionGroup) {
        const container = document.getElementById('options-container');
        if (!container) return;
        
        if (container.children.length <= 2) {
            showAlert('Minimum 2 options required', 'warning');
            return;
        }

        optionGroup.remove();
        this.updateOptionLabels();
        this.updateOptionCount();
    }

    updateOptionLabels() {
        const container = document.getElementById('options-container');
        if (!container) return;
        
        const options = container.querySelectorAll('.input-group');
        options.forEach((option, index) => {
            const label = option.querySelector('.input-group-text');
            if (label) {
                label.textContent = String.fromCharCode(65 + index);
            }
        });
    }

    updateOptionCount() {
        const container = document.getElementById('options-container');
        const counter = document.getElementById('option-count');
        
        if (container && counter) {
            const count = container.children.length;
            counter.textContent = `${count} options`;
        }
    }

    async viewPoll(pollId) {
        if (!this.isAuthenticated()) {
            showAlert('Please log in to vote', 'warning');
            this.showLoginModal();
            return;
        }

        try {
            showLoading(true);
            const response = await fetch(`/api/polls/${pollId}/`, {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const poll = await response.json();
                this.showVotingInterface(poll);
            } else {
                throw new Error('Failed to load poll');
            }
        } catch (error) {
            console.error('Error loading poll:', error);
            showAlert('Unable to load poll for voting', 'error');
        } finally {
            showLoading(false);
        }
    }

    async viewResults(pollId) {
        try {
            showLoading(true);
            const response = await fetch(`/api/polls/${pollId}/results/`, {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const results = await response.json();
                this.showResultsModal(results);
            } else {
                throw new Error('Failed to load results');
            }
        } catch (error) {
            console.error('Error loading results:', error);
            showAlert('Unable to load poll results', 'error');
        } finally {
            showLoading(false);
        }
    }

    async editPoll(pollId) {
        if (!this.isAuthenticated()) {
            showAlert('Please log in to edit polls', 'warning');
            return;
        }

        try {
            showLoading(true);
            const response = await fetch(`/api/polls/${pollId}/`, {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const poll = await response.json();
                this.showEditModal(poll);
            } else {
                throw new Error('Failed to load poll for editing');
            }
        } catch (error) {
            console.error('Error loading poll for edit:', error);
            showAlert('Unable to load poll for editing', 'error');
        } finally {
            showLoading(false);
        }
    }

    async deletePoll(pollId) {
        if (!this.isAuthenticated()) {
            showAlert('Please log in to delete polls', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
            return;
        }

        try {
            showLoading(true);
            const response = await fetch(`/api/polls/${pollId}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showAlert('Poll deleted successfully!', 'success');
                // Refresh the current page
                this.loadPageData(this.currentPage);
            } else {
                throw new Error(data.error || 'Failed to delete poll');
            }
        } catch (error) {
            console.error('Error deleting poll:', error);
            showAlert(`Error: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    showVotingInterface(poll) {
        const pollData = poll.poll || poll;
        
        if (!pollData.options || !Array.isArray(pollData.options)) {
            showAlert('Poll options not available', 'error');
            return;
        }

        const modalHTML = `
            <div class="modal fade" id="votingModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-vote-yea me-2"></i>Vote on Poll
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h4 class="fw-bold mb-3">${escapeHtml(pollData.title || 'Untitled Poll')}</h4>
                            ${pollData.description ? `<p class="text-muted mb-4">${escapeHtml(pollData.description)}</p>` : ''}
                            
                            <form id="voting-form">
                                <div class="d-grid gap-3">
                                    ${pollData.options.map((option, index) => `
                                        <div class="voting-option card p-3">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="option" 
                                                       id="option-${index}" value="${option.id || index}" required>
                                                <label class="form-check-label w-100" for="option-${index}">
                                                    <strong>${escapeHtml(option.text || option.title || `Option ${index + 1}`)}</strong>
                                                </label>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div class="d-flex justify-content-end mt-4 gap-2">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-vote-yea me-2"></i>Submit Vote
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('votingModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById('votingModal'));
        modal.show();
        
        document.getElementById('voting-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitVote(pollData.id, e.target);
            modal.hide();
        });
    }

    async submitVote(pollId, form) {
        const formData = new FormData(form);
        const optionId = formData.get('option');
        
        if (!optionId) {
            showAlert('Please select an option', 'warning');
            return;
        }
        
        try {
            showLoading(true);
            const response = await fetch(`/api/polls/${pollId}/vote/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({ option_id: optionId })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showAlert('Vote submitted successfully!', 'success');
                this.loadPageData(this.currentPage);
            } else {
                throw new Error(data.error || 'Failed to submit vote');
            }
        } catch (error) {
            console.error('Error submitting vote:', error);
            showAlert(`Error: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    showResultsModal(results) {
        const resultsData = results.results || results.poll || results;
        const pollData = results.poll || results;
        
        if (!resultsData.options || !Array.isArray(resultsData.options)) {
            showAlert('Poll results not available', 'error');
            return;
        }

        const totalVotes = resultsData.total_votes || pollData.vote_count || 0;
        
        const modalHTML = `
            <div class="modal fade" id="resultsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-chart-bar me-2"></i>Poll Results
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h4 class="fw-bold mb-3">${escapeHtml(pollData.title || resultsData.title || 'Poll Results')}</h4>
                            <p class="text-muted mb-4">Total votes: <strong>${formatNumber(totalVotes)}</strong></p>
                            
                            <div class="results-container">
                                ${resultsData.options.map(option => {
                                    const voteCount = option.vote_count || option.votes || 0;
                                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                    return `
                                        <div class="result-item mb-4">
                                            <div class="d-flex justify-content-between mb-2">
                                                <span class="fw-medium">${escapeHtml(option.text || option.title || 'Option')}</span>
                                                <span class="badge bg-primary">${voteCount} votes (${percentage}%)</span>
                                            </div>
                                            <div class="progress" style="height: 20px;">
                                                <div class="progress-bar bg-gradient" style="width: ${percentage}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('resultsModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById('resultsModal'));
        modal.show();
    }

    showEditModal(poll) {
        const pollData = poll.poll || poll;
        
        const modalHTML = `
            <div class="modal fade" id="editPollModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-edit me-2"></i>Edit Poll
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="edit-poll-form">
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Poll Question</label>
                                    <input type="text" class="form-control" name="title" value="${escapeHtml(pollData.title || '')}" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Description</label>
                                    <textarea class="form-control" name="description" rows="3">${escapeHtml(pollData.description || '')}</textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Options</label>
                                    <div id="edit-options-container">
                                        ${(pollData.options || []).map((option, index) => `
                                            <div class="input-group mb-2">
                                                <span class="input-group-text">${index + 1}</span>
                                                <input type="text" class="form-control" name="options" value="${escapeHtml(option.text || option.title || '')}" required>
                                                <button type="button" class="btn btn-outline-danger remove-edit-option" ${pollData.options.length <= 2 ? 'disabled' : ''}>
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <button type="button" class="btn btn-outline-primary btn-sm mt-2" onclick="window.app.addEditOption()">
                                        <i class="fas fa-plus me-1"></i>Add Option
                                    </button>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Category</label>
                                    <select class="form-select" name="category">
                                        <option value="">Select category</option>
                                        <option value="business" ${pollData.category === 'business' ? 'selected' : ''}>Business</option>
                                        <option value="entertainment" ${pollData.category === 'entertainment' ? 'selected' : ''}>Entertainment</option>
                                        <option value="education" ${pollData.category === 'education' ? 'selected' : ''}>Education</option>
                                        <option value="technology" ${pollData.category === 'technology' ? 'selected' : ''}>Technology</option>
                                        <option value="general" ${pollData.category === 'general' ? 'selected' : ''}>General</option>
                                    </select>
                                </div>
                                
                                <div class="d-flex justify-content-end gap-2">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-warning">
                                        <i class="fas fa-save me-2"></i>Update Poll
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('editPollModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById('editPollModal'));
        modal.show();
        
        document.getElementById('edit-poll-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditPoll(pollData.id, e.target);
            modal.hide();
        });
    }

    addEditOption() {
        const container = document.getElementById('edit-options-container');
        if (!container) return;
        
        if (container.children.length >= 10) {
            showAlert('Maximum 10 options allowed', 'warning');
            return;
        }
        
        const optionHTML = `
            <div class="input-group mb-2">
                <span class="input-group-text">${container.children.length + 1}</span>
                <input type="text" class="form-control" name="options" placeholder="Enter option" required>
                <button type="button" class="btn btn-outline-danger remove-edit-option">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', optionHTML);
    }

    async handleEditPoll(pollId, form) {
        const formData = new FormData(form);
        const options = Array.from(form.querySelectorAll('input[name="options"]'))
            .map(input => input.value.trim())
            .filter(value => value);

        if (options.length < 2) {
            showAlert('Please provide at least 2 options', 'warning');
            return;
        }

        const pollData = {
            title: formData.get('title'),
            description: formData.get('description') || '',
            category: formData.get('category') || '',
            options: options
        };

        try {
            showLoading(true);
            const response = await fetch(`/api/polls/${pollId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(pollData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showAlert('Poll updated successfully!', 'success');
                this.loadPageData(this.currentPage);
            } else {
                throw new Error(data.error || 'Failed to update poll');
            }
        } catch (error) {
            console.error('Error updating poll:', error);
            showAlert(`Error: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }
}

// =============================================================================
// GLOBAL INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Poll App...');
    
    try {
        window.app = new PollApp();
        console.log('✅ Poll App initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Poll App:', error);
        showAlert('Application failed to initialize. Please refresh the page.', 'error');
    }
});

if (typeof window !== 'undefined') {
    window.PollApp = PollApp;
}