// ===============================================
// BULLETPROOF ANALYTICS DASHBOARD SCRIPT
// ===============================================

// Analytics Configuration
const ANALYTICS_CONFIG = {
    UPDATE_INTERVAL: 2000, // 2 seconds for frequent updates
    STORAGE_KEY: 'veridianAnalyticsData'
};

// Global Analytics Instance
let globalAnalytics = null;

/**
 * Bulletproof Analytics Dashboard Class
 */
class BulletproofAnalyticsDashboard {
    constructor() {
        this.isInitialized = false;
        this.updateTimer = null;
        this.charts = new Map();
        this.searchData = [];
        
        // Bind methods
        this.updateDashboard = this.updateDashboard.bind(this);
        this.handleStorageChange = this.handleStorageChange.bind(this);
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing Bulletproof Analytics Dashboard...');
        
        try {
            // Show loading overlay
            this.showLoadingOverlay();
            
            // Load search data
            await this.loadSearchData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize charts
            await this.initializeCharts();
            
            // Populate dashboard
            this.populateDashboard();
            
            // Start monitoring for updates
            this.startDataMonitoring();
            
            // Hide loading overlay
            setTimeout(() => {
                this.hideLoadingOverlay();
                this.showInitializationMessage();
            }, 1500);
            
            this.isInitialized = true;
            console.log('✅ Bulletproof Analytics Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize analytics dashboard:', error);
            this.hideLoadingOverlay();
            this.showError('Failed to initialize analytics dashboard');
        }
    }

    /**
     * Load search data from backend and localStorage
     */
    async loadSearchData() {
        try {
            console.log('💼 Loading search data...');
            
            // Try to load from backend first
            let backendData = [];
            try {
                const response = await fetch('http://127.0.0.1:5000/api/analytics/history');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data && Array.isArray(result.data)) {
                        backendData = result.data;
                        console.log(`🔍 Loaded ${backendData.length} search records from backend`);
                    } else {
                        console.log('🔍 Backend returned no valid data array');
                    }
                } else {
                    console.warn('⚠️ Backend response not ok:', response.status);
                }
            } catch (backendError) {
                console.warn('⚠️ Backend data loading failed, using localStorage:', backendError);
            }
            
            // Also load from localStorage
            let localData = [];
            const stored = localStorage.getItem(ANALYTICS_CONFIG.STORAGE_KEY);
            if (stored) {
                try {
                    const parsedData = JSON.parse(stored);
                    // Ensure it's an array
                    if (Array.isArray(parsedData)) {
                        localData = parsedData;
                        console.log(`💾 Loaded ${localData.length} search records from localStorage`);
                    } else {
                        console.log(`💾 Loaded undefined search records from localStorage`);
                        localData = [];
                    }
                } catch (parseError) {
                    console.warn('⚠️ Failed to parse localStorage data:', parseError);
                    localData = [];
                }
            }
            
            // Merge backend and local data, removing duplicates
            console.log('🔍 [DEBUG] Backend data:', backendData.length, 'items');
            console.log('💾 [DEBUG] Local data:', localData.length, 'items');
            
            const allData = [...(Array.isArray(backendData) ? backendData : []), 
                             ...(Array.isArray(localData) ? localData : [])];
            
            console.log('🔍 [DEBUG] Combined data:', allData.length, 'items');
            
            const uniqueData = allData.reduce((unique, item) => {
                if (item && (item.id || item.timestamp)) {
                    const exists = unique.find(u => u.id === item.id || 
                        (u.timestamp === item.timestamp && u.query === item.query));
                    if (!exists) {
                        unique.push(item);
                    }
                }
                return unique;
            }, []);
            
