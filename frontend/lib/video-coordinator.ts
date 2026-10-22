/**
 * Global coordinator for video playback across website pages.
 * Ensures:
 * 1. Only one video plays at a time when multiple videos are on screen.
 * 2. The video with the LARGER visible screen area plays; others pause.
 * 3. Any video moving out of the visible screen (visibleArea === 0) pauses immediately.
 */

type WebVideoRegistration = {
  id: string;
  element?: HTMLVideoElement;
  visibleArea: number;
  play: () => void;
  pause: () => void;
  isManuallyPaused: () => boolean;
};

class WebVideoCoordinator {
  private registry = new Map<string, WebVideoRegistration>();

  register(reg: WebVideoRegistration) {
    this.registry.set(reg.id, reg);
    this.reevaluate();
  }

  unregister(id: string) {
    const item = this.registry.get(id);
    if (item) {
      try {
        item.pause();
      } catch {}
    }
    this.registry.delete(id);
    this.reevaluate();
  }

  updateVisibleArea(id: string, area: number) {
    const item = this.registry.get(id);
    if (!item) return;
    item.visibleArea = Math.max(0, area);
    this.reevaluate();
  }

  private reevaluate() {
    let maxArea = 0;
    let winnerId: string | null = null;

    for (const [id, item] of this.registry) {
      if (item.visibleArea > maxArea) {
        maxArea = item.visibleArea;
        winnerId = id;
      }
    }

    for (const [id, item] of this.registry) {
      if (id === winnerId && maxArea > 0) {
        if (!item.isManuallyPaused()) {
          try {
            item.play();
          } catch {}
        }
      } else {
        try {
          item.pause();
        } catch {}
      }
    }
  }
}

export const webVideoCoordinator = new WebVideoCoordinator();
