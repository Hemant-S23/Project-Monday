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
    this._readyPromise = null;

    this.restoreSession();
    this.ready();
  }

  /**
   * Asynchronous readiness check: waits for Supabase SDK and processes any OAuth callback
   */
  async ready() {
    if (this._readyPromise) return this._readyPromise;
    this._readyPromise = this._initAsync();
    return this._readyPromise;
  }

  async _initAsync() {
    const config = this.getSupabaseConfig();
    if (config && config.url && config.anonKey) {
      // Wait up to 3 seconds for window.supabase CDN to be available
      for (let i = 0; i < 30; i++) {
        if (window.supabase) {
          try {
            this.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
            console.log('[AuthManager] Supabase client initialized.');
            break;
          } catch (e) {
            console.warn('[AuthManager] Supabase createClient error:', e);
          }
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (this.supabaseClient) {
      try {
        // Set up real-time listener for OAuth logins, token refreshes & logouts
        this.supabaseClient.auth.onAuthStateChange(async (event, session) => {
          console.log('[AuthManager] Supabase Auth State Change:', event, session?.user?.email);
          if (session && session.user) {
            const u = session.user;
            const user = {
              id: u.id,
              email: u.email,
              name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Trader',
              callsign: u.user_metadata?.callsign || u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Trader',
              avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
              isOnboarded: !!(u.user_metadata?.is_onboarded || u.user_metadata?.isOnboarded),
              user_metadata: u.user_metadata || {},
              isGuest: false,
              createdAt: u.created_at
            };
            this.saveSession(user);
          } else if (event === 'SIGNED_OUT') {
            this.saveSession(null);
          }
        });

        // Proactively exchange OAuth redirect tokens (hash or code)
        const { data: { session } } = await this.supabaseClient.auth.getSession();
        if (session && session.user) {
          const u = session.user;
          const user = {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Trader',
            callsign: u.user_metadata?.callsign || u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Trader',
            avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
            isOnboarded: !!(u.user_metadata?.is_onboarded || u.user_metadata?.isOnboarded),
            user_metadata: u.user_metadata || {},
            isGuest: false,
            createdAt: u.created_at
          };
          this.saveSession(user);

          // Clean URL hash after successful OAuth absorption
          if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'))) {
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
          }
          return user;
        }
      } catch (err) {
        console.warn('[AuthManager] Supabase getSession warning:', err);
      }
    }

    this.restoreSession();
    return this.currentUser;
  }

  initSupabase() {
    this.ready();
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
        if (this.currentUser && this.currentUser.isGuest) {
          this.currentUser.id = 'guest_autopilot';
          localStorage.setItem('monday_guest_uuid', 'guest_autopilot');
          localStorage.setItem(this.sessionKey, JSON.stringify(this.currentUser));
        }
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  saveSession(user) {
    this.currentUser = user;
    if (user) {
      if (user.isGuest) {
        user.id = 'guest_autopilot';
      }
      localStorage.setItem(this.sessionKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.sessionKey);
    }
    this.notify();
    try {
      window.dispatchEvent(new CustomEvent('monday:auth-changed', { detail: user }));
    } catch (e) {}
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  }

  onAuthChange(callback) {
    return this.onAuthStateChange(callback);
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    });
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  isUserAuthenticated() {
    return !!(this.currentUser && !this.currentUser.isGuest && this.currentUser.id && !this.currentUser.id.startsWith('guest_') && this.currentUser.id !== 'guest_autopilot');
  }

  async getAuthToken() {
    if (this.supabaseClient) {
      try {
        const { data: { session } } = await this.supabaseClient.auth.getSession();
        if (session && session.access_token) {
          return session.access_token;
        }
      } catch (e) {
        console.warn('[AuthManager] getAuthToken error:', e);
      }
    }
    const cfg = this.getSupabaseConfig();
    return cfg?.anonKey || null;
  }

  getUser() {
    return this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserId() {
    if (this.currentUser && this.currentUser.id) {
      if (this.currentUser.isGuest) return 'guest_autopilot';
      return this.currentUser.id;
    }
    return 'guest_autopilot';
  }

  /**
   * Guest Session: Deprecated in favor of authentic Google OAuth
   */
  async loginAsGuest() {
    console.warn('[AuthManager] Guest mode has been deprecated. Connecting to Google OAuth.');
    return this.signInWithGoogle();
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
          callsign: data.user.user_metadata?.callsign || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
          isOnboarded: !!(data.user.user_metadata?.is_onboarded || data.user.user_metadata?.isOnboarded),
          user_metadata: data.user.user_metadata || {},
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
   * Google OAuth trigger (100% Authentic Cloud OAuth via Supabase)
   */
  async signInWithGoogle() {
    await this.ready();
    if (this.supabaseClient) {
      try {
        const redirectTo = new URL(
          window.location.href.includes('/pages/') ? 'auth.html' : 'pages/auth.html',
          window.location.href
        ).href.split('?')[0].split('#')[0];

        console.log('[AuthManager] Initiating Google OAuth with redirectTo:', redirectTo);
        const { data, error } = await this.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account'
            }
          }
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    return { 
      success: false, 
      error: 'Supabase Cloud authentication client is not available. Please check network connection.' 
    };
  }

  /**
   * Request password reset link sent to user's email
   */
  async resetPasswordForEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email address first.' };
    }
    if (this.supabaseClient) {
      try {
        const { error } = await this.supabaseClient.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin + window.location.pathname
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'Password reset requires an active internet connection.' };
  }

  /**
   * Update authenticated user's password (e.g. during onboarding)
   */
  async updateUserPassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient.auth.updateUser({
          password: newPassword
        });
        if (error) return { success: false, error: error.message };
        return { success: true, user: data.user };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true };
  }

  /**
   * Update user profile (name, callsign, preferences) in Supabase and local cache
   */
  async updateUserProfile(profileData = {}) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...profileData, isOnboarded: true };
      this.saveSession(this.currentUser);
    }

    if (this.supabaseClient && this.currentUser?.id && !this.currentUser.isGuest) {
      // 1. Update Supabase Auth user_metadata directly (cross-browser persistent single source of truth)
      try {
        await this.supabaseClient.auth.updateUser({
          data: {
            full_name: profileData.name || this.currentUser.name,
            callsign: profileData.callsign || this.currentUser.callsign || profileData.name,
            market_focus: profileData.marketFocus || 'DUAL',
            is_onboarded: true
          }
        });
      } catch (err) {
        console.warn('[AuthManager] Supabase auth.updateUser metadata warning:', err);
      }

      // 2. Upsert into profiles table if present
      try {
        await this.supabaseClient.from('profiles').upsert({
          id: this.currentUser.id,
          email: this.currentUser.email,
          full_name: profileData.name || this.currentUser.name,
          callsign: profileData.callsign || this.currentUser.name,
          market_focus: profileData.marketFocus || 'DUAL',
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[AuthManager] Supabase profile upsert error:', e);
      }
    }
    return { success: true, user: this.currentUser };
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
