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
        currency: 'USD',
        customer_name: 'Alice Dupont',
        customer_email: 'alice@dupont.com',
        status: 'succeeded',
        description: 'Abonnement Pro Mensuel',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        method: 'Stripe',
        is_sandbox: false
      },
      {
        id: 'tx-2',
        user_id: defaultUserId,
        amount: 15000.00,
        currency: 'HTG',
        customer_name: 'Société Bernard',
        customer_email: 'finance@bernard.fr',
        status: 'succeeded',
        description: 'Pack Sites E-commerce',
        created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
        method: 'MonCash',
        is_sandbox: false
      },
      {
        id: 'tx-3',
        user_id: defaultUserId,
        amount: 19.99,
        currency: 'USD',
        customer_name: 'Lucas Martin',
        customer_email: 'lucas.m@gmail.com',
        status: 'pending',
        description: 'Achat Template Premium',
        created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
        method: 'Stripe',
        is_sandbox: false
      },
      {
        id: 'tx-4',
        user_id: defaultUserId,
        amount: 250.00,
        currency: 'USD',
        customer_name: 'Marc Lefebvre',
        customer_email: 'm.lefe@orange.fr',
        status: 'failed',
        description: 'Prestation Accompagnement',
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        method: 'API',
        is_sandbox: false
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
        linked_site_id: 'site-1',
        usage_type: 'vendza_site',
        connection_status: 'active'
      },
      {
        id: 'dom-2',
        user_id: defaultUserId,
        domain_name: 'jean-michel.me',
        status: 'active',
        dns_configured: true,
        registered_at: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 24 * 275).toISOString(),
        linked_site_id: 'site-2',
        usage_type: 'vendza_site',
        connection_status: 'active'
      },
      {
        id: 'dom-3',
        user_id: defaultUserId,
        domain_name: 'weel-tech.app',
        status: 'pending',
        dns_configured: false,
        registered_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 24 * 365).toISOString(),
        usage_type: 'external',
        connection_status: 'propagating'
      }
    ];
    setLocalData('domains', mockDomains);

    // Seed DNS records
    const mockDnsRecords = [
      {
        id: 'dns-rec-1',
        domain_id: 'dom-3',
        type: 'A',
        name: '@',
        value: '185.190.140.10',
        ttl: 14400,
        synced_with_dynadot: true,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'dns-rec-2',
        domain_id: 'dom-3',
        type: 'CNAME',
        name: 'www',
        value: 'dns.weel-tech.fr',
        ttl: 14400,
        synced_with_dynadot: true,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'dns-rec-3',
        domain_id: 'dom-3',
        type: 'MX',
        name: '@',
        value: 'mail.weel-tech.app',
        ttl: 14400,
        priority: 10,
        synced_with_dynadot: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ];
    setLocalData('dns_records', mockDnsRecords);

    // Seed default subscription
    const mockSubscriptions = [
      {
        id: 'sub-demo-123',
        user_id: defaultUserId,
        plan_id: 'starter',
        status: 'active',
        current_period_start: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
        current_period_end: new Date(Date.now() + 3600000 * 24 * 20).toISOString(),
        cancel_at_period_end: false,
        stripe_subscription_id: 'sub_mock_starter123',
        stripe_customer_id: 'cus_mock_123',
        created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
      }
    ];
    setLocalData('subscriptions', mockSubscriptions);

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
          currency: 'USD',
          customer_name: 'Alice Dupont',
          customer_email: 'alice@dupont.com',
          status: 'succeeded',
          description: 'Abonnement Pro Mensuel',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          method: 'Stripe',
          is_sandbox: false
        },
        {
          id: 'tx-2',
          user_id: 'demo-user-123',
          amount: 15000.00,
          currency: 'HTG',
          customer_name: 'Société Bernard',
          customer_email: 'finance@bernard.fr',
          status: 'succeeded',
          description: 'Pack Sites E-commerce',
          created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
          method: 'MonCash',
          is_sandbox: false
        },
        {
          id: 'tx-3',
          user_id: 'demo-user-123',
          amount: 19.99,
          currency: 'USD',
          customer_name: 'Lucas Martin',
          customer_email: 'lucas.m@gmail.com',
          status: 'pending',
          description: 'Achat Template Premium',
          created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
          method: 'Stripe',
          is_sandbox: false
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

    if (table === 'dns_records' && !localStorage.getItem('weel_tech_dns_records')) {
      const defaultDnsRecords = [
        {
          id: 'dns-rec-1',
          domain_id: 'dom-3',
          type: 'A',
          name: '@',
          value: '185.190.140.10',
          ttl: 14400,
          synced_with_dynadot: true,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: 'dns-rec-2',
          domain_id: 'dom-3',
          type: 'CNAME',
          name: 'www',
          value: 'dns.weel-tech.fr',
          ttl: 14400,
          synced_with_dynadot: true,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: 'dns-rec-3',
          domain_id: 'dom-3',
          type: 'MX',
          name: '@',
          value: 'mail.weel-tech.app',
          ttl: 14400,
          priority: 10,
          synced_with_dynadot: false,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ];
      setLocalData('dns_records', defaultDnsRecords);
    }

    if (table === 'subscriptions' && !localStorage.getItem('weel_tech_subscriptions')) {
      const defaultSubscriptions = [
        {
          id: 'sub-demo-123',
          user_id: 'demo-user-123',
          plan_id: 'starter',
          status: 'active',
          current_period_start: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
          current_period_end: new Date(Date.now() + 3600000 * 24 * 20).toISOString(),
          cancel_at_period_end: false,
          stripe_subscription_id: 'sub_mock_starter123',
          stripe_customer_id: 'cus_mock_123',
          created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
        }
      ];
      setLocalData('subscriptions', defaultSubscriptions);
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

      insert: (records: any | any[]) => {
        const arr = Array.isArray(records) ? records : [records];
        const updatedArr = arr.map(rec => ({
          id: rec.id || 'id_' + Math.random().toString(36).substring(2, 11),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...rec
        }));

        list.push(...updatedArr);
        setLocalData(table, list);

        const promiseExecutor = async () => {
          await new Promise(resolve => setTimeout(resolve, 300));
          return { data: updatedArr, error: null };
        };

        const result: any = {
          then: (onfulfilled?: any, onrejected?: any) => {
            return promiseExecutor().then(onfulfilled, onrejected);
          },
          select: () => {
            const selectResult: any = {
              then: (onfulfilled?: any, onrejected?: any) => {
                return promiseExecutor().then(onfulfilled, onrejected);
              },
              single: () => {
                const singleExecutor = async () => {
                  await new Promise(resolve => setTimeout(resolve, 300));
                  return { data: updatedArr[0] || null, error: null };
                };
                return {
                  then: (onfulfilled?: any, onrejected?: any) => {
                    return singleExecutor().then(onfulfilled, onrejected);
                  }
                };
              }
            };
            return selectResult;
          }
        };
        return result;
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

// --- Mapping Helpers for real Supabase schema mismatches (sites table) ---
function mapDbSiteToAppSite(dbSite: any): any {
  if (!dbSite) return dbSite;
  const mainDomain = 'weel-tech.app';
  
  // Extract or build domain
  let domain = '';
  if (dbSite.custom_domain) {
    domain = dbSite.custom_domain;
  } else if (dbSite.subdomain) {
    domain = `${dbSite.subdomain}.${mainDomain}`;
  } else if (dbSite.domain) {
    domain = dbSite.domain;
  }

  // Map published status back to active for application compatibility
  let status = dbSite.status;
  if (dbSite.status === 'published') {
    status = 'active';
  }

  // Derive site type from name or subdomain
  let type = 'vitrine';
  const nameLower = String(dbSite.name || '').toLowerCase();
  if (nameLower.includes('shop') || nameLower.includes('boutique') || nameLower.includes('e-commerce') || nameLower.includes('café') || nameLower.includes('cafe')) {
    type = 'e-commerce';
  } else if (nameLower.includes('portfolio') || nameLower.includes('photographe') || nameLower.includes('créateur')) {
    type = 'portfolio';
  } else if (nameLower.includes('blog') || nameLower.includes('actualité')) {
    type = 'blog';
  }

  // Fake visitors dynamically (using a stable seeded random or ID-based count)
  let visitors_24h = 0;
  if (dbSite.id) {
    let hash = 0;
    for (let i = 0; i < dbSite.id.length; i++) {
      hash = dbSite.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    visitors_24h = Math.abs(hash % 300) + 12;
  } else {
    visitors_24h = Math.floor(Math.random() * 150) + 10;
  }

  return {
    ...dbSite,
    domain,
    type,
    status,
    visitors_24h,
  };
}

function mapAppSiteToDbSite(appSite: any): any {
  if (!appSite) return appSite;
  const dbSite = { ...appSite };

  // Map active status to published for DB compatibility
  if (dbSite.status === 'active') {
    dbSite.status = 'published';
  } else if (dbSite.status === 'draft') {
    dbSite.status = 'draft';
  }

  // Ensure original_prompt is present and not null for database constraints
  dbSite.original_prompt = dbSite.original_prompt || dbSite.name || 'Génération initiale';

  // If domain is provided, split it into subdomain and custom_domain
  if (dbSite.domain) {
    const domainStr = String(dbSite.domain).trim().toLowerCase();
    const mainDomain = 'weel-tech.app';
    
    if (domainStr.endsWith(`.${mainDomain}`)) {
      dbSite.subdomain = domainStr.replace(`.${mainDomain}`, '');
      dbSite.custom_domain = null;
    } else if (domainStr === mainDomain) {
      dbSite.subdomain = 'www';
      dbSite.custom_domain = null;
    } else {
      dbSite.custom_domain = domainStr;
      dbSite.subdomain = domainStr.split('.')[0] || 'site';
    }
  }

  // Delete fields that do not exist in the DB schema to prevent 400 Bad Request
  delete dbSite.domain;
  delete dbSite.type;
  delete dbSite.visitors_24h;

  return dbSite;
}

// Helper to wrap a promise/thenable to modify its resolved value
function wrapThenable(thenable: any, mapFn: (data: any) => any): any {
  const originalThen = thenable.then;
  thenable.then = function(onfulfilled?: any, onrejected?: any) {
    return originalThen.call(this, (result: any) => {
      if (result && result.data !== undefined) {
        if (Array.isArray(result.data)) {
          result.data = result.data.map(mapFn);
        } else if (result.data) {
          result.data = mapFn(result.data);
        }
      }
      if (onfulfilled) {
        return onfulfilled(result);
      }
      return result;
    }, onrejected);
  };
  return thenable;
}

// Helper to wrap the chain of PostgrestQueryBuilder / PostgrestFilterBuilder
function createSitesQueryProxy(target: any): any {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return function(...args: any[]) {
          if (prop === 'insert' || prop === 'update' || prop === 'upsert') {
            const inputData = args[0];
            if (Array.isArray(inputData)) {
              args[0] = inputData.map(mapAppSiteToDbSite);
            } else if (inputData) {
              args[0] = mapAppSiteToDbSite(inputData);
            }
          }
          
          const result = val.apply(this, args);
          
          if (result && typeof result.then === 'function') {
            return wrapThenable(result, mapDbSiteToAppSite);
          }
          
          if (result && typeof result === 'object') {
            return createSitesQueryProxy(result);
          }
          
          return result;
        };
      }
      return val;
    }
  });
}

function wrapSupabaseClient(client: any): any {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return function(table: string) {
          const builder = target.from(table);
          if (table === 'sites') {
            return createSitesQueryProxy(builder);
          }
          return builder;
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

// Export active supabase client (real or mock)
export const supabase = isRealSupabaseConnected 
  ? wrapSupabaseClient(createClient(supabaseUrl, supabaseAnonKey)) 
  : (mockSupabase as any);
