import { createClient } from '@supabase/supabase-js';
import { UserProfile, Site, PaymentTransaction, DomainName, UserPlan } from '../types';

// Read from import.meta.env
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Detect if we should use the real Supabase client
export const isRealSupabaseConnected = 
  supabaseUrl.trim() !== '' && 
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('YOUR_') &&
  !supabaseAnonKey.includes('YOUR_');

// Helper to get local data for the fallback simulator
const getLocalData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(`weel_tech_${key}`);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocalData = <T>(key: string, value: T): void => {
  localStorage.setItem(`weel_tech_${key}`, JSON.stringify(value));
};

// Seed initial fallback data if empty
const initFallbackDatabase = () => {
  if (!localStorage.getItem('weel_tech_seeded')) {
    const defaultUserId = 'demo-user-123';
    
    // Seed Profiles
    const mockProfiles: UserProfile[] = [
      {
        id: defaultUserId,
        email: 'demo@weel-tech.fr',
        full_name: 'Jean-Daniel Michel',
        company_name: 'Weel Corp',
        plan: 'pro',
        created_at: new Date().toISOString()
      }
    ];
    setLocalData('profiles', mockProfiles);

    // Seed Sites
    const mockSites: Site[] = [
      {
        id: 'site-1',
        user_id: defaultUserId,
        name: 'Weel Shop',
        domain: 'weel-shop.com',
        status: 'active',
        updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        visitors_24h: 342,
        type: 'e-commerce'
      },
      {
        id: 'site-2',
        user_id: defaultUserId,
        name: 'Portfolio Jean',
        domain: 'jean-michel.me',
        status: 'active',
        updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        visitors_24h: 89,
        type: 'portfolio'
      },
      {
        id: 'site-3',
        user_id: defaultUserId,
        name: 'Weel Blog',
        domain: 'blog.weel-tech.fr',
        status: 'draft',
        updated_at: new Date(Date.now() - 3600000 * 120).toISOString(),
        visitors_24h: 0,
        type: 'blog'
      }
    ];
    setLocalData('sites', mockSites);

    // Seed Transactions
    const mockTransactions: PaymentTransaction[] = [
      {
        id: 'tx-1',
        user_id: defaultUserId,
        amount: 49.00,
        currency: 'EUR',
        customer_name: 'Alice Dupont',
        customer_email: 'alice@dupont.com',
        status: 'succeeded',
        description: 'Abonnement Pro Mensuel',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        method: 'Stripe'
      },
      {
        id: 'tx-2',
        user_id: defaultUserId,
        amount: 129.00,
        currency: 'EUR',
        customer_name: 'Société Bernard',
        customer_email: 'finance@bernard.fr',
        status: 'succeeded',
        description: 'Pack Sites E-commerce',
        created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
        method: 'MonCash'
      },
      {
        id: 'tx-3',
        user_id: defaultUserId,
        amount: 19.99,
        currency: 'EUR',
        customer_name: 'Lucas Martin',
        customer_email: 'lucas.m@gmail.com',
        status: 'pending',
        description: 'Achat Template Premium',
        created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
        method: 'Stripe'
      },
      {
        id: 'tx-4',
        user_id: defaultUserId,
        amount: 250.00,
        currency: 'EUR',
        customer_name: 'Marc Lefebvre',
        customer_email: 'm.lefe@orange.fr',
        status: 'failed',
        description: 'Prestation Accompagnement',
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        method: 'API'
      }
    ];
    setLocalData('payment_transactions', mockTransactions);
    setLocalData('transactions', mockTransactions);

    // Seed API Keys
    const mockApiKeys = [
      {
        id: 'key-1',
        user_id: defaultUserId,
        name: 'Clé Production Principale',
        key: 'vp_live_51O8dfg98734hjasd8972134kjahsd',
        created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
        status: 'active'
      },
      {
        id: 'key-2',
        user_id: defaultUserId,
        name: 'Clé d\'intégration Test',
        key: 'vp_test_98as7d98ah2134lksajdhf98as7df',
        created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
        status: 'revoked'
      }
    ];
    setLocalData('api_keys', mockApiKeys);

    // Seed Domains
    const mockDomains: DomainName[] = [
      {
        id: 'dom-1',
        user_id: defaultUserId,
        domain_name: 'weel-shop.com',
        status: 'active',
        dns_configured: true,
        registered_at: new Date(Date.now() - 3600000 * 24 * 180).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 24 * 185).toISOString(),
        linked_site_id: 'site-1'
      },
      {
        id: 'dom-2',
        user_id: defaultUserId,
        domain_name: 'jean-michel.me',
        status: 'active',
        dns_configured: true,
        registered_at: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 24 * 275).toISOString(),
        linked_site_id: 'site-2'
      },
      {
        id: 'dom-3',
        user_id: defaultUserId,
        domain_name: 'weel-agency.net',
        status: 'pending',
        dns_configured: false,
        registered_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 24 * 365).toISOString()
      }
    ];
    setLocalData('domains', mockDomains);

    localStorage.setItem('weel_tech_seeded', 'true');
  }
};

