// useSidebarPreferences.js — Sidebar feature visibility preferences
import { useLocalStorage } from './useLocalStorage';

const PREFS_KEY = 'zyra_sidebar_preferences';

export const DEFAULT_SIDEBAR_PREFS = {
  showAnalytics: true,
  showForecasts: true,
  showPlans: true,
  showCopilot: true,
};

export function useSidebarPreferences() {
  const [prefs, setPrefs] = useLocalStorage(PREFS_KEY, DEFAULT_SIDEBAR_PREFS);

  const updatePref = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setPrefs(DEFAULT_SIDEBAR_PREFS);
  };

  // Ensure any missing keys (future additions) fall back to true
  const safePrefs = { ...DEFAULT_SIDEBAR_PREFS, ...prefs };

  return { prefs: safePrefs, updatePref, resetToDefaults };
}
