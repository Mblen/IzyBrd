# IzyBrd

A mobile sweatshirt marketplace — *"StockX meets Pinterest meets TikTok, but only for sweatshirts."* Built for college students. A listing is called a **flip**; buying one is **the flip**.

Built with React Native + Expo and TypeScript, using Expo Router for file-based navigation.

## Tech stack

- **React Native** 0.85 + **Expo** SDK 56
- **Expo Router** (file-based routing)
- **TypeScript**
- `@expo/vector-icons` (Ionicons), `expo-linear-gradient`, `expo-image-picker`
- `@react-native-async-storage/async-storage` (onboarding persistence)

## Running it

```bash
npm install
npx expo start
```

Then open in **Expo Go** on your phone (scan the QR code), or press `w` for web. iOS/Android simulators also work via `npm run ios` / `npm run android`.

> Note: product images are Unsplash URLs and may render black on Expo **web** (CORS); they display correctly on a phone.

## What works today

The full marketplace loop is built and navigable end to end:

- **Onboarding** — 3-step welcome → pick your school → choose a handle, shown only on first launch
- **Home feed** — TikTok-style full-screen vertical feed with like/comment/share/save and per-flip stories
- **Discover & Search** — editorial discovery screen and a dedicated search experience
- **Sell** — a "New Flip" form with a real photo picker; posting creates a listing that appears in your profile and is fully shoppable
- **Flip detail** — photos, story, seller, details, and a **Make offer** sheet
- **Profiles** — your own profile and tappable seller closets
- **Inbox** — messages, offers, orders, and activity in one place
- **Chat** — message threads with **accept / decline** offer cards
- **Checkout** — order summary, (mock) payment, and a confirmation that lands in your Inbox
- **Sold state** — once a flip is bought it reads as *Sold* across the feed and detail

## Architecture notes

- **Routing** lives in `app/` (Expo Router). Dynamic routes use `[id].tsx` (e.g. `app/flip/[id].tsx`).
- **Shared state** lives in `lib/` as small in-memory stores (`offers`, `orders`, `listings`) wired into screens with React's `useSyncExternalStore`. These are intentionally simple stand-ins for a backend and are the single place to swap in real data.
- **Design**: black & white first; dark immersive screens (feed, discover, profile, detail) and a white utility Sell screen.

## Status & roadmap

**Done:** full frontend loop (discover → offer → chat → buy → sold), onboarding, photo upload, navigation between every screen.

**Current limitation:** all data is mock / in-memory — it resets on reload and there are no real accounts.

**Next (toward the full deliverable):**

1. **Backend (Supabase)** — accounts (sign-up/login), a real database for flips/offers/orders/messages, and image upload for listing photos. Replaces the `lib/` in-memory stores.
2. **Robustness** — loading/empty/error states, form validation, pull-to-refresh.
3. **Nice-to-haves** — push notifications for offers/messages, brand-color pass (A/B tested), saved searches.
