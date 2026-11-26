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

export const ASTRA_AUTO_HIDE_MS = 2500;
export const ASTRA_DRAG_DEADZONE_PX = 6;
export const ASTRA_LEFT_OPEN_THRESHOLD_PX = -28;
export const ASTRA_TOP_SAFE_PX = 72;
export const ASTRA_BOTTOM_SAFE_PX = 96;
export const ASTRA_LAUNCHER_HEIGHT_PX = 48;
export const ASTRA_LAUNCHER_WIDTH_PX = 168;
export const ASTRA_PEEK_TRANSLATE_PERCENT = 58;
export const ASTRA_PEEK_COUNTER_SHIFT_PX = Math.round(
  (ASTRA_LAUNCHER_WIDTH_PX * ASTRA_PEEK_TRANSLATE_PERCENT) / 100,
);
export const ASTRA_Y_STORAGE_KEY = 'vistrah.astra_y.v1';

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

export function clampAstraTop(
  rawTop: number,
  viewportHeight: number,
  topSafePx: number = ASTRA_TOP_SAFE_PX,
  bottomSafePx: number = ASTRA_BOTTOM_SAFE_PX,
  launcherHeightPx: number = ASTRA_LAUNCHER_HEIGHT_PX,
): number {
  const minTop = Math.max(0, Math.round(topSafePx));
  const safeViewport = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 800;
  const maxTop = Math.max(minTop, Math.round(safeViewport - bottomSafePx - launcherHeightPx));
  if (!Number.isFinite(rawTop)) return maxTop;
  return Math.min(maxTop, Math.max(minTop, Math.round(rawTop)));
}

export function defaultAstraTop(
  viewportHeight: number,
  topSafePx: number = ASTRA_TOP_SAFE_PX,
  bottomSafePx: number = ASTRA_BOTTOM_SAFE_PX,
  launcherHeightPx: number = ASTRA_LAUNCHER_HEIGHT_PX,
): number {
  return clampAstraTop(
    viewportHeight - bottomSafePx - launcherHeightPx,
    viewportHeight,
    topSafePx,
    bottomSafePx,
    launcherHeightPx,
  );
}

export type AstraStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function readStoredAstraTop(
  storage: AstraStorageLike | null | undefined,
  viewportHeight: number,
  topSafePx: number = ASTRA_TOP_SAFE_PX,
  bottomSafePx: number = ASTRA_BOTTOM_SAFE_PX,
  launcherHeightPx: number = ASTRA_LAUNCHER_HEIGHT_PX,
): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(ASTRA_Y_STORAGE_KEY);
    if (raw == null || raw.trim() === '') return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return clampAstraTop(parsed, viewportHeight, topSafePx, bottomSafePx, launcherHeightPx);
  } catch {
    return null;
  }
}

