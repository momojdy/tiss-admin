import {useEffect, useState} from 'react';
import {
  PREVIEW_SCENARIOS, autoplayDelayMs, nextAutoplayIndex, resolvePreviewView, stepPreviewIndex,
  type PreviewScenario, type PreviewView,
} from './konsolissPreviewScenarios';

/**
 * UI state for the temporary DEMO / PREVIEW selector. Holds only an index, a view id and counters:
 * no fixture data is stored, fetched or written anywhere. Exiting restores the live hooks untouched
 * because the live hooks keep running underneath and are never mutated.
 */
export function useKonsolissPreviewController(initialIndex?:number) {
  const [index, setIndex] = useState<number | null>(initialIndex!==undefined&&Number.isInteger(initialIndex)&&initialIndex>=0&&initialIndex<PREVIEW_SCENARIOS.length?initialIndex:null);
  const [autoplay, setAutoplay] = useState(false);
  const [replay, setReplay] = useState(0);
  const [viewId, setViewId] = useState<string | null>(null);

  useEffect(() => {
    if (!autoplay || index === null) return;
    const next = nextAutoplayIndex(index);
    const timer = setTimeout(() => {
      if (next === null) { setAutoplay(false); return; } // stay on the last state
      setIndex(next); setViewId(null);
    }, autoplayDelayMs(index));
    return () => clearTimeout(timer);
  }, [autoplay, index, replay]);

  const scenario: PreviewScenario | null = index === null ? null : PREVIEW_SCENARIOS[index];
  const view: PreviewView | null = scenario ? resolvePreviewView(scenario, viewId) : null;

  const select = (next: number) => { setAutoplay(false); setIndex(next); setViewId(null); setReplay(n => n + 1); };
  return {
    scenario, view, index, autoplay, replay,
    active: scenario !== null,
    selectView: (id: string) => setViewId(id),
    select,
    /** Previous/Next wrap manually; they pause autoplay. */
    step: (delta: number) => select(stepPreviewIndex(index ?? 0, delta)),
    /** Restart the selected state's animation (remounts the canvas). */
    replayCurrent: () => setReplay(n => n + 1),
    togglePlay: () => {
      if (autoplay) { setAutoplay(false); return; }
      if (index === null) { setIndex(0); setViewId(null); }
      else if (nextAutoplayIndex(index) === null) { setIndex(0); setViewId(null); setReplay(n => n + 1); }
      setAutoplay(true);
    },
    start: () => { setIndex(0); setViewId(null); setAutoplay(false); setReplay(n => n + 1); },
    exit: () => { setAutoplay(false); setIndex(null); setViewId(null); },
  };
}
