import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ASTRA_AUTO_HIDE_MS,
  ASTRA_DRAG_DEADZONE_PX,
  ASTRA_LAUNCHER_WIDTH_PX,
  ASTRA_LEFT_OPEN_THRESHOLD_PX,
  ASTRA_PEEK_COUNTER_SHIFT_PX,
  ASTRA_PEEK_TRANSLATE_PERCENT,
  ASTRA_Y_STORAGE_KEY,
  clampAstraTop,
  createAstraLauncherController,
} from '../../shared/ask-vistrah.ts';

test('mobile Astra widget wires PanResponder Y-drag clamping, 2.5s auto-hide peek, and right-side Gemini sparkle', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });

  assert.equal(ASTRA_AUTO_HIDE_MS, 2500);
  assert.equal(ASTRA_DRAG_DEADZONE_PX, 6);
  assert.equal(ASTRA_LEFT_OPEN_THRESHOLD_PX, -28);
  assert.equal(ASTRA_PEEK_TRANSLATE_PERCENT, 58);
  assert.equal(
    ASTRA_PEEK_COUNTER_SHIFT_PX,
    Math.round((ASTRA_LAUNCHER_WIDTH_PX * 58) / 100),
  );

  // Mobile safe-area clamping between top header safe zone and bottom tab bar
  assert.equal(clampAstraTop(12, 844, 88, 108, 46), 88);
  assert.equal(clampAstraTop(950, 844, 88, 108, 46), 690);
  assert.equal(clampAstraTop(340, 844, 88, 108, 46), 340);

  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
  };

  const ctrl = createAstraLauncherController({
    initialViewportHeight: 844,
    topSafePx: 88,
    bottomSafePx: 108,
    launcherHeightPx: 46,
    storage,
  });
  ctrl.start();

  // 1. Vertical drag updates & clamps Y and suppresses accidental open on release
  ctrl.pointerDown({ pointerId: 1, clientX: 380, clientY: 690, viewportHeight: 844 });
  ctrl.pointerMove({ pointerId: 1, clientX: 378, clientY: 410, viewportHeight: 844 });
  assert.equal(ctrl.getState().isDraggingY, true);
  assert.equal(ctrl.getState().topPx, 410);
  ctrl.pointerUp({ pointerId: 1, clientX: 378, clientY: 410, viewportHeight: 844 }, storage);
  assert.equal(ctrl.getState().open, false);
  assert.equal(ctrl.click(), false);
  assert.equal(ctrl.getState().open, false);
  assert.equal(storage.getItem(ASTRA_Y_STORAGE_KEY), '410');

  // 2. Auto-hides after 2.5s idle, wakes on focus/hover, opens on <= -28px leftward swipe, restarts timer on close
  t.mock.timers.tick(2500);
  assert.equal(ctrl.getState().isPeek, true);

  ctrl.focus();
  assert.equal(ctrl.getState().isPeek, false);
  ctrl.blur();
  t.mock.timers.tick(2500);
  assert.equal(ctrl.getState().isPeek, true);

  ctrl.pointerDown({ pointerId: 2, clientX: 385, clientY: 420, viewportHeight: 844 });
  ctrl.pointerMove({ pointerId: 2, clientX: 350, clientY: 421, viewportHeight: 844 });
  assert.equal(ctrl.getState().open, true);
  ctrl.pointerUp({ pointerId: 2, clientX: 350, clientY: 421, viewportHeight: 844 }, storage);
  assert.equal(ctrl.getState().open, true);

  ctrl.closeChat();
  assert.equal(ctrl.getState().open, false);
  assert.equal(ctrl.getState().topPx, 410);
  t.mock.timers.tick(2500);
  assert.equal(ctrl.getState().isPeek, true);
  ctrl.dispose();

  // 3. Verify mobile component source wires PanResponder (> 6px), Animated.Value, 58% peek & counter-shifted right-side Gemini logo
  const mobileSrc = readFileSync(
    new URL('../src/components/ask-vistrah-widget.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(mobileSrc.includes('PanResponder.create'));
  assert.ok(
    mobileSrc.includes(
      'Math.abs(gs.dy) > ASTRA_DRAG_DEADZONE_PX || Math.abs(gs.dx) > ASTRA_DRAG_DEADZONE_PX',
    ),
  );
  assert.ok(mobileSrc.includes('new Animated.Value'));
  assert.ok(mobileSrc.includes('ASTRA_PEEK_COUNTER_SHIFT_PX'));
  assert.ok(mobileSrc.includes('-ASTRA_PEEK_COUNTER_SHIFT_PX'));
  assert.ok(mobileSrc.includes('MobileGeminiLogo size={18}'));
  assert.ok(mobileSrc.includes('if (isPeek && !open)'));
  assert.ok(mobileSrc.includes('zIndex: 650'));
});
