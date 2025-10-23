class AuthService {
  constructor() {
    this.API_BASE_URL = 'http://localhost:5000';
    this.oauthWindow = null;
    this.oauthWindowTimer = null;
    this.pendingOAuth = null;
    this.tokenRefreshTimer = null;

    this.handleOAuthMessage = this.handleOAuthMessage.bind(this);
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleOAuthMessage, false);
      this.scheduleTokenRefresh(this.getToken());
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.success && data.data?.token) {
        this.setToken(data.data.token);
        this.setUser(data.data);
      }

      return data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success && data.data?.token) {
        this.setToken(data.data.token);
        this.setUser(data.data);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async refreshToken() {
    const token = this.getToken();

    if (!token) {
      throw new Error('No token available to refresh');
    }

    const response = await fetch(`${this.API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to refresh token');
    }

    if (data.success && data.data?.token) {
      this.setToken(data.data.token);
      if (data.data.user) {
        this.setUser(data.data.user);
      } else {
        await this.getCurrentUser().catch(() => {});
      }
    }

    return data;
  }

  startOAuth(provider, options = {}) {
    const mergedOptions = {
      redirectOnSuccess: true,
      redirectTo: '/index.html',
      provider,
      ...options
    };

    const authUrl = `${this.API_BASE_URL}/api/auth/${provider}`;
    const shouldRedirect = this.shouldUseRedirect(mergedOptions);

    if (shouldRedirect) {
      window.location.assign(authUrl);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.pendingOAuth = { resolve, reject, options: mergedOptions };

      const width = mergedOptions.width || 500;
      const height = mergedOptions.height || 640;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const features = [
        `width=${Math.round(width)}`,
        `height=${Math.round(height)}`,
        `left=${Math.round(left)}`,
        `top=${Math.round(top)}`,
        'status=0',
        'toolbar=0',
        'menubar=0',
        'resizable=1',
        'scrollbars=1'
      ].join(',');

      this.oauthWindow = window.open(authUrl, `assessli_oauth_${provider}`, features);

      if (!this.oauthWindow || this.oauthWindow.closed) {
        this.pendingOAuth = null;
        window.location.assign(authUrl);
        reject(new Error('Popup was blocked. Redirecting to complete sign-in.'));
        return;
      }

      this.oauthWindow.focus();

      this.oauthWindowTimer = window.setInterval(() => {
        if (!this.oauthWindow || this.oauthWindow.closed) {
          window.clearInterval(this.oauthWindowTimer);
          this.oauthWindowTimer = null;
          this.oauthWindow = null;

          if (this.pendingOAuth) {
            this.pendingOAuth.reject(new Error('Google sign-in was closed before completion.'));
            this.pendingOAuth = null;
          }
        }
      }, 500);
    });
  }

  shouldUseRedirect(options = {}) {
    if (options.forceRedirect) {
      return true;
    }
    return this.isMobileViewport();
  }

  isMobileViewport() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod|mobile/i.test(userAgent) || window.innerWidth < 768;
  }

  handleOAuthMessage(event) {
    if (!event?.data || typeof event.data !== 'object') {
      return;
    }

    const { type } = event.data;
    if (!type || (type !== 'OAUTH_SUCCESS' && type !== 'OAUTH_ERROR')) {
      return;
    }

    const allowedOrigins = new Set([window.location.origin]);
    try {
      const apiOrigin = new URL(this.API_BASE_URL).origin;
      allowedOrigins.add(apiOrigin);
    } catch (error) {
      // Ignore URL parse issues for API base
    }

    if (!allowedOrigins.has(event.origin)) {
      console.warn('Ignoring OAuth message from unauthorized origin:', event.origin);
      return;
    }

    if (type === 'OAUTH_SUCCESS' && event.data.token) {
      this.handleOAuthSuccess(event.data.token, event.data.metadata || {});
    } else if (type === 'OAUTH_ERROR') {
      this.handleOAuthError(event.data.error || 'OAuth sign-in failed', event.data.metadata || {});
    }
  }

  async handleOAuthSuccess(token, metadata = {}) {
    this.closeOAuthWindow();

    try {
      this.setToken(token);
      await this.getCurrentUser().catch(() => {});
    } finally {
      window.dispatchEvent(new CustomEvent('oauth:success', {
        detail: {
          provider: metadata.provider || 'google',
          metadata
        }
      }));
    }

    if (this.pendingOAuth) {
      const pending = this.pendingOAuth;
      this.pendingOAuth = null;
      pending.resolve({ token, metadata });

      if (pending.options?.redirectOnSuccess ?? true) {
        const redirectTarget = metadata.redirect || pending.options.redirectTo || '/index.html';
        window.location.assign(redirectTarget);
      }
    } else if (metadata.redirect !== false) {
      const redirectTarget = metadata.redirect || '/index.html';
      window.location.assign(redirectTarget);
    }
  }

  handleOAuthError(error, metadata = {}) {
    this.closeOAuthWindow();

    const message = typeof error === 'string' ? error : error?.message || 'Google sign-in failed';

    window.dispatchEvent(new CustomEvent('oauth:error', {
      detail: {
        provider: metadata.provider || 'google',
        error: message,
        metadata
      }
    }));

    if (this.pendingOAuth) {
      const pending = this.pendingOAuth;
      this.pendingOAuth = null;
      pending.reject(new Error(message));

      const failureRedirect = metadata.redirect || pending.options?.redirectOnError;
      if (failureRedirect) {
        window.location.assign(failureRedirect);
      }
    }
  }

  closeOAuthWindow() {
    if (this.oauthWindow && !this.oauthWindow.closed) {
      this.oauthWindow.close();
    }
    if (this.oauthWindowTimer) {
      window.clearInterval(this.oauthWindowTimer);
      this.oauthWindowTimer = null;
    }
    this.oauthWindow = null;
  }

  logout() {
    this.clearTokenRefresh();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('user');
    }
    this.closeOAuthWindow();
    window.location.href = '/login.html';
  }

  setToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      const payload = this.decodeJwt(token);
      if (payload?.exp) {
        localStorage.setItem('tokenExpiresAt', String(payload.exp * 1000));
      } else {
        localStorage.removeItem('tokenExpiresAt');
      }
    }
    this.scheduleTokenRefresh(token);
  }

  getToken() {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('token');
  }

  getTokenExpiry() {
    if (typeof window === 'undefined') {
      return null;
    }
    const expiry = localStorage.getItem('tokenExpiresAt');
    return expiry ? Number(expiry) : null;
  }

  setUser(userData) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }

  getUser() {
    if (typeof window === 'undefined') {
      return null;
    }
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const payload = this.decodeJwt(token);
    if (payload?.exp) {
      const expiresAt = payload.exp * 1000;
      if (Date.now() >= expiresAt) {
        this.logout();
        return false;
      }
    }

    return true;
  }

  async getCurrentUser() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${this.API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
        }
        throw new Error(data.message || 'Failed to get current user');
      }

      if (data.success && data.data) {
        this.setUser(data.data);
      }

      return data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  checkAuth() {
    if (!this.isAuthenticated()) {
      const publicPages = ['/login.html', '/register.html'];
      const currentPath = window.location.pathname;

      if (!publicPages.includes(currentPath) && currentPath !== '/') {
        window.location.href = '/login.html';
      }
    }
  }

  decodeJwt(token) {
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      let payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const padding = payload.length % 4;
      if (padding) {
        payload += '='.repeat(4 - padding);
      }

      const decoded = typeof window !== 'undefined'
        ? JSON.parse(window.atob(payload))
        : JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      return decoded;
    } catch (error) {
      console.error('Failed to decode JWT payload', error);
      return null;
    }
  }

  scheduleTokenRefresh(token = this.getToken()) {
    if (typeof window === 'undefined') {
      return;
    }

    this.clearTokenRefresh();

    if (!token) {
      return;
    }

    const payload = this.decodeJwt(token);
    if (!payload?.exp) {
      return;
    }

    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const refreshLeadTime = 60 * 1000; // refresh one minute before expiry

    if (expiresAt <= now) {
      this.logout();
      return;
    }

    const timeout = expiresAt - now - refreshLeadTime;

    if (timeout <= 0) {
      this.refreshToken().catch((error) => {
        console.error('Token refresh failed:', error);
        this.logout();
      });
      return;
    }

    this.tokenRefreshTimer = window.setTimeout(() => {
      this.refreshToken().catch((error) => {
        console.error('Token refresh failed:', error);
        this.logout();
      });
    }, timeout);
  }

  clearTokenRefresh() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }
}

window.authService = new AuthService();