export function saveStoredAstraTop(
  storage: AstraStorageLike | null | undefined,
  topPx: number,
): void {
  if (!storage || !Number.isFinite(topPx)) return;
  try {
    storage.setItem(ASTRA_Y_STORAGE_KEY, String(Math.round(topPx)));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export type AstraLauncherState = {
  open: boolean;
  isPeek: boolean;
  isHovered: boolean;
  isFocused: boolean;
  isDraggingY: boolean;
  isDraggingX: boolean;
  pullX: number;
  topPx: number;
};

export type AstraLauncherControllerOptions = {
  initialViewportHeight?: number;
  initialTopPx?: number;
  initialPeek?: boolean;
  autoHideMs?: number;
  topSafePx?: number;
  bottomSafePx?: number;
  launcherHeightPx?: number;
  storage?: AstraStorageLike | null;
  onChange?: (state: AstraLauncherState) => void;
};

export function createAstraLauncherController(options: AstraLauncherControllerOptions = {}) {
  const autoHideMs = options.autoHideMs ?? ASTRA_AUTO_HIDE_MS;
  const topSafePx = options.topSafePx ?? ASTRA_TOP_SAFE_PX;
  const bottomSafePx = options.bottomSafePx ?? ASTRA_BOTTOM_SAFE_PX;
  const launcherHeightPx = options.launcherHeightPx ?? ASTRA_LAUNCHER_HEIGHT_PX;
  let viewportHeight = options.initialViewportHeight ?? 800;

  const storedTop = readStoredAstraTop(
    options.storage,
    viewportHeight,
    topSafePx,
    bottomSafePx,
    launcherHeightPx,
  );
  const initialTop =
    options.initialTopPx !== undefined
      ? clampAstraTop(options.initialTopPx, viewportHeight, topSafePx, bottomSafePx, launcherHeightPx)
      : storedTop ?? defaultAstraTop(viewportHeight, topSafePx, bottomSafePx, launcherHeightPx);

  let state: AstraLauncherState = {
    open: false,
    isPeek: Boolean(options.initialPeek),
    isHovered: false,
    isFocused: false,
    isDraggingY: false,
    isDraggingX: false,
    pullX: 0,
    topPx: initialTop,
  };

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let suppressClickUntil = 0;
  let activePointer: {
    pointerId: number;
    startX: number;
    startY: number;
    startTop: number;
    mode: 'y' | 'x' | null;
    openedBySwipe: boolean;
    wokeFromPeek: boolean;
  } | null = null;

  function emit() {
    options.onChange?.({ ...state });
  }

  function clearIdleTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function canScheduleAutoHide(): boolean {
    return (
      !state.open &&
      !state.isHovered &&
      !state.isFocused &&
      !state.isDraggingY &&
      !state.isDraggingX &&
      activePointer === null
    );
  }

  function syncIdleTimer() {
    clearIdleTimer();
    if (!canScheduleAutoHide()) {
      state.isPeek = false;
      return;
    }
    if (state.isPeek) return;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (canScheduleAutoHide()) {
        state = { ...state, isPeek: true };
        emit();
      }
    }, autoHideMs);
  }

  return {
    getState(): AstraLauncherState {
      return { ...state };
    },
    start() {
      syncIdleTimer();
    },
    dispose() {
      clearIdleTimer();
      activePointer = null;
    },
    hydrateFromStorage(nextViewportHeight: number, storage?: AstraStorageLike | null) {
      viewportHeight = nextViewportHeight;
      const targetStorage = storage ?? options.storage;
      const loaded = readStoredAstraTop(
        targetStorage,
        viewportHeight,
        topSafePx,
        bottomSafePx,
        launcherHeightPx,
      );
      const resolved =
        loaded ?? defaultAstraTop(viewportHeight, topSafePx, bottomSafePx, launcherHeightPx);
      state = { ...state, topPx: resolved };
      syncIdleTimer();
      emit();
    },
    resize(nextViewportHeight: number) {
      viewportHeight = nextViewportHeight;
      const clamped = clampAstraTop(
        state.topPx,
        viewportHeight,
        topSafePx,
        bottomSafePx,
        launcherHeightPx,
      );
      if (clamped !== state.topPx) {
        state = { ...state, topPx: clamped };
        emit();
      }
    },
    pointerEnter() {
      state = { ...state, isHovered: true, isPeek: false };
      clearIdleTimer();
      emit();
    },
    pointerLeave() {
      state = { ...state, isHovered: false };
      syncIdleTimer();
      emit();
    },
    focus() {
      state = { ...state, isFocused: true, isPeek: false };
      clearIdleTimer();
      emit();
    },
    blur() {
      state = { ...state, isFocused: false };
      syncIdleTimer();
      emit();
    },
    pointerDown(ev: {
      pointerId: number;
      clientX: number;
      clientY: number;
      viewportHeight?: number;
    }) {
      if (ev.viewportHeight) viewportHeight = ev.viewportHeight;
      suppressClickUntil = 0;
      const wokeFromPeek = state.isPeek && !state.open && !state.isHovered;
      activePointer = {
        pointerId: ev.pointerId,
        startX: ev.clientX,
        startY: ev.clientY,
        startTop: state.topPx,
        mode: null,
        openedBySwipe: false,
        wokeFromPeek,
      };
      state = { ...state, isPeek: false };
      clearIdleTimer();
      emit();
    },
    pointerMove(ev: {
      pointerId: number;
      clientX: number;
      clientY: number;
      viewportHeight?: number;
    }) {
      if (!activePointer || activePointer.pointerId !== ev.pointerId) return;
      if (ev.viewportHeight) viewportHeight = ev.viewportHeight;
      const deltaX = ev.clientX - activePointer.startX;
      const deltaY = ev.clientY - activePointer.startY;

      if (activePointer.mode === null) {
        if (
          Math.abs(deltaY) > ASTRA_DRAG_DEADZONE_PX &&
          Math.abs(deltaY) >= Math.abs(deltaX)
        ) {
          activePointer.mode = 'y';
        } else if (
          deltaX < -ASTRA_DRAG_DEADZONE_PX &&
          Math.abs(deltaX) > Math.abs(deltaY)
        ) {
          activePointer.mode = 'x';
        } else {
          return;
        }
      }

      if (activePointer.mode === 'y') {
        const nextTop = clampAstraTop(
          activePointer.startTop + deltaY,
          viewportHeight,
          topSafePx,
          bottomSafePx,
          launcherHeightPx,
        );
        state = {
          ...state,
          isDraggingY: true,
          isDraggingX: false,
          pullX: 0,
          isPeek: false,
          topPx: nextTop,
        };
        emit();
      } else if (activePointer.mode === 'x') {
        const pullX = Math.min(0, Math.max(-48, Math.round(deltaX)));
        let nextOpen = state.open;
        if (deltaX <= ASTRA_LEFT_OPEN_THRESHOLD_PX && !activePointer.openedBySwipe) {
          activePointer.openedBySwipe = true;
          nextOpen = true;
        }
        state = {
          ...state,
          open: nextOpen,
          isDraggingY: false,
          isDraggingX: true,
          pullX,
          isPeek: false,
        };
        emit();
      }
    },
    pointerUp(
      ev: {
        pointerId: number;
        clientX: number;
        clientY: number;
        viewportHeight?: number;
      },
      storage?: AstraStorageLike | null,
    ) {
      if (!activePointer || activePointer.pointerId !== ev.pointerId) return;
      if (ev.viewportHeight) viewportHeight = ev.viewportHeight;
      const ptr = activePointer;
      activePointer = null;

      const deltaX = ev.clientX - ptr.startX;
      const deltaY = ev.clientY - ptr.startY;

      if (ptr.mode === 'y') {
        const finalTop = clampAstraTop(
          ptr.startTop + deltaY,
          viewportHeight,
          topSafePx,
          bottomSafePx,
          launcherHeightPx,
        );
        saveStoredAstraTop(storage ?? options.storage, finalTop);
        suppressClickUntil = Date.now() + 450;
        state = {
          ...state,
          topPx: finalTop,
          isDraggingY: false,
          isDraggingX: false,
          pullX: 0,
        };
      } else if (ptr.mode === 'x') {
        const shouldOpen = deltaX <= ASTRA_LEFT_OPEN_THRESHOLD_PX || ptr.openedBySwipe;
        suppressClickUntil = Date.now() + 450;
        state = {
          ...state,
          open: shouldOpen ? true : state.open,
          isPeek: false,
          isDraggingY: false,
          isDraggingX: false,
          pullX: 0,
        };
      } else {
        if (ptr.wokeFromPeek) {
          suppressClickUntil = Date.now() + 450;
        }
        state = {
          ...state,
          isPeek: false,
          isDraggingY: false,
          isDraggingX: false,
          pullX: 0,
        };
      }

      syncIdleTimer();
      emit();
    },
    pointerCancel(pointerId?: number) {
      if (activePointer && (pointerId === undefined || activePointer.pointerId === pointerId)) {
        activePointer = null;
      }
      state = {
        ...state,
        isDraggingY: false,
        isDraggingX: false,
        pullX: 0,
      };
      syncIdleTimer();
      emit();
    },
    click(): boolean {
      if (suppressClickUntil > Date.now()) {
        suppressClickUntil = 0;
        return false;
      }
      if (state.isPeek && !state.open) {
        state = {
          ...state,
          isPeek: false,
          pullX: 0,
        };
        syncIdleTimer();
        emit();
        return false;
      }
      const nextOpen = !state.open;
      state = {
        ...state,
        open: nextOpen,
        isPeek: false,
        pullX: 0,
      };
      syncIdleTimer();
      emit();
      return true;
    },
    closeChat() {
      state = {
        ...state,
        open: false,
        isPeek: false,
        isHovered: false,
        isFocused: false,
        isDraggingY: false,
        isDraggingX: false,
        pullX: 0,
      };
      syncIdleTimer();
      emit();
    },
    setOpen(nextOpen: boolean) {
      if (!nextOpen) {
        this.closeChat();
        return;
      }
      state = {
        ...state,
        open: true,
        isPeek: false,
        pullX: 0,
      };
      clearIdleTimer();
      emit();
    },
  };
}

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
  '/products',
  '/vibe-finder',
  '/jobs',
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
