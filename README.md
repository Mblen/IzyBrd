# IzyBrd

A mobile marketplace for buying and selling second-hand sweatshirts, aimed at
college students but open to anyone. Think a shopping app with a TikTok-style
feed: you scroll full-screen listings, tap one, and buy it or make an offer.

A listing is called a **flip**. Everything in the app is a sweatshirt - hoodies,
crews, zip-ups, mock necks. That narrowness is deliberate and is the product.

Built with React Native + Expo (TypeScript), Expo Router for navigation, and
Supabase for the database, auth, file storage and realtime updates.

---

## Running it

```bash
npm install
npx expo start
```

Then press `w` for web, or scan the QR code with Expo Go on a phone.

> Expo Go on the iOS App Store is pinned to SDK 54 while this project is on
> SDK 56, so iPhone testing is done through the deployed web app instead
> ("Add to Home Screen" from Safari). Android Expo Go works.

### Building and deploying the web app

```bash
npx expo export --platform web
```

That writes `dist/`. Then deploy it:

```bash
npx netlify-cli deploy --prod --dir dist
```

Live at **https://izybrd.netlify.app** (Netlify project `izybrd`). The first
deploy from a fresh clone will ask which project to link - pick that one.

Two things worth knowing:

- **The SPA redirect lives in `netlify.toml`, not in `dist/_redirects`.** The
  deploy runs a build that regenerates `dist/`, so anything written there by
  hand is deleted before it is served. Without the redirect, every route except
  `/` 404s and the icon font falls through to the HTML fallback, which leaves
  screens blank.
- **Use the CLI, not Netlify's drag-and-drop upload** - the drag-and-drop has
  silently dropped files before.

---

## Environment variables

Copy `.env.example` to `.env` and fill in two values from the Supabase
dashboard under **Project Settings -> API**:

| Variable | Where it comes from |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | The publishable / anon key |

The anon key is a public client key and is safe to ship in the app bundle -
row level security is what actually protects the data. **Never put the
`service_role` key in this file or anywhere in the client.** `.env` is
gitignored; only `.env.example` is tracked.

One more secret lives in Supabase rather than here: the scanning function
needs `ANTHROPIC_API_KEY` set under **Edge Functions -> scan-item -> Secrets**.

---

## Architecture

Three layers, and the rule is that they only talk downward:

```
app/          screens and navigation (Expo Router - the file tree IS the routes)
components/   shared UI used by more than one screen
lib/          all data access; every Supabase call in the project lives here
```

**Screens never import `supabase` directly.** They call a function in `lib/`.
That is the main convention to preserve - it means you can find every query in
one folder, and swapping the backend would not touch the screens.

Each file in `lib/` owns one domain and mirrors a database table:

| File | What it owns |
|---|---|
| `supabase.ts` | The client, and `isSupabaseConfigured` |
| `session.ts` | Who is signed in; `requireAuth()` gates actions behind login |
| `profile.ts` | Profiles, avatars |
| `username.ts` | Handle availability and suggestions |
| `flips.ts` | Listings, the feed query, media upload |
| `engagement.ts` | Likes and saves |
| `comments.ts` | Comments, with realtime |
| `follows.ts` | Follow graph |
| `offers.ts` / `orders.ts` | Offers and completed purchases |
| `messages.ts` | Direct messages, with realtime |
| `reviews.ts` | Seller ratings |
| `wardrobe.ts` | The user's private digital closet |
| `scan.ts` | Calls the AI scanning function |
| `nav.ts` | `goBack()` - see "Conventions" |
| `ids.ts` | Id helpers; `storageKey()` for unguessable filenames |

### Conventions worth knowing

- **`goBack()` instead of `router.back()`.** `router.back()` silently does
  nothing when there is no history - a screen opened from a URL, or the first
  screen after a redirect - which turns every X and Back into a dead button.
  `lib/nav.ts` falls back to a real destination. Use it everywhere.
- **`useWindowDimensions()`, never a module-level `Dimensions.get()`.** The web
  build renders at desktop widths and must reflow.
- **Screens are capped at 480px wide and centred** so the app stays
  phone-shaped in a desktop browser.
- **Realtime channel names must be unique per subscription.** Two subscriptions
  sharing a channel name crash with "cannot add postgres_changes callbacks after
  subscribe()". Append a random suffix.
- **No box-drawing or unicode art in comments** - it breaks on Windows
  terminals. Plain hyphens only.

---

## Database

Schema lives in `supabase/schema.sql`, which is idempotent - safe to paste into
the SQL editor and run again at any time. It is the single source of truth for
the database - if you change the schema, change it here too.

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user, created automatically on signup |
| `flips` | The listings |
| `likes` / `saves` | Public like counts; private saves |
| `comments` | Comments on a flip |
| `follows` | Follower graph |
| `offers` | Buyer offers below asking price |
| `orders` | Completed purchases |
| `messages` | Direct messages between two users |
| `reviews` | Seller ratings, tied to an order |
| `wardrobe_items` | A user's private closet, from the scanner |

Two triggers do work the client cannot be trusted to do:

