import {directMarketplace, type DirectCatalogue} from '../../shared/direct-service-types';
import {serverApi} from './server';

export async function serverDirectMarketplace() {
  const catalogue = await serverApi<DirectCatalogue>('/marketplace/service-types').catch(() => null);
  return directMarketplace(Array.isArray(catalogue?.categories) ? catalogue : null);
}
