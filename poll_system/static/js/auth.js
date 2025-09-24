/**
 * Authentication Manager for Poll System
 * Fixed to handle proper form submission and error handling
 */

class AuthManager {
    constructor() {
        this.baseURL = window.location.origin;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(e);
            });
        }

        // Signup form  
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignup(e);
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
    }

    async handleLogin(event) {
        try {
            const submitButton = event.target.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in...';
            submitButton.disabled = true;

            const formData = new FormData(event.target);
            const loginData = {
                username: formData.get('username').trim(),
                password: formData.get('password')
            };

            console.log('Attempting login for:', loginData.username);

            const response = await fetch(`${this.baseURL}/accounts/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                // Use global showAlert function
                if (typeof showAlert !== 'undefined') {
                    showAlert('Login successful! Welcome back.', 'success');
                } else {
                    console.log('Login successful!');
                }
                
                // Close modal and reload page
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (modal) modal.hide();
                
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                throw new Error(data.error || `Server returned ${response.status}`);
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Use global showAlert function with fallback
            if (typeof showAlert !== 'undefined') {
                showAlert(`Login failed: ${error.message}`, 'error');
            } else {
                alert(`Login failed: ${error.message}`);
            }
        } finally {
            // Reset button state
            const submitButton = event.target.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
                submitButton.disabled = false;
            }
        }
    }

    async handleSignup(event) {
        try {
            const submitButton = event.target.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';
            submitButton.disabled = true;

            const formData = new FormData(event.target);
            
            // Validate passwords match
            const password = formData.get('password');
            const confirmPassword = formData.get('confirm_password');
            
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            const signupData = {
                username: formData.get('username').trim(),
                email: formData.get('email').trim(),
                password: password,
                first_name: formData.get('first_name')?.trim() || '',
                last_name: formData.get('last_name')?.trim() || ''
            };

            console.log('Attempting signup for:', signupData.username);

            const response = await fetch(`${this.baseURL}/accounts/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(signupData)
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                // Use global showAlert function
                if (typeof showAlert !== 'undefined') {
                    showAlert('Account created successfully! Please log in.', 'success');
                } else {
                    console.log('Account created successfully!');
                }
                
                // Close signup modal and open login modal
                const signupModal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
                if (signupModal) signupModal.hide();
                
                setTimeout(() => {
                    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                    loginModal.show();
                    // Pre-fill username
                    const usernameInput = document.querySelector('#loginModal input[name="username"]');
                    if (usernameInput) {
                        usernameInput.value = signupData.username;
                    }
                }, 500);
            } else {
                throw new Error(data.error || `Server returned ${response.status}`);
            }
        } catch (error) {
            console.error('Signup error:', error);
            
            // Use global showAlert function with fallback
            if (typeof showAlert !== 'undefined') {
                showAlert(`Registration failed: ${error.message}`, 'error');
            } else {
                alert(`Registration failed: ${error.message}`);
            }
        } finally {
            // Reset button state
            const submitButton = event.target.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
                submitButton.disabled = false;
            }
        }
    }

    async handleLogout() {
        try {
            const response = await fetch(`${this.baseURL}/accounts/logout/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                // Use global showAlert function
                if (typeof showAlert !== 'undefined') {
                    showAlert('Logged out successfully', 'success');
                }
                
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                throw new Error(data.error || 'Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            
            // Use global showAlert function with fallback
            if (typeof showAlert !== 'undefined') {
                showAlert(`Logout failed: ${error.message}`, 'error');
            } else {
                alert(`Logout failed: ${error.message}`);
            }
        }
    }

    getCSRFToken() {
        // Try multiple methods to get CSRF token
        const methods = [
            () => document.querySelector('[name=csrfmiddlewaretoken]')?.value,
            () => document.querySelector('meta[name="csrf-token"]')?.content,
            () => document.querySelector('input[name="csrfmiddlewaretoken"]')?.value,
            () => document.querySelector('[name="csrfmiddlewaretoken"]')?.value
        ];
        
        for (const method of methods) {
            const token = method();
            if (token) {
                console.log('CSRF token found:', token.substring(0, 10) + '...');
                return token;
            }
        }
        
        console.warn('CSRF token not found');
        return '';
    }

    // Helper method to check if user is authenticated
    isAuthenticated() {
        return document.querySelector('meta[name="user-authenticated"]')?.content === 'true';
    }

    // Method to get current user info
    getCurrentUser() {
        const userElement = document.querySelector('meta[name="current-user"]');
        try {
            return userElement ? JSON.parse(userElement.content) : null;
        } catch {
            return null;
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.authManager = new AuthManager();
    console.log('Auth Manager initialized');
});

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}