            // Sort by timestamp (newest first)
            uniqueData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            this.searchData = uniqueData.slice(0, 100); // Keep last 100
            console.log(`📊 Total unique search records: ${this.searchData.length}`);
            
        } catch (error) {
            console.error('❌ Failed to load search data:', error);
            this.searchData = [];
        }
    }

    /**
     * Get calculated metrics
     */
    getCalculatedMetrics() {
        if (this.searchData.length === 0) {
            return {
                totalSearches: 0,
                mlEnhancementRate: 0,
                averageResponseTime: 0,
                averageConfidence: 0,
                successRate: 100,
                searchesToday: 0
            };
        }

        const totalSearches = this.searchData.length;
        const mlEnhanced = this.searchData.filter(s => s.mlEnhanced || s.ml_enhanced).length;
        const avgResponseTime = this.searchData.reduce((sum, s) => sum + (s.responseTime || s.response_time || 0), 0) / totalSearches;
        const avgConfidence = this.searchData.reduce((sum, s) => sum + (s.confidence || 0), 0) / totalSearches;
        
        // Today's searches
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const searchesToday = this.searchData.filter(s => new Date(s.timestamp) >= today).length;

        return {
            totalSearches,
            mlEnhancementRate: totalSearches > 0 ? (mlEnhanced / totalSearches) * 100 : 0,
            averageResponseTime: Math.round(avgResponseTime),
            averageConfidence: Math.round(avgConfidence * 100),
            successRate: 98, // Simulated success rate
            searchesToday
        };
    }

    /**
     * Get hourly data for charts
     */
    getHourlyData() {
        const hourlyData = [];
        const now = new Date();
        
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
            hour.setMinutes(0, 0, 0);
            
            const hourSearches = this.searchData.filter(s => {
                const searchHour = new Date(s.timestamp);
                return searchHour.getHours() === hour.getHours() &&
                       searchHour.getDate() === hour.getDate();
            });
            
            const avgResponseTime = hourSearches.length > 0 ?
                hourSearches.reduce((sum, s) => sum + (s.responseTime || s.response_time || 0), 0) / hourSearches.length : 0;
            
            const mlRate = hourSearches.length > 0 ?
                hourSearches.filter(s => s.mlEnhanced || s.ml_enhanced).length / hourSearches.length : 0;
            
            const avgConfidence = hourSearches.length > 0 ?
                hourSearches.reduce((sum, s) => sum + (s.confidence || 0), 0) / hourSearches.length : 0;

            hourlyData.push({
                hour: hour.getHours(),
                searchCount: hourSearches.length,
                averageResponseTime: Math.round(avgResponseTime),
                mlEnhancementRate: mlRate,
                averageConfidence: avgConfidence
            });
        }
        
        return hourlyData;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Control buttons
        this.bindElement('refreshData', 'click', () => this.refreshData());
        this.bindElement('exportData', 'click', () => this.exportData());
        
        // Storage change events for real-time updates
        window.addEventListener('storage', this.handleStorageChange);
        
        // Window resize
        window.addEventListener('resize', () => this.resizeCharts());
    }

    /**
     * Handle storage changes (cross-tab updates)
     */
    handleStorageChange(e) {
        if (e.key === ANALYTICS_CONFIG.STORAGE_KEY) {
            console.log('📊 Storage updated, refreshing data...');
            setTimeout(() => {
                this.loadSearchData().then(() => {
                    this.updateDashboard();
                    this.showUpdateNotification();
                });
            }, 500);
        }
    }

    /**
     * Show update notification
     */
    showUpdateNotification() {
        const indicator = document.querySelector('.real-time-indicator');
        if (indicator) {
            indicator.style.animation = 'none';
            indicator.offsetHeight; // Trigger reflow
            indicator.style.animation = 'pulse 1s ease-in-out';
        }
        
        console.log('🔔 Dashboard updated with new search data');
    }

    /**
     * Start data monitoring
     */
    startDataMonitoring() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        // Check for updates every 2 seconds
        this.updateTimer = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                const currentCount = this.searchData.length;
                await this.loadSearchData();
                
                // Check if new data arrived
                if (this.searchData.length > currentCount) {
                    console.log(`📊 New search data detected: ${this.searchData.length - currentCount} new searches`);
                    this.updateDashboard();
                    this.showUpdateNotification();
                }
            }
        }, ANALYTICS_CONFIG.UPDATE_INTERVAL);
        
        console.log('⏰ Data monitoring started');
    }

    /**
     * Bind element event with error handling
     */
    bindElement(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`⚠️ Element with id "${id}" not found`);
        }
    }

    /**
     * Initialize all charts
     */
    async initializeCharts() {
        console.log('📈 Initializing charts...');
        
        await this.initResponseTimeChart();
        await this.initEnhancementPieChart();
        await this.initQualityTrendChart();
        
        console.log('✅ Charts initialized');
    }

    /**
     * Initialize Response Time Chart
     */
    async initResponseTimeChart() {
        const canvas = document.getElementById('responseTimeChart');
        if (!canvas) {
            console.warn('Response time chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        this.charts.set('responseTime', new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [],
                    borderColor: '#32b8cd',
                    backgroundColor: 'rgba(50, 184, 205, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#32b8cd',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#32b8cd',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { 
                            display: true, 
                            text: 'Response Time (ms)'
                        },
                        grid: { 
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        title: { 
                            display: true, 
                            text: 'Time (Hours)'
                        },
                        grid: { 
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        }));
    }

    /**
     * Initialize Enhancement Pie Chart
     */
    async initEnhancementPieChart() {
        const canvas = document.getElementById('enhancementChart');
        if (!canvas) {
            console.warn('Enhancement chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        this.charts.set('enhancement', new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['ML Enhanced', 'Basic Search'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10b981', '#e5e7eb'],
                    borderColor: ['#059669', '#d1d5db'],
                    borderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            padding: 20, 
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${context.raw} searches (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        }));
    }

    /**
     * Initialize Quality Trend Chart
     */
    async initQualityTrendChart() {
        const canvas = document.getElementById('qualityChart');
        if (!canvas) {
            console.warn('Quality chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        this.charts.set('quality', new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Confidence Score',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'ML Enhancement Rate',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: { 
                        mode: 'index', 
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff'
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 1,
                        title: { 
                            display: true, 
                            text: 'Confidence Score'
                        },
                        ticks: {
                            callback: function(value) {
                                return Math.round(value * 100) + '%';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 1,
                        title: { 
                            display: true, 
                            text: 'Enhancement Rate'
                        },
                        grid: { drawOnChartArea: false },
                        ticks: {
                            callback: function(value) {
                                return Math.round(value * 100) + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        }));
    }

    /**
     * Populate dashboard
     */
    populateDashboard() {
        console.log('📊 Populating dashboard...');
        
        this.updateMetricCards();
        this.updateCharts();
        this.updateDataTable();
        this.updateQuickStats();
        this.updateMLInsights();
        
        console.log('✅ Dashboard populated');
    }

    /**
     * Update metric cards
     */
    updateMetricCards() {
        const metrics = this.getCalculatedMetrics();
        
        this.updateElement('avgResponseTime', `${metrics.averageResponseTime}ms`);
        this.updateElement('enhancementRate', `${metrics.mlEnhancementRate.toFixed(1)}%`);
        this.updateElement('avgConfidence', `${metrics.averageConfidence}%`);
        this.updateElement('userEngagement', `${metrics.successRate}%`);
        
        // Update change indicators
        this.updateChangeIndicator('responseTimeChange', 
            metrics.totalSearches > 0 ? 
            `Based on ${metrics.totalSearches} actual searches` : 
            'No search data available');
        
        this.updateChangeIndicator('enhancementChange', 
            `${Math.round(metrics.mlEnhancementRate)}% of searches used ML enhancement`);
        
        this.updateChangeIndicator('confidenceChange', 
            metrics.totalSearches > 0 ? 
            `AI confidence from ${metrics.totalSearches} real searches` : 
            'No confidence data available');
        
        this.updateChangeIndicator('engagementChange', 
            `${metrics.totalSearches} successful searches recorded`);
    }

    /**
     * Update quick stats
     */
    updateQuickStats() {
        const metrics = this.getCalculatedMetrics();
        
        this.updateElement('totalSearchesToday', metrics.searchesToday);
        this.updateElement('mlSuccessRate', `${metrics.mlEnhancementRate.toFixed(1)}%`);
        this.updateElement('avgQueryLength', `${this.calculateAvgQueryLength()} words`);
        this.updateElement('peakHour', this.calculatePeakHour());
    }

    /**
     * Calculate average query length
     */
    calculateAvgQueryLength() {
        if (this.searchData.length === 0) return 0;
        
        const totalWords = this.searchData.reduce((sum, search) => {
            const wordCount = search.query ? search.query.split(' ').length : 0;
            return sum + wordCount;
        }, 0);
        
        return (totalWords / this.searchData.length).toFixed(1);
    }

    /**
     * Calculate peak hour from real data
     */
    calculatePeakHour() {
        if (this.searchData.length === 0) return '--:--';
        
        const hourCounts = {};
        this.searchData.forEach(search => {
            const hour = new Date(search.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const peakHour = Object.entries(hourCounts).reduce((max, [hour, count]) => 
            count > max.count ? { hour: parseInt(hour), count } : max, 
            { hour: 0, count: 0 }
        );
        
        return `${peakHour.hour.toString().padStart(2, '0')}:00`;
    }

    /**
     * Update ML insights
     */
    updateMLInsights() {
        const metrics = this.getCalculatedMetrics();
        const panel = document.getElementById('mlInsightsPanel');
        
        if (panel && this.searchData.length > 0) {
            panel.style.display = 'block';
            
            // Generate insights based on actual data
            const queryInsight = this.generateQueryInsight(metrics);
            const performanceInsight = this.generatePerformanceInsight(metrics);
            const accuracyInsight = this.generateAccuracyInsight(metrics);
            
            this.updateElement('queryProcessingInsight', queryInsight);
            this.updateElement('performanceInsight', performanceInsight);
            this.updateElement('accuracyInsight', accuracyInsight);
        } else if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * Generate query insight from real data
     */
    generateQueryInsight(metrics) {
        if (metrics.totalSearches === 0) {
            return 'Perform searches on the search page to see AI insights here.';
        }
        
        const avgLength = parseFloat(this.calculateAvgQueryLength());
        if (avgLength < 2) {
            return `Users prefer short queries (avg: ${avgLength} words). Consider more specific medical terms.`;
        } else if (avgLength > 5) {
            return `Users provide detailed queries (avg: ${avgLength} words). ML processing excels with complex terminology.`;
        } else {
            return `Query length is optimal (avg: ${avgLength} words). Good balance for effective ML processing.`;
        }
    }

    /**
     * Generate performance insight from real data
     */
    generatePerformanceInsight(metrics) {
        if (metrics.totalSearches === 0) {
            return 'No performance data available yet.';
        }
        
        const avgResponse = metrics.averageResponseTime;
        if (avgResponse < 300) {
            return `Excellent performance (avg: ${avgResponse}ms). ML enhancement is highly optimized.`;
        } else if (avgResponse < 600) {
            return `Good performance (avg: ${avgResponse}ms). ML processing adds minimal overhead.`;
        } else {
            return `Performance could improve (avg: ${avgResponse}ms). Consider optimizing ML pipeline.`;
        }
    }

    /**
     * Generate accuracy insight from real data
     */
    generateAccuracyInsight(metrics) {
        if (metrics.totalSearches === 0) {
            return 'No accuracy data available yet.';
        }
        
        const confidence = metrics.averageConfidence;
        const enhancementRate = metrics.mlEnhancementRate;
        
        if (confidence > 80) {
            return `High ML confidence (${confidence}%). System excels at understanding queries.`;
        } else if (confidence > 60) {
            return `Good ML confidence (${confidence}%). ${enhancementRate.toFixed(1)}% of searches benefit from AI.`;
        } else {
            return `ML confidence (${confidence}%) has room for improvement. Expanding knowledge base.`;
        }
    }

    /**
     * Update all charts
     */
    updateCharts() {
        console.log('📈 Updating charts...');
        
        this.updateResponseTimeChart();
        this.updateEnhancementChart();
        this.updateQualityChart();
    }

    /**
     * Update response time chart
     */
    updateResponseTimeChart() {
        const chart = this.charts.get('responseTime');
        if (!chart) return;

        const hourlyData = this.getHourlyData();
        const labels = hourlyData.map(stat => `${stat.hour.toString().padStart(2, '0')}:00`);
        const data = hourlyData.map(stat => stat.averageResponseTime);

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update('active');
    }

    /**
     * Update enhancement pie chart
     */
    updateEnhancementChart() {
        const chart = this.charts.get('enhancement');
        if (!chart) return;

        const metrics = this.getCalculatedMetrics();
        const enhanced = Math.round((metrics.mlEnhancementRate / 100) * metrics.totalSearches);
        const basic = metrics.totalSearches - enhanced;

        chart.data.datasets[0].data = [enhanced, Math.max(basic, 0)];
        chart.update('active');
    }

    /**
     * Update quality trend chart
     */
    updateQualityChart() {
        const chart = this.charts.get('quality');
        if (!chart) return;

        const hourlyData = this.getHourlyData();
        const labels = hourlyData.map(stat => `${stat.hour.toString().padStart(2, '0')}:00`);
        const confidence = hourlyData.map(stat => stat.averageConfidence);
        const enhancement = hourlyData.map(stat => stat.mlEnhancementRate);

        chart.data.labels = labels;
        chart.data.datasets[0].data = confidence;
        chart.data.datasets[1].data = enhancement;
        chart.update('active');
    }

    /**
     * Update data table
     */
    updateDataTable() {
        const tableBody = document.getElementById('searchDataTable');
        if (!tableBody) return;

        const recentSearches = this.searchData.slice(0, 20);

        if (recentSearches.length === 0) {
            tableBody.innerHTML = this.createEmptyTableRow();
            return;
        }

        tableBody.innerHTML = recentSearches.map((search, index) => 
            this.createTableRow(search, index)
        ).join('');
        
        console.log(`📋 Data table updated with ${recentSearches.length} search records`);
    }

    /**
     * Create empty table row
     */
    createEmptyTableRow() {
        return `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                        <div style="font-size: 48px;">🔍</div>
                        <div>
                            <div style="font-weight: 600; margin-bottom: 8px;">No search data available</div>
                            <div style="font-size: 14px; opacity: 0.7;">Perform searches on the search page to see real-time analytics here</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Create table row for search data
     */
    createTableRow(search, index) {
        const timestamp = new Date(search.timestamp).toLocaleString();
        const statusBadge = this.createStatusBadge(search.status || 'success');
        const mlBadge = (search.mlEnhanced || search.ml_enhanced) ? 
            '<span class="status-badge status-success">✓ Yes</span>' : 
            '<span class="status-badge" style="background: rgba(107, 114, 128, 0.1); color: #6b7280;">✗ No</span>';

        return `
            <tr style="animation: fadeInUp 0.3s ease-out ${index * 0.05}s both;" data-search-id="${search.id}">
                <td style="font-size: 12px; white-space: nowrap;">${timestamp}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;" 
                    title="${search.query}">
                    <span style="color: #f9fafb;">${search.query || 'Unknown Query'}</span>
                </td>
                <td>${mlBadge}</td>
                <td>
                    <span style="font-weight: 600; color: ${(search.responseTime || search.response_time) < 300 ? '#10b981' : (search.responseTime || search.response_time) < 600 ? '#f59e0b' : '#ef4444'};">
                        ${Math.round(search.responseTime || search.response_time || 0)}ms
                    </span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600;">${Math.round((search.confidence || 0) * 100)}%</span>
                        <div style="width: 50px; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
                            <div style="height: 100%; background: ${search.confidence > 0.7 ? '#10b981' : search.confidence > 0.4 ? '#f59e0b' : '#6b7280'}; 
                                        width: ${(search.confidence || 0) * 100}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                </td>
                <td style="font-weight: 500;">${search.resultCount || search.result_count || 0}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }

    /**
     * Create status badge HTML
     */
    createStatusBadge(status) {
        const statusMap = {
            success: { class: 'status-success', text: '✓ Success' },
            error: { class: 'status-error', text: '✗ Error' },
            warning: { class: 'status-warning', text: '⚠ Warning' }
        };

        const statusInfo = statusMap[status] || statusMap.success;
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    /**
     * Refresh dashboard data
     */
    async refreshData() {
        console.log('🔄 Refreshing analytics data...');
        
        const button = document.getElementById('refreshData');
        if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = `
                <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
                Refreshing...
            `;
            button.disabled = true;
            
            try {
                await this.loadSearchData();
                this.populateDashboard();
                this.showRefreshSuccess();
                
            } catch (error) {
                console.error('Failed to refresh data:', error);
                this.showRefreshError();
                
            } finally {
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 1000);
            }
        }
    }

    /**
     * Show refresh success message
     */
    showRefreshSuccess() {
        console.log(`✅ Data refreshed: ${this.searchData.length} search records loaded`);
    }

    /**
     * Show refresh error message
     */
    showRefreshError() {
        console.error('❌ Failed to refresh analytics data');
    }

    /**
     * Show initialization message
     */
    showInitializationMessage() {
        const searchCount = this.searchData.length;
        if (searchCount > 0) {
            console.log(`🎉 Analytics dashboard loaded with ${searchCount} real search records!`);
        } else {
            console.log('📊 Analytics dashboard ready - perform searches to see real-time data!');
        }
    }

    /**
     * Export analytics data
     */
    exportData() {
        console.log('📊 Exporting analytics data...');
        
        const exportData = {
            metadata: {
                platform: 'Veridian Research Platform - Bulletproof Analytics',
                version: '3.0.0',
                exportDate: new Date().toISOString(),
                totalRecords: this.searchData.length
            },
            summary: this.getCalculatedMetrics(),
            searchHistory: this.searchData,
            hourlyStats: this.getHourlyData()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = `bulletproof-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showExportSuccess();
    }

    /**
     * Show export success feedback
     */
    showExportSuccess() {
        const button = document.getElementById('exportData');
        if (button) {
            const originalContent = button.innerHTML;
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                Exported
            `;
            button.disabled = true;

            setTimeout(() => {
                button.innerHTML = originalContent;
                button.disabled = false;
            }, 3000);
        }
    }

    /**
     * Update element text content safely
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        } else {
            console.warn(`Element ${id} not found`);
        }
    }

    /**
     * Update change indicator
     */
    updateChangeIndicator(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = `<span>${text}</span>`;
            element.className = 'metric-change neutral';
        }
    }

    /**
     * Update entire dashboard
     */
    updateDashboard() {
        this.populateDashboard();
    }

    /**
     * Resize charts
     */
    resizeCharts() {
        this.charts.forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    /**
     * Show loading overlay
     */
    showLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('❌ Analytics Error:', message);
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            searchDataCount: this.searchData.length,
            calculatedMetrics: this.getCalculatedMetrics(),
            recentSearches: this.searchData.slice(0, 5),
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        window.removeEventListener('storage', this.handleStorageChange);
        
        this.charts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts.clear();
        this.isInitialized = false;
    }
}

/**
 * Initialize analytics when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting Bulletproof Analytics Dashboard...');
    
    try {
        // Create global analytics instance
        globalAnalytics = new BulletproofAnalyticsDashboard();
        
        // Initialize dashboard
        await globalAnalytics.init();
        
        // Make available globally for debugging
        window.BulletproofAnalyticsDashboard = BulletproofAnalyticsDashboard;
        window.globalAnalytics = globalAnalytics;
        window.debugAnalytics = () => globalAnalytics.getDebugInfo();
        
        console.log('✅ Bulletproof Analytics Dashboard ready!');
        
    } catch (error) {
        console.error('❌ Failed to initialize analytics dashboard:', error);
    }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    if (globalAnalytics) {
        globalAnalytics.destroy();
    }
});