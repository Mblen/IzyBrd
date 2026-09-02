# Working on IzyBrd

Hey! This is everything I wish someone had told me when I started. The README
has the setup stuff, this is more like the tour — what's here, why some things
look weird, and the stuff that made me lose a whole day so you don't have to.

---

## Get it running first

```bash
npm install
npx expo start
```

Press `w` for web. You need a `.env` file — copy `.env.example` and I'll send
you the two Supabase values. Nothing works without them, so ask me before you
start debugging.

The live app is **https://izybrd.netlify.app**. Honestly, open it on your phone
and just use it for 15 minutes before reading any code. It'll make way more
sense.

---

## How it's organised

Three folders:

```
app/          the screens (the file names literally ARE the routes)
components/   stuff used by more than one screen
lib/          anything that talks to the database
```

**The one thing I'd ask you to stick to: screens don't import `supabase`
directly, they call something in `lib/`.** That way every database query in the
whole project is in one folder. Makes it way easier to find things, and if we
ever switch off Supabase we wouldn't have to touch a single screen.

Each file in `lib/` does one thing:

| File | What it does |
|---|---|
| `supabase.ts` | The client itself |
| `session.ts` | Who's logged in. `requireAuth()` blocks stuff that needs an account |
| `profile.ts` | Profiles and profile pictures |
| `username.ts` | Checks if a username is free, suggests other ones |
| `flips.ts` | Listings, the feed, uploading photos |
| `engagement.ts` | Likes and saves |
| `comments.ts` | Comments (updates live) |
| `follows.ts` | Who follows who |
| `offers.ts` / `orders.ts` | Offers and purchases |
| `messages.ts` | DMs (updates live) |
| `reviews.ts` | Seller ratings |
| `wardrobe.ts` | The private wardrobe |
| `scan.ts` | Calls the AI scanner |
| `images.ts` | Shrinks photos before uploading |
| `nav.ts` | `goBack()` — please read the section below first |
| `ids.ts` | Random ids, and filenames people can't guess |

Heads up: a listing is called a **flip** everywhere in the code. It's just the
word we started with and it stuck.

---

## The screens

Roughly in the order someone using the app would see them:

| Screen | File |
|---|---|
| Sign up / log in | `app/auth.tsx` |
| First-time walkthrough | `app/onboarding.tsx` |
| The feed (the main one) | `app/(tabs)/index.tsx` |
| Discover + categories + Scan button | `app/(tabs)/shop.tsx` |
| Search | `app/search.tsx` |
| A listing | `app/flip/[id].tsx` |
| Checkout + rating the seller | `app/checkout/[id].tsx` |
| Posting something | `app/(tabs)/sell.tsx` |
| Live camera scanner | `app/camera-scan.tsx` |
| Closet scan (lots of items, one photo) | `app/closet-scan.tsx` |
| The wardrobe | `app/wardrobe.tsx` |
| Inbox | `app/(tabs)/inbox.tsx` |
| A chat | `app/chat/[id].tsx` |
| Your profile / someone else's | `app/(tabs)/profile.tsx`, `app/user/[id].tsx` |

---

## Rules that aren't obvious

All of these exist because something broke. Please keep them!

**Use `goBack()` from `lib/nav.ts`, not `router.back()`.**
`router.back()` just does nothing if there's no history behind the screen —
which happens any time someone opens a link directly or gets redirected. Every
single X and Back button in the app was dead like this and nobody noticed for
ages. `goBack()` sends them somewhere real instead.

**Realtime channel names need a random bit on the end.**
If two subscriptions have the same channel name the app crashes with *"cannot
add postgres_changes callbacks after subscribe()"*. Copy how `subscribeLikes`
does it.

**Use `useWindowDimensions()`, never `Dimensions.get()` at the top of a file.**
The web version runs at desktop sizes and has to resize. If you read the width
once when the file loads it's just wrong forever.

**Screens are max 480px wide and centred.** That's what stops the app
stretching across a whole monitor and looking broken on desktop.

**Any new photo upload has to go through `shrinkImage()`.**
Phone photos are like 3–5MB and nothing in the app shows one bigger than phone
width. It's about 30x smaller after.

**Plain hyphens in comments, no fancy line characters.** They break on Windows.

---

## Stuff that'll waste your time if nobody tells you

**iPhone testing doesn't work with Expo Go.** The App Store version is stuck on
an older SDK than we're using. Just use the live web app instead — open
izybrd.netlify.app in Safari, then Add to Home Screen. It looks and works like
a real app. Android Expo Go is fine though.

**The deploy rebuilds `dist/`**, so anything you put in that folder by hand gets
wiped before it goes live. That's why the routing rule lives in `netlify.toml`.
If links suddenly 404 or all the icons disappear, check that file first — that
exact thing happened like three times before I worked out why.

**The scanner only allows 40 scans an hour** and the live view scans every 5
seconds, so about 3 and a half minutes of leaving it open hits the limit. Don't
leave it running before a demo (learned that one the hard way).

**Never add a fallback that shows a different item when one is missing.**
There used to be `?? FLIPS['1']` in a few places, which meant if a listing
didn't load the app just showed a completely different product at a different
price — including on the checkout screen. Someone could've bought something
that didn't exist. Use `components/NotFound.tsx` instead.

---

## What's done and what isn't

**Done:** accounts with password reset, profiles, the feed, search, listings
with photo galleries and video, buying, offers, messaging, comments, seller
reviews, follows, the wardrobe, and the AI scanning (three different versions).

**Not done yet**, roughly in the order I'd do them:

1. **Real payments.** Checkout makes an order but doesn't charge anything. The
   card on the screen is literally just text.
2. **Order history** for buyers — purchases show up in the Inbox but there's no
   actual list of what you've bought.
3. **Changing your password when you're logged in**, and deleting your account.
4. **Shipping** — no labels, no tracking, no address checking.
5. **Notifications** for offers and messages.
6. **Trading.** We describe the app as buy/trade/offer but there's no actual
   swap feature, just buying and offers. Someone needs to decide if we build it
   or stop saying it.

The README has the full list if you want it.

---

## Good things to start with

Small enough to actually finish, but not pointless:

- **The order history screen.** All the data's already there in `lib/orders.ts`,
  it just needs a screen. Good way to get a feel for the codebase without
  breaking anything.
- **Change password while logged in.** Supabase does the hard part, it's
  basically a form.
- **The demo photos repeat** — there are only 9 of them across all the seeded
  listings. Real photos would instantly make the whole app look better.

---

## How we work

Everything's on `main` on GitHub. Pull before you start, push when something
works. Run `npx tsc --noEmit` before you push, it catches most mistakes in like
5 seconds.

`TESTING.md` has the checklist I use before releasing. It's mostly about things
going wrong rather than the happy path, because that's where all the actual
bugs were.

Seriously just ask me anything. Most of the weird-looking decisions have a
reason behind them, and `git log` on a file usually explains it faster than
guessing.
