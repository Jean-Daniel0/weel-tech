export type UserPlan = 'starter' | 'pro' | 'business';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  plan: UserPlan;
  created_at: string;
}

export interface Site {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  status: 'active' | 'draft';
  updated_at: string;
  visitors_24h: number;
  type: 'vitrine' | 'e-commerce' | 'portfolio' | 'blog';
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  status: 'succeeded' | 'pending' | 'failed';
  description: string;
  created_at: string;
  method?: string; // payment method (Stripe, MonCash, API, etc.)
  application_fee_amount?: number;
  net_amount?: number;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  created_at: string;
  status: 'active' | 'revoked';
}

export interface DomainName {
  id: string;
  user_id: string;
  domain_name: string;
  status: 'active' | 'pending' | 'expired';
  dns_configured: boolean;
  registered_at: string;
  expires_at: string;
  linked_site_id?: string;
  usage_type?: 'vendza_site' | 'external';
}

export type SidebarView = 'sites' | 'pay' | 'domains' | 'settings' | 'new-site';
