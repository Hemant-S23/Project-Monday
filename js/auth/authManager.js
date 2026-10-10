/**
 * Auth & User Session Manager (Supabase + Local Multi-User Fallback)
 * 
 * Provides:
 * 1. Email/Password Sign Up & Sign In
 * 2. Anonymous / Guest Trading Sessions (isolated clean $2,000 account per guest)
 * 3. Google OAuth trigger
 * 4. User data scoping (every user gets their own independent trades, balance, and settings)
 * 5. Plug-and-play Supabase client integration (reads from window.MONDAY_SUPABASE_CONFIG or localStorage)
 */

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.sessionKey = 'monday_active_session_v1';
    this.supabaseClient = null;
    this.listeners = [];

    this.initSupabase();
    this.restoreSession();
  }

  /**
   * Initializes Supabase client if credentials are configured
   */
  initSupabase() {
    const config = this.getSupabaseConfig();
    if (config && config.url && config.anonKey) {
      if (window.supabase) {
        try {
          this.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
          console.log('[AuthManager] Supabase client initialized successfully.');
        } catch (err) {
          console.warn('[AuthManager] Failed to initialize Supabase client:', err);
        }
      } else {
        // Retry if supabase CDN script is still downloading
        const checkInterval = setInterval(() => {
          if (window.supabase) {
            clearInterval(checkInterval);
            try {
              this.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
              console.log('[AuthManager] Supabase client initialized on CDN ready.');
            } catch (err) {}
          }
        }, 150);
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    }
  }

  getSupabaseConfig() {
    // 1. Check window global config (set in config.js or html)
    if (window.MONDAY_SUPABASE_CONFIG && window.MONDAY_SUPABASE_CONFIG.url) {
      return window.MONDAY_SUPABASE_CONFIG;
    }
    // 2. Check localStorage
    const saved = localStorage.getItem('monday_supabase_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  }

  setSupabaseConfig(url, anonKey) {
    if (!url || !anonKey) return false;
    const config = { url: url.trim(), anonKey: anonKey.trim() };
    localStorage.setItem('monday_supabase_config', JSON.stringify(config));
    this.initSupabase();
    return true;
  }

  restoreSession() {
    const raw = localStorage.getItem(this.sessionKey);
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  saveSession(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(this.sessionKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.sessionKey);
    }
    this.notify();
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    });
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  getUser() {
    return this.currentUser;
  }

  getUserId() {
    return this.currentUser ? this.currentUser.id : 'guest_default';
  }

  /**
   * Guest Session: Instant paper trading with a dedicated, isolated clean account
   */
  async loginAsGuest(customName = null) {
    // Generate or retrieve persistent guest ID
    let guestId = localStorage.getItem('monday_guest_uuid');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('monday_guest_uuid', guestId);
    }

    const user = {
      id: guestId,
      email: null,
      name: customName || 'Guest Trader',
      isGuest: true,
      createdAt: new Date().toISOString(),
      avatar: 'ph-user'
    };

    this.saveSession(user);
    return { success: true, user };
  }

  /**
   * Email & Password Sign In
   */
  async signInWithEmail(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    // If Supabase is active, authenticate with Supabase Auth
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
        if (error) return { success: false, error: error.message };

        const user = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          isGuest: false,
          createdAt: data.user.created_at
        };
        this.saveSession(user);
        return { success: true, user };
      } catch (err) {
        return { success: false, error: err.message || 'Supabase authentication failed.' };
      }
    }

    // Local multi-user auth fallback (works 100% out of the box)
    const userRegistry = this.getLocalUsers();
    const existing = userRegistry[cleanEmail];
    if (!existing) {
      return { success: false, error: 'No account found with this email. Please click "Create Account".' };
    }
    if (existing.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const user = {
      id: existing.id,
      email: existing.email,
      name: existing.name || cleanEmail.split('@')[0],
      isGuest: false,
      createdAt: existing.createdAt
    };
    this.saveSession(user);
    return { success: true, user };
  }

  /**
   * Email & Password Sign Up
   */
  async signUpWithEmail(email, password, name = null) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const displayName = (name || '').trim() || cleanEmail.split('@')[0];

    // If Supabase is active, sign up with Supabase Auth
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { full_name: displayName }
          }
        });
        if (error) return { success: false, error: error.message };

        const user = {
          id: data.user?.id || 'usr_' + Date.now(),
          email: cleanEmail,
          name: displayName,
          isGuest: false,
          createdAt: new Date().toISOString()
        };
        this.saveSession(user);
        return { success: true, user };
      } catch (err) {
        return { success: false, error: err.message || 'Supabase signup failed.' };
      }
    }

    // Local multi-user fallback
    const userRegistry = this.getLocalUsers();
    if (userRegistry[cleanEmail]) {
      return { success: false, error: 'An account with this email already exists. Please Sign In.' };
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    userRegistry[cleanEmail] = {
      id: userId,
      email: cleanEmail,
      name: displayName,
      password: password,
      createdAt: new Date().toISOString()
    };
    this.saveLocalUsers(userRegistry);

    const user = {
      id: userId,
      email: cleanEmail,
      name: displayName,
      isGuest: false,
      createdAt: new Date().toISOString()
    };
    this.saveSession(user);
    return { success: true, user };
  }

  /**
   * Google OAuth trigger
   */
  async signInWithGoogle() {
    if (this.supabaseClient) {
      try {
        const { error } = await this.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + window.location.pathname }
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Demo Google OAuth simulation when Supabase keys not set yet
    const demoUser = {
      id: 'google_user_' + Date.now(),
      email: 'trader.google@gmail.com',
      name: 'Google Trader',
      isGuest: false,
      createdAt: new Date().toISOString()
    };
    this.saveSession(demoUser);
    return { success: true, user: demoUser };
  }

  signOut() {
    if (this.supabaseClient) {
      this.supabaseClient.auth.signOut().catch(() => {});
    }
    this.saveSession(null);
  }

  getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem('monday_local_users_db') || '{}');
    } catch (e) {
      return {};
    }
  }

  saveLocalUsers(registry) {
    localStorage.setItem('monday_local_users_db', JSON.stringify(registry));
  }
}
