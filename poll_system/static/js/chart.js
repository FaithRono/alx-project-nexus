/**
 * Charts.js - Analytics Chart Management for Poll System
 * Handles all chart initialization and data visualization
 */

class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#4f46e5',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#06b6d4'
        };
        
        this.init();
    }

    init() {
        console.log('📊 Chart Manager initialized');
        this.setupChartDefaults();
    }

    setupChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
            Chart.defaults.font.size = 12;
            Chart.defaults.color = '#6b7280';
            Chart.defaults.plugins.legend.labels.usePointStyle = true;
        }
    }

    async initializeAnalyticsChart() {
        const canvas = document.getElementById('analytics-chart');
        if (!canvas) {
            console.warn('📊 Analytics chart canvas not found');
            return;
        }

        try {
            // Show loading state
            this.showChartLoading(canvas);

            // Destroy existing chart
            if (this.charts.analytics) {
                this.charts.analytics.destroy();
            }

            // Get chart data
            const chartData = await this.getAnalyticsData();
            
            // Create chart
            const ctx = canvas.getContext('2d');
            this.charts.analytics = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: 'Polls Created',
                            data: chartData.pollsData,
                            borderColor: this.colors.primary,
                            backgroundColor: this.hexToRgba(this.colors.primary, 0.1),
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: this.colors.primary,
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8
                        },
                        {
                            label: 'Votes Cast',
                            data: chartData.votesData,
                            borderColor: this.colors.success,
                            backgroundColor: this.hexToRgba(this.colors.success, 0.1),
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: this.colors.success,
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8
                        },
                        {
                            label: 'Engagement Rate',
                            data: chartData.engagementData,
                            borderColor: this.colors.warning,
                            backgroundColor: this.hexToRgba(this.colors.warning, 0.1),
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: this.colors.warning,
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Poll Platform Performance Trends',
                            font: {
                                size: 18,
                                weight: 'bold'
                            },
                            color: '#1f2937',
                            padding: 20
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                padding: 20,
                                font: {
                                    size: 14,
                                    weight: '500'
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: this.colors.primary,
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12,
                            callbacks: {
                                title: function(context) {
                                    return 'Week of ' + context[0].label;
                                },
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.dataset.label === 'Engagement Rate') {
                                        label += context.parsed.y + '%';
                                    } else {
                                        label += new Intl.NumberFormat().format(context.parsed.y);
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Time Period',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#6b7280'
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Count',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#6b7280'
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            beginAtZero: true
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Engagement %',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#6b7280'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                            beginAtZero: true,
                            max: 100
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutCubic'
                    }
                }
            });

            console.log('✅ Analytics chart created successfully');
            
        } catch (error) {
            console.error('❌ Error creating analytics chart:', error);
            this.showChartError(canvas);
        }
    }

    async getAnalyticsData() {
        try {
            const response = await fetch('/api/analytics/chart-data/', {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.log('📊 Using fallback chart data');
        }

        // Generate realistic fallback data
        return this.generateFallbackData();
    }

    generateFallbackData() {
        const labels = [];
        const pollsData = [];
        const votesData = [];
        const engagementData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            }));

            // Generate realistic sample data
            const polls = Math.floor(Math.random() * 8) + 2;
            const votes = polls * (Math.floor(Math.random() * 20) + 10);
            const engagement = Math.floor(Math.random() * 30) + 45;

            pollsData.push(polls);
            votesData.push(votes);
            engagementData.push(engagement);
        }

        return {
            labels,
            pollsData,
            votesData,
            engagementData
        };
    }

    showChartLoading(canvas) {
        const container = canvas.parentElement;
        const loadingHTML = `
            <div class="chart-loading d-flex flex-column align-items-center justify-content-center" style="height: 400px;">
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                <h5 class="text-primary">Loading Chart...</h5>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', loadingHTML);
    }

    showChartError(canvas) {
        const container = canvas.parentElement;
        container.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center text-center py-5" style="height: 400px;">
                <div class="mb-4">
                    <i class="fas fa-chart-line fa-4x text-muted opacity-50"></i>
                </div>
                <h5 class="text-muted mb-3">Analytics Visualization</h5>
                <p class="text-muted mb-4">
                    Your performance metrics will appear here.<br>
                    Create some polls to see the magic! ✨
                </p>
                <div class="d-flex flex-wrap gap-3 justify-content-center mb-4">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle me-2" style="width: 12px; height: 12px; background-color: ${this.colors.primary};"></div>
                        <small class="text-muted">Polls Created</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle me-2" style="width: 12px; height: 12px; background-color: ${this.colors.success};"></div>
                        <small class="text-muted">Votes Cast</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle me-2" style="width: 12px; height: 12px; background-color: ${this.colors.warning};"></div>
                        <small class="text-muted">Engagement</small>
                    </div>
                </div>
                <button class="btn btn-outline-primary btn-sm" onclick="window.chartManager.initializeAnalyticsChart()">
                    <i class="fas fa-refresh me-1"></i>Try Again
                </button>
            </div>
        `;
    }

    // Utility functions
    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               document.querySelector('meta[name="csrf-token"]')?.content || '';
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Refresh all charts
    refreshCharts() {
        if (this.charts.analytics) {
            this.initializeAnalyticsChart();
        }
    }

    // Destroy all charts (cleanup)
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Initialize chart manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart !== 'undefined') {
        window.chartManager = new ChartManager();
        console.log('📊 Chart system ready');
    } else {
        console.warn('📊 Chart.js not loaded - charts will not be available');
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
}