import { useEffect, useState } from 'react';
import { csrfManager } from '../utils/csrf';

export const CSRFDebug = () => {
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const refreshToken = async () => {
        try {
            console.log('🔐 CSRFDebug: Refreshing token...');
            setIsLoading(true);
            setError(null);
            await csrfManager.refreshToken();
            const newToken = csrfManager.getCurrentToken();
            setToken(newToken);
            console.log('🔐 CSRFDebug: Token refreshed:', newToken ? `${newToken.slice(0, 10)}...` : 'None');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            console.error('🔐 CSRFDebug: Refresh failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const clearToken = () => {
        console.log('🔐 CSRFDebug: Clearing token...');
        csrfManager.clearToken();
        setToken(null);
        setError(null);
        console.log('🔐 CSRFDebug: Token cleared');
    };

    const testTokenEndpoint = async () => {
        try {
            console.log('🔐 CSRFDebug: Testing token endpoint...');
            setIsLoading(true);
            const response = await fetch('/api/csrf-token', { credentials: 'include' });
            const data = await response.json();
            console.log('🔐 CSRFDebug: Token endpoint response:', data);
            if (data.csrfToken) {
                setToken(data.csrfToken);
                setError(null);
            } else {
                setError('No token in response');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            console.error('🔐 CSRFDebug: Token endpoint test failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const currentToken = csrfManager.getCurrentToken();
        setToken(currentToken);
        console.log('🔐 CSRFDebug: Initial token:', currentToken ? `${currentToken.slice(0, 10)}...` : 'None');
    }, []);

    // Show in development AND when explicitly enabled
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development' || process.env.NODE_ENV !== 'production';
    const isEnabled = isDev || window.location.search.includes('debug=csrf');
    
    if (!isEnabled) {
        return null;
    }

    return (
        <div 
            className="fixed bottom-4 right-4 p-3 bg-gray-900 border border-gray-600 text-white text-xs rounded-lg max-w-sm shadow-lg"
            style={{ 
                zIndex: 9999, 
                pointerEvents: 'auto',
                fontFamily: 'monospace'
            }}
        >
            <div className="font-bold text-yellow-400 mb-2">🔐 CSRF Debug</div>
            <div className="mb-1">
                <span className="text-gray-400">Token:</span>{' '}
                <span className={token ? 'text-green-400' : 'text-red-400'}>
                    {token ? `${token.slice(0, 10)}...` : 'None'}
                </span>
            </div>
            <div className="mb-1 text-gray-400">
                Environment: {import.meta.env.MODE || 'unknown'}
            </div>
            {error && (
                <div className="text-red-400 mb-2 text-xs break-words">
                    ❌ {error}
                </div>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
                <button 
                    onClick={refreshToken}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                >
                    {isLoading ? '...' : 'Refresh'}
                </button>
                <button 
                    onClick={clearToken}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                >
                    Clear
                </button>
                <button 
                    onClick={testTokenEndpoint}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                >
                    Test API
                </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
                💡 Check console for logs
            </div>
        </div>
    );
};
