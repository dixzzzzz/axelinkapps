// CSRF Token management with improvements
class CSRFTokenManager {
    private token: string | null = null;
    private refreshPromise: Promise<void> | null = null;

    async getToken(): Promise<string> {
        if (!this.token) {
            await this.refreshToken();
        }
        return this.token!;
    }

    async refreshToken(): Promise<void> {
        // Prevent multiple simultaneous refresh calls
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this._refreshTokenInternal();
        
        try {
            await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }

    private async _refreshTokenInternal(): Promise<void> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const base = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || '/api';
            const response = await fetch(`${base}/csrf-token`, {
                credentials: 'include',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`CSRF token request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Validate token exists and has reasonable format
            if (!data.csrfToken || typeof data.csrfToken !== 'string' || data.csrfToken.length < 10) {
                throw new Error('Invalid CSRF token received from server');
            }

            this.token = data.csrfToken;
            console.debug('🔐 CSRF token refreshed successfully');
            
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
            this.token = null;
            throw error;
        }
    }

    clearToken(): void {
        this.token = null;
        this.refreshPromise = null;
        console.debug('🔐 CSRF token cleared');
    }

    // Get current token without refreshing (for debugging)
    getCurrentToken(): string | null {
        return this.token;
    }
}

export const csrfManager = new CSRFTokenManager();

// Auto-import axios and setup interceptors
import axios from 'axios';

// Request interceptor - Add CSRF token to non-GET requests
axios.interceptors.request.use(async (config) => {
    // Skip CSRF for GET requests and specific endpoints
    if (config.method?.toUpperCase() === 'GET') {
        return config;
    }

    // Skip for health check and other exempt endpoints (match backend exemption list)
    const exemptPaths = [
        '/api/health',
        '/api/debug/session', 
        '/api/whatsapp/status',
        '/api/csrf-token',
        // Admin endpoints that are CSRF-exempt server-side; avoid blocking on token fetch
        '/api/admin/verify',
        '/api/admin/logout',
        '/api/admin/map/data',
        '/api/admin/genieacs/devices',
        '/api/admin/genieacs/edit',
        '/api/admin/genieacs/locations',
        '/api/admin/genieacs/locations/add',
        '/api/admin/genieacs/locations/{deviceId}',
        '/api/admin/infrastructure/odp',
        '/api/admin/infrastructure/odc',
        '/api/admin/infrastructure/odp/:id',
        '/api/admin/infrastructure/odc/:id',
        '/api/admin/settings/data',
        '/api/admin/settings/save',
        '/api/admin/settings/whatsapp-status',
        '/api/admin/settings/whatsapp-refresh',
        '/api/admin/settings/whatsapp-delete',
        // Customer endpoints that are CSRF-exempt server-side; avoid blocking on token fetch
        '/api/customer/login',
        '/api/customer/logout',
        '/api/customer/dashboard',
        '/api/customer/map/data',
        '/api/customer/otp/send',
        '/api/customer/otp/verify',
        '/api/customer/trouble/report',
        '/api/customer/trouble/reports',
        '/api/customer/restart-device',
        '/api/customer/change-ssid-2g',
        '/api/customer/change-ssid-5g',
        '/api/customer/change-password-2g',
        '/api/customer/change-password-5g',
    ];
    if (exemptPaths.some(path => config.url?.includes(path))) {
        return config;
    }

    try {
        const token = await csrfManager.getToken();
        config.headers['x-csrf-token'] = token;
        console.debug('🔐 CSRF token added to request:', config.method?.toUpperCase(), config.url);
    } catch (error) {
        console.warn('Could not get CSRF token for request:', error);
        // Don't fail the request, let backend handle missing token
    }

    return config;
});

// Response interceptor - Handle CSRF errors and retry
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Check for CSRF token errors
        if (error.response?.status === 403 && 
            (error.response?.data?.code === 'EBADCSRFTOKEN' || 
             error.response?.data?.message?.includes('csrf'))) {
            
            // Prevent infinite retry loops
            if (originalRequest._csrfRetried) {
                console.error('CSRF retry failed, giving up');
                return Promise.reject(error);
            }

            console.warn('🔐 CSRF token invalid, refreshing and retrying...');
            
            try {
                // Clear old token and get new one
                csrfManager.clearToken();
                await csrfManager.refreshToken();
                
                // Add new token to original request
                const newToken = await csrfManager.getToken();
                originalRequest.headers['x-csrf-token'] = newToken;
                originalRequest._csrfRetried = true;
                
                console.debug('🔐 Retrying request with new CSRF token');
                return axios.request(originalRequest);
                
            } catch (refreshError) {
                console.error('CSRF token refresh failed:', refreshError);
                return Promise.reject(error);
            }
        }
        
        return Promise.reject(error);
    }
);

// Export for manual token management if needed
export { CSRFTokenManager };