- **`handle_new_user`** creates the profile row on signup. It must never fail:
  a taken username used to abort the whole signup with a raw constraint error,
  so it now settles on a free variant and falls back to a bare profile row if
  anything else goes wrong.
- **`mark_flip_sold`** flips a listing to sold when an order is created, running
  as security definer so the buyer does not need write access to the seller's row.

Row level security is on for every table. The pattern is: public data is
readable by everyone, and you can only write rows that are yours. Storage
uploads are confined to a folder named after the uploader's user id, so one
user cannot overwrite another's photos - the app builds every path as
`<user id>/...`.

---

## Authentication

Supabase Auth, email and password. `lib/session.ts` wraps it:

- `isSignedIn()` - async check
- `requireAuth()` - checks, and routes to `/auth` if not; returns false so the
  caller can bail out
- `knownSignedIn()` - synchronous best-guess for first render

Browsing is open to guests. Home and Discover work signed out; liking, saving,
commenting, selling, messaging and buying call `requireAuth()` first. That is
deliberate - making people sign up before they can see anything loses them.

---

## External services

| Service | Used for | Notes |
|---|---|---|
| Supabase | Database, auth, file storage, realtime | Free tier |
| Anthropic API | Garment recognition from photos | Called only from the edge function, never the client |
| Netlify | Hosting the web build | Drag-and-drop is unreliable; use the CLI |

The Anthropic key is never in the app. `lib/scan.ts` invokes a Supabase edge
function (`supabase/functions/scan-item/`), which holds the key and calls the
model. The function rate-limits to 40 scans per user per hour.

---

## Main features and where they live

| Feature | Code |
|---|---|
| Full-screen shopping feed | `app/(tabs)/index.tsx` |
| Discover, categories, search entry, Scan button | `app/(tabs)/shop.tsx` |
| Search | `app/search.tsx`, `searchFlips` in `lib/flips.ts` |
| Listing detail, gallery, offers | `app/flip/[id].tsx` |
| Checkout and post-purchase rating | `app/checkout/[id].tsx` |
| Creating a listing | `app/(tabs)/sell.tsx` |
| Live camera scanner | `app/camera-scan.tsx` |
| Closet scan (many garments, one photo) | `app/closet-scan.tsx` |
| Digital wardrobe | `app/wardrobe.tsx` |
| Messages | `app/(tabs)/inbox.tsx`, `app/chat/[id].tsx` |
| Own profile / other profiles | `app/(tabs)/profile.tsx`, `app/user/[id].tsx` |
| Signup and onboarding | `app/auth.tsx`, `app/onboarding.tsx` |

---

## What is left, and how urgent

Three tiers, and the distinction matters. A missing password reset is not the
same kind of thing as a missing animation, and filing them together is how a
project rots after handoff. **Anything under "core, incomplete" is a feature
this product is expected to have** - it is unbuilt, not declined.

### Core, incomplete - build these before calling the product finished

| | Why it is core |
|---|---|
| Real payments | Shopping is the whole point; checkout currently creates an order and charges nothing |
| Order history for buyers | Orders appear in the Inbox feed but there is no list of what you have bought |
| Change password while signed in | Reset-by-email exists; changing a known password does not |
| Account deletion | Users are entitled to it and app stores require it |
| Email verification enforcement | Supabase can require it; the app does not check |
| Push notifications for offers and messages | Without them a seller never learns an offer arrived unless they reopen the app |
| Image resizing on upload | Photos upload at 3-5MB each, straight from the camera |

### Known issues - documented, lower risk

- **Payment is simulated.** Checkout creates an order row. The card shown on the
  checkout screen is fixed text, not a real payment method.
- **Shipping is not real.** No labels, tracking or address validation.
- **The web bundle is ~2.3MB**, slow on a phone's first load. Fixing it means
  lazy-loading the heavy screens.
- **The feed falls back to demo listings only when the database has none.** With
  real listings present, none appear. Ids `'1'`-`'5'` are the demo ones;
  `isRealFlipId()` in `lib/ids.ts` distinguishes them. This should still be
  removed before a real launch.

### Optional - genuinely can wait

Animations, richer profile customisation, recommendation ranking, additional
social features.

## Fixed during the pre-launch audit - worth not regressing

These were all real, reproduced failures. If you change this code, re-check them.

- **Missing items rendered a demo product.** A listing id that did not exist
  showed a real-looking hoodie at a real-looking price, and its checkout screen
  offered a placeable order. `components/NotFound.tsx` now covers all three
  screens. Never reintroduce a `?? FLIPS['1']`-style fallback.
- **The Inbox invented activity.** Six hardcoded messages, offers and shipping
  notices were merged into real data unconditionally.
- **Real conversations never reached the Inbox** - `getMyThreads()` did not exist.
- **Every X and Back was dead when there was no history.** Use `goBack()`.
- **Signup failed outright on a taken username**, and told you nothing when the
  form was incomplete.
- **The scanner was unreachable** and its result led nowhere purchasable.
- **The feed made one request per card** for like and comment counts.

## Future work

See "What is left, and how urgent" above - that section is the real backlog,
ordered by whether the product is incomplete without it.

## Testing

See `TESTING.md` for the full manual test checklist, including the failure
cases that matter most and the tasks to give a first-time tester.