// Initialize the fallback DB if in mock mode
if (!isRealSupabaseConnected) {
  initFallbackDatabase();
}

// Custom simulated auth & client to make development seamless and crash-free
export const mockSupabase = {
  auth: {
    signUp: async ({ email, password, options }: any) => {
      // Simulate network lag
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const users = getLocalData<any[]>('auth_users', []);
      if (users.find(u => u.email === email)) {
        return { data: { user: null }, error: { message: 'Cet email est déjà enregistré.' } };
      }

      const userId = 'user_' + Math.random().toString(36).substring(2, 11);
      const newUser = { id: userId, email, password };
      users.push(newUser);
      setLocalData('auth_users', users);

      // Create profile automatically
      const profiles = getLocalData<UserProfile[]>('profiles', []);
      const newProfile: UserProfile = {
        id: userId,
        email,
        full_name: options?.data?.full_name || email.split('@')[0],
        company_name: options?.data?.company_name || '',
        plan: 'starter', // Default plan
        created_at: new Date().toISOString()
      };
      profiles.push(newProfile);
      setLocalData('profiles', profiles);

      const session = { access_token: 'mock-token-' + userId, user: newProfile };
      setLocalData('current_session', session);
      
      // Trigger callback if registered
      triggerAuthChange('SIGNED_IN', session);

      return { data: { user: newProfile, session }, error: null };
    },

    signInWithPassword: async ({ email, password }: any) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check default demo account
      if (email === 'demo@weel-tech.fr' && password === 'demo123') {
        const profiles = getLocalData<UserProfile[]>('profiles', []);
        let demoProfile = profiles.find(p => p.email === 'demo@weel-tech.fr');
        if (!demoProfile) {
          demoProfile = {
            id: 'demo-user-123',
            email: 'demo@weel-tech.fr',
            full_name: 'Jean-Daniel Michel',
            company_name: 'Weel Corp',
            plan: 'pro',
            created_at: new Date().toISOString()
          };
          profiles.push(demoProfile);
          setLocalData('profiles', profiles);
        }
        const session = { access_token: 'mock-token-demo', user: demoProfile };
        setLocalData('current_session', session);
        triggerAuthChange('SIGNED_IN', session);
        return { data: { user: demoProfile, session }, error: null };
      }

      const users = getLocalData<any[]>('auth_users', []);
      const user = users.find(u => u.email === email && u.password === password);
      
      if (!user) {
        return { data: { user: null, session: null }, error: { message: 'Identifiants invalides ou compte inexistant.' } };
      }

      const profiles = getLocalData<UserProfile[]>('profiles', []);
      const profile = profiles.find(p => p.id === user.id) || {
        id: user.id,
        email: user.email,
        full_name: user.email.split('@')[0],
        plan: 'starter' as UserPlan,
        created_at: new Date().toISOString()
      };

      const session = { access_token: 'mock-token-' + user.id, user: profile };
      setLocalData('current_session', session);
      triggerAuthChange('SIGNED_IN', session);

      return { data: { user: profile, session }, error: null };
    },

    signOut: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      localStorage.removeItem('weel_tech_current_session');
      triggerAuthChange('SIGNED_OUT', null);
      return { error: null };
    },

    getSession: async () => {
      const session = getLocalData<any>('current_session', null);
      return { data: { session }, error: null };
    },

    getUser: async () => {
      const session = getLocalData<any>('current_session', null);
      return { data: { user: session?.user || null }, error: null };
    },

    onAuthStateChange: (callback: any) => {
      authListeners.push(callback);
      // Immediately call with current session
      const session = getLocalData<any>('current_session', null);
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = authListeners.indexOf(callback);
              if (idx !== -1) authListeners.splice(idx, 1);
            }
          }
        }
      };
    }
  },

  // Fluent query builder for mock DB
  from: (table: string) => {
    // Lazy initialize table fallback for existing environments
    if (table === 'transactions' && !localStorage.getItem('weel_tech_transactions')) {
      const pmTxs = getLocalData<any[]>('payment_transactions', []);
      const txs = pmTxs.length > 0 ? pmTxs.map((t, idx) => ({
        ...t,
        method: t.method || (idx % 3 === 0 ? 'Stripe' : idx % 3 === 1 ? 'MonCash' : 'API')
      })) : [
        {
          id: 'tx-1',
          user_id: 'demo-user-123',
          amount: 49.00,
          currency: 'EUR',
          customer_name: 'Alice Dupont',
          customer_email: 'alice@dupont.com',
          status: 'succeeded',
          description: 'Abonnement Pro Mensuel',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          method: 'Stripe'
        },
        {
          id: 'tx-2',
          user_id: 'demo-user-123',
          amount: 129.00,
          currency: 'EUR',
          customer_name: 'Société Bernard',
          customer_email: 'finance@bernard.fr',
          status: 'succeeded',
          description: 'Pack Sites E-commerce',
          created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
          method: 'MonCash'
        },
        {
          id: 'tx-3',
          user_id: 'demo-user-123',
          amount: 19.99,
          currency: 'EUR',
          customer_name: 'Lucas Martin',
          customer_email: 'lucas.m@gmail.com',
          status: 'pending',
          description: 'Achat Template Premium',
          created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
          method: 'Stripe'
        }
      ];
      setLocalData('transactions', txs);
    }

    if (table === 'api_keys' && !localStorage.getItem('weel_tech_api_keys')) {
      const apiKeys = [
        {
          id: 'key-1',
          user_id: 'demo-user-123',
          name: 'Clé Production Principale',
          key: 'vp_live_51O8dfg98734hjasd8972134kjahsd',
          created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
          status: 'active'
        },
        {
          id: 'key-2',
          user_id: 'demo-user-123',
          name: 'Clé d\'intégration Test',
          key: 'vp_test_98as7d98ah2134lksajdhf98as7df',
          created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
          status: 'revoked'
        }
      ];
      setLocalData('api_keys', apiKeys);
    }

    if (table === 'payment_configs' && !localStorage.getItem('weel_tech_payment_configs')) {
      const paymentConfigs = [
        {
          id: 'cfg-1',
          site_id: 'site-1',
          user_id: 'demo-user-123',
          moncash_phone: '50937123456',
          moncash_client_id: 'client_id_site_1',
          moncash_secret_key: 'secret_key_site_1',
          created_at: new Date().toISOString()
        },
        {
          id: 'cfg-2',
          site_id: 'site-2',
          user_id: 'demo-user-123',
          moncash_phone: '50948765432',
          moncash_client_id: 'client_id_site_2',
          moncash_secret_key: 'secret_key_site_2',
          created_at: new Date().toISOString()
        }
      ];
      setLocalData('payment_configs', paymentConfigs);
    }

    let list = getLocalData<any[]>(table, []);
    
    return {
      select: (columns: string = '*') => {
        return {
          eq: (field: string, value: any) => {
            const filtered = list.filter(item => {
              if (field === 'id' || field === 'user_id') {
                return item[field] === value;
              }
              return item[field] === value;
            });
            return {
              order: (orderField: string, { ascending = true } = {}) => {
                const sorted = [...filtered].sort((a, b) => {
                  const valA = a[orderField];
                  const valB = b[orderField];
                  if (typeof valA === 'string') {
                    return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                  }
                  return ascending ? valA - valB : valB - valA;
                });
                return { data: sorted, error: null };
              },
              data: filtered,
              error: null,
              single: () => {
                return { data: filtered[0] || null, error: filtered[0] ? null : { message: 'Not found' } };
              }
            };
          },
          order: (orderField: string, { ascending = true } = {}) => {
            const sorted = [...list].sort((a, b) => {
              const valA = a[orderField];
              const valB = b[orderField];
              if (typeof valA === 'string') {
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }
              return ascending ? valA - valB : valB - valA;
            });
            return { data: sorted, error: null };
          },
          data: list,
          error: null,
          single: () => {
            return { data: list[0] || null, error: list[0] ? null : { message: 'Not found' } };
          }
        };
      },

      insert: async (records: any | any[]) => {
        await new Promise(resolve => setTimeout(resolve, 400));
        const arr = Array.isArray(records) ? records : [records];
        const updatedArr = arr.map(rec => ({
          id: rec.id || 'id_' + Math.random().toString(36).substring(2, 11),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...rec
        }));

        list.push(...updatedArr);
        setLocalData(table, list);
        return { data: updatedArr, error: null };
      },

      update: (fieldsToUpdate: any) => {
        return {
          eq: async (field: string, value: any) => {
            await new Promise(resolve => setTimeout(resolve, 400));
            let updatedCount = 0;
            list = list.map(item => {
              if (item[field] === value) {
                updatedCount++;
                return { ...item, ...fieldsToUpdate, updated_at: new Date().toISOString() };
              }
              return item;
            });
            setLocalData(table, list);
            return { data: list.filter(item => item[field] === value), error: null, count: updatedCount };
          }
        };
      },

      delete: () => {
        return {
          eq: async (field: string, value: any) => {
            await new Promise(resolve => setTimeout(resolve, 400));
            const initialLen = list.length;
            list = list.filter(item => item[field] !== value);
            setLocalData(table, list);
            return { error: null, count: initialLen - list.length };
          }
        };
      }
    };
  }
};

const authListeners: any[] = [];
const triggerAuthChange = (event: string, session: any) => {
  authListeners.forEach(listener => listener(event, session));
};

// Export active supabase client (real or mock)
export const supabase = isRealSupabaseConnected 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : (mockSupabase as any);
