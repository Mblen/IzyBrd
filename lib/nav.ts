// router.back() quietly does nothing when there is no history to go back to -
// a screen opened straight from a URL, or the first screen after a redirect.
// That turns every X and Back into a dead button. Always give it somewhere to
// land instead.

import { router } from 'expo-router';

export function goBack(fallback: string = '/(tabs)') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as any);
}
