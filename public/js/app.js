// COA Events - Client-side JavaScript

// API utility functions
class APIClient {
    static async get(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API GET error:', error);
            throw error;
        }
    }

    static async post(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    }
}

// Notification system
class NotificationManager {
    static show(message, type = 'info', duration = 5000) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        
        const icon = this.getIconForType(type);
        alertDiv.innerHTML = `
            <i class="bi bi-${icon} me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);
    }
    
    static getIconForType(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Loading state management
class LoadingManager {
    static show(element, text = 'Loading...') {
        const spinner = document.createElement('div');
        spinner.className = 'text-center py-4 loading-overlay';
        spinner.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 mb-0">${text}</p>
        `;
        
        element.innerHTML = '';
        element.appendChild(spinner);
    }
    
    static hide(element, content) {
        element.innerHTML = content;
    }
}

// MCP Data Management
class MCPManager {
    static async loadData() {
        try {
            const data = await APIClient.get('/api/mcp-data');
            return data;
        } catch (error) {
            console.error('Failed to load MCP data:', error);
            throw error;
        }
    }
    
    static async refreshData() {
        try {
            const data = await this.loadData();
            NotificationManager.show('MCP data refreshed successfully!', 'success');
            return data;
        } catch (error) {
            NotificationManager.show('Failed to refresh MCP data', 'danger');
            throw error;
        }
    }
}

// User Management
class UserManager {
    static async getCurrentUser() {
        try {
            const user = await APIClient.get('/api/user');
            return user;
        } catch (error) {
            console.error('Failed to get current user:', error);
            throw error;
        }
    }
    
    static async refreshUserData() {
        try {
            const user = await this.getCurrentUser();
            NotificationManager.show('User data refreshed successfully!', 'success');
            return user;
        } catch (error) {
            NotificationManager.show('Failed to refresh user data', 'danger');
            throw error;
        }
    }
}

// Dashboard utilities
class DashboardManager {
    static initializeCounters() {
        // Animate number counters
        const counters = document.querySelectorAll('[data-counter]');
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-counter'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60 FPS
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 16);
        });
    }
    
    static async loadMCPWidget(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        LoadingManager.show(container, 'Loading MCP data...');
        
        try {
            const data = await MCPManager.loadData();
            const content = `
                <div class="alert alert-success">
                    <h6><i class="bi bi-check-circle me-2"></i>MCP Data Loaded Successfully</h6>
                    <p class="mb-2"><strong>Message:</strong> ${data.message}</p>
                    <p class="mb-2"><strong>User:</strong> ${data.user}</p>
                    <p class="mb-0"><strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                </div>
                <button class="btn btn-primary" onclick="DashboardManager.refreshMCPWidget('${containerId}')">
                    <i class="bi bi-arrow-clockwise me-2"></i>
                    Refresh
                </button>
            `;
            LoadingManager.hide(container, content);
        } catch (error) {
            const errorContent = `
                <div class="alert alert-danger">
                    <h6><i class="bi bi-exclamation-triangle me-2"></i>Error Loading MCP Data</h6>
                    <p class="mb-2">${error.message}</p>
                </div>
                <button class="btn btn-primary" onclick="DashboardManager.loadMCPWidget('${containerId}')">
                    <i class="bi bi-arrow-clockwise me-2"></i>
                    Try Again
                </button>
            `;
            LoadingManager.hide(container, errorContent);
        }
    }
    
    static async refreshMCPWidget(containerId) {
        await this.loadMCPWidget(containerId);
    }
}

// Form utilities
class FormUtils {
    static serialize(form) {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }
    
    static validate(form) {
        const inputs = form.querySelectorAll('[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
            } else {
                input.classList.remove('is-invalid');
            }
        });
        
        return isValid;
    }
}

// Theme management
class ThemeManager {
    static setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('coa-events-theme', theme);
    }
    
    static getTheme() {
        return localStorage.getItem('coa-events-theme') || 'dark';
    }
    
    static initializeTheme() {
        const savedTheme = this.getTheme();
        this.setTheme(savedTheme);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    ThemeManager.initializeTheme();
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Add fade-in animation to main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.classList.add('fade-in');
    }
    
    // Initialize dashboard if on dashboard page
    if (window.location.pathname === '/dashboard') {
        DashboardManager.initializeCounters();
    }
});

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    NotificationManager.show('An unexpected error occurred', 'danger');
});

// Make classes globally available
window.APIClient = APIClient;
window.NotificationManager = NotificationManager;
window.LoadingManager = LoadingManager;
window.MCPManager = MCPManager;
window.UserManager = UserManager;
window.DashboardManager = DashboardManager;
window.FormUtils = FormUtils;
window.ThemeManager = ThemeManager;
