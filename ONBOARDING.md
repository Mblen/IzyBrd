# Working on IzyBrd

Notes for whoever is joining me on this. The README covers setup and structure;
this is the tour — what is here, why it is the way it is, and the things that
will waste a day if nobody tells you.

---

## First, get it running

```bash
npm install
npx expo start
```

Press `w` for web. You need a `.env` file — copy `.env.example` and I will send
you the two Supabase values. Nothing works without them.

The live app is at **https://izybrd.netlify.app**. Open it on your phone before
you read any code. Fifteen minutes of using it is worth more than an hour of
reading.

---

## How the app is laid out

Three folders, and they only talk downwards:

```
app/          the screens. The file tree IS the navigation (Expo Router)
components/   UI used by more than one screen
lib/          every database call in the project
```

**The one rule I would ask you to keep: screens never import `supabase`
directly.** They call a function in `lib/`. It means every query in the project
is in one folder, and if we ever move off Supabase we would not touch a single
screen.

Each file in `lib/` owns one thing, and mirrors a database table:

| File | Owns |
|---|---|
| `supabase.ts` | The client itself |
| `session.ts` | Who is signed in. `requireAuth()` gates anything that needs an account |
| `profile.ts` | Profiles and avatars |
| `username.ts` | Handle availability, and suggesting free ones |
| `flips.ts` | Listings, the feed query, uploading media |
| `engagement.ts` | Likes and saves |
| `comments.ts` | Comments (live) |
| `follows.ts` | Who follows who |
| `offers.ts` / `orders.ts` | Offers and completed purchases |
| `messages.ts` | Direct messages (live) |
| `reviews.ts` | Seller ratings |
| `wardrobe.ts` | The private digital wardrobe |
| `scan.ts` | Calls the AI scanning function |
| `images.ts` | Shrinks photos before upload |
| `nav.ts` | `goBack()` — read the section below before using anything else |
| `ids.ts` | Id helpers, and unguessable filenames for storage |

A listing is called a **flip** everywhere in the code. That is just the word we
landed on early.

---

## The screens, roughly in the order a user meets them

| Screen | File |
|---|---|
| Sign up / sign in | `app/auth.tsx` |
| First-run walkthrough | `app/onboarding.tsx` |
| The feed (the main thing) | `app/(tabs)/index.tsx` |
| Discover, categories, Scan button | `app/(tabs)/shop.tsx` |
| Search | `app/search.tsx` |
| One listing | `app/flip/[id].tsx` |
| Checkout and rating the seller | `app/checkout/[id].tsx` |
| Posting a listing | `app/(tabs)/sell.tsx` |
| Live camera scanner | `app/camera-scan.tsx` |
| Closet scan (many items, one photo) | `app/closet-scan.tsx` |
| The wardrobe | `app/wardrobe.tsx` |
| Inbox | `app/(tabs)/inbox.tsx` |
| A conversation | `app/chat/[id].tsx` |
| Your profile / someone else's | `app/(tabs)/profile.tsx`, `app/user/[id].tsx` |

---

## Rules that are not obvious

These are all things that broke and got fixed. Please keep them.

**Use `goBack()` from `lib/nav.ts`, never `router.back()`.**
`router.back()` silently does nothing when there is no history behind the
screen — which happens whenever someone opens a link directly, or lands
somewhere after a redirect. Every X and Back button in the app was dead in that
situation. `goBack()` falls back to a real destination.

**Every realtime channel name needs a random suffix.**
Two subscriptions sharing a channel name crash with *"cannot add
postgres_changes callbacks after subscribe()"*. Look at how `subscribeLikes`
does it and copy that.

**`useWindowDimensions()`, never `Dimensions.get()` at the top of a file.**
The web build runs at desktop widths and has to reflow. A value read once at
module load is wrong forever.

**Screens are capped at 480px and centred.** That is what keeps the app
phone-shaped in a desktop browser instead of stretching across a monitor.

**Any new photo upload has to go through `shrinkImage()`.**
Camera photos are 3–5MB and nothing here draws one above phone width. It is
about thirty times smaller after shrinking.

**Plain hyphens in comments, no box-drawing characters.** They break on
Windows terminals.

---

## Things that will waste your time if nobody says

**iPhone testing does not use Expo Go.** The App Store version is pinned to an
older SDK than this project. Test on the deployed web app instead — open
izybrd.netlify.app in Safari and Add to Home Screen. It behaves like an app.
Android Expo Go is fine.

**The deploy rebuilds `dist/`,** so anything you write into that folder by hand
gets deleted before it is served. The routing rule lives in `netlify.toml` for
exactly this reason. If deep links start 404ing or the icons vanish, that file
is the first place to look.

**The scanner is capped at 40 scans an hour** and the live view scans every five
seconds — so about three and a half minutes of continuous use hits the limit.
Do not leave it open before a demo.

**Do not add a fallback that shows a different item when one is missing.**
There used to be `?? FLIPS['1']` in a few screens, which meant a listing that
failed to load quietly showed a real-looking product at a real-looking price —
including on the checkout screen. Use `components/NotFound.tsx`.

---

## What is built, and what is not

Built and working: accounts with password reset, profiles, the feed, search,
listings with photo galleries and video, buying, offers, messaging, comments,
seller reviews, follows, the wardrobe, and AI scanning in three forms.

Not built yet, roughly in the order I would do them:

1. **Real payments.** Checkout creates an order and charges nothing. The card on
   screen is fixed text.
2. **Order history** for buyers. Purchases show in the Inbox but there is no list.
3. **Changing your password while signed in**, and deleting your account.
4. **Shipping** — no labels, tracking or address validation.
5. **Push notifications** for offers and messages.
6. **Trading.** We talk about it as buy/trade/offer, but there is no swap
   feature — only buying and offers. Worth deciding whether to build it or stop
   saying it.

The README has the full list, sorted by whether the product is incomplete
without it rather than by how hard it is.

---

## Good things to pick up first

Small enough to finish, real enough to matter:

- **Order history screen.** The data is already there in `lib/orders.ts`; it
  needs a screen. Good way to learn the codebase without breaking anything.
- **Change password while signed in.** Supabase does the work; it is a form.
- **The 9 demo photos repeat** across the seeded listings. Real photos would
  make the whole thing look better immediately.

---

## How we work

Everything is on the `main` branch on GitHub. Pull before you start, push when
something works. Run `npx tsc --noEmit` before pushing — it catches most
mistakes in a few seconds.

`TESTING.md` has the full manual checklist. It is weighted towards things going
wrong rather than the happy path, because that is where the bugs were.

Ask me anything. Most of the odd-looking decisions in here have a reason, and
the commit messages explain them — `git log` on a file is usually faster than
guessing.
