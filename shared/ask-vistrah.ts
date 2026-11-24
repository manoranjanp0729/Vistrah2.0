export type AskVistrahAction = {
  label: string;
  href: string;
};

export type AskVistrahHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

export type AskVistrahMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedActions?: AskVistrahAction[];
  isError?: boolean;
};

export type AskVistrahRequest = {
  message: string;
  history?: AskVistrahHistoryItem[];
};

export type AskVistrahResponse = {
  reply: string;
  suggestedActions: AskVistrahAction[];
};

export const ASTRA_AGENT_NAME = 'Astra';
export const GEMINI_BRAND_LABEL = 'Powered by Google Gemini';

export const ASTRA_STARTERS: readonly string[] = [
  'How do I list my business?',
  'Explore the 10 categories',
  'Find nearby services',
] as const;

export const ASK_VISTRAH_STARTERS = ASTRA_STARTERS;

export const GEMINI_SPARK_VIEWBOX = '0 0 24 24';
export const GEMINI_SPARK_PATH =
  'M12 1C12 7.075 16.925 12 23 12C16.925 12 12 16.925 12 23C12 16.925 7.075 12 1 12C7.075 12 12 7.075 12 1Z';

export const ASTRA_WELCOME: AskVistrahMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Namaskara! I am Astra, VISTRAH's AI assistant powered by Google Gemini. Ask me to find verified local businesses near you, explore our 10 service categories, or list your business for free.",
  suggestedActions: [
    { label: 'Browse Services', href: '/services' },
    { label: 'List Your Business', href: '/seller/onboard' },
  ],
};

export const ASK_VISTRAH_WELCOME = ASTRA_WELCOME;

const SAFE_PATH_PREFIXES: readonly string[] = [
  '/services',
  '/seller/onboard',
  '/seller',
  '/v-ads',
  '/location',
  '/membership',
  '/marketing-pricing',
  '/marketing-solutions',
  '/commerce',
  '/jobs',
  '/agri-connect',
  '/health-connect',
  '/contact',
  '/about',
  '/pricing',
];

export function sanitizeChatActionHref(rawHref?: string | null): string | null {
  if (!rawHref || typeof rawHref !== 'string') return null;
  const trimmed = rawHref.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return null;
  }
  const [pathname] = trimmed.split(/[?#]/, 1);
  const allowed = SAFE_PATH_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
  if (!allowed) return null;
  return trimmed.slice(0, 240);
}

export function normalizeSuggestedActions(
  raw?: ReadonlyArray<{ label?: string | null; href?: string | null }> | null,
): AskVistrahAction[] {
  if (!Array.isArray(raw)) return [];
  const out: AskVistrahAction[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const label = typeof item.label === 'string' ? item.label.trim().slice(0, 48) : '';
    const href = sanitizeChatActionHref(item.href);
    if (!label || !href || seen.has(href)) continue;
    seen.add(href);
    out.push({ label, href });
    if (out.length >= 4) break;
  }
  return out;
}
