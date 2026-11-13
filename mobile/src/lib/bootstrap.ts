import {api} from './api.ts';
import {primeResource} from './resource-cache.ts';
import type {Category, User, Membership} from './catalogue.ts';
import type {SessionScope} from '../../../shared/session-scope.ts';

export type HomepageSection = {
  id: string;
  template: 'banner' | 'service_grid' | 'service_carousel';
  title: string;
  subtitle: string;
  size: 'wide' | 'square' | 'compact';
  service_ids: number[];
};

export type Homepage = {
  version: number | null;
  layout: {schema_version: 1; sections: HomepageSection[]};
};

export type BootstrapPayload = {
  catalogue: Category[];
  homepage: Homepage;
  user: User | null;
  membership: Membership | null;
  location: {lat?: number; lng?: number; label?: string} | null;
  business: Record<string, unknown> | null;
};

let bootstrapPromise: Promise<BootstrapPayload | null> | null = null;

export async function fetchBootstrap(scope: SessionScope = 'customer'): Promise<BootstrapPayload | null> {
  try {
    const data = await api<BootstrapPayload>('/bootstrap', {}, {scope});
    if (data.catalogue) {
      primeResource<Category[]>('/catalogue', data.catalogue);
    }
    if (data.homepage) {
      primeResource<Homepage>('/homepage', data.homepage);
    }
    if (data.membership && data.user) {
      primeResource<Membership>('/me/membership', data.membership, data.user.id);
    }
    return data;
  } catch {
    // Fail soft: individual fallback hooks will continue to query their paths if needed
    return null;
  }
}

export function initializeBootstrap(scope: SessionScope = 'customer'): Promise<BootstrapPayload | null> {
  if (!bootstrapPromise) {
    bootstrapPromise = fetchBootstrap(scope);
  }
  return bootstrapPromise;
}

