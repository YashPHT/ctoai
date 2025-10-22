class AuthService {
  constructor() {
    this.API_BASE_URL = 'http://localhost:5000';
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

      if (data.success && data.data.token) {
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

      if (data.success && data.data.token) {
        this.setToken(data.data.token);
        this.setUser(data.data);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  }

  setToken(token) {
    localStorage.setItem('token', token);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  setUser(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return !!this.getToken();
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
          'Authorization': `Bearer ${token}`,
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
}

window.authService = new AuthService();
