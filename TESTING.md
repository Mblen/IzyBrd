# Testing IzyBrd

Two parts: **tasks to give a tester** (what your friends do), and a
**manual checklist** (what you run before a release).

---

## Part 1 - Give this to a tester

Do not explain anything first. Hand them the link and these tasks. Where they
get stuck is the result you are collecting; if you explain, you lose it.

> 1. Make an account.
> 2. Set up your username.
> 3. Find the main feed of sweatshirts.
> 4. Find one you like and open it.
> 5. Like it, and leave a comment.
> 6. Find the scanner.
> 7. Scan any piece of clothing near you.
> 8. From that scan, find something you could buy.
> 9. Go back to the feed.
> 10. Find a different sweatshirt and start buying it (stop before you confirm).
> 11. Find your own profile.

### What to write down

For each task, note only these. Do not note your explanations.

| | |
|---|---|
| **Time** | How long until they finished, or gave up |
| **Wrong taps** | What they tapped that was not the answer |
| **Hesitation** | Where they paused for more than a couple of seconds |
| **Questions** | Anything they asked out loud - write the exact words |
| **Expected but missing** | "I thought this would..." |
| **Gave up** | Which task, and what they said |

The most valuable line you can record is a question in their own words. "Where
do I press to look at it?" tells you more than a rating out of ten.

### Questions to ask after, not during

- What is this app for?
- What is the scanner for?
- If you wanted a hoodie under $30, what would you do?
- Was there any moment you felt lost?
- Would you use it? Why not?

---

## Part 2 - Manual checklist

Tick these before any release. Anything marked **[F]** is a failure case - the
app is expected to handle it gracefully, never to leave the user wondering what
happened.

### Accounts

- [ ] Create an account with a fresh email
- [ ] **[F]** Sign up with an email that already exists -> plain-language message, not a raw error
- [ ] **[F]** Sign up with a malformed email -> the form says what is wrong
- [ ] **[F]** Password under 6 characters -> the form says what is wrong
- [ ] **[F]** Leave a field empty -> the button names the one thing missing
- [ ] Username shows a green tick when free
- [ ] **[F]** Username already taken -> says so, offers alternatives, tapping one fills it
- [ ] **[F]** Two people claim the same username at the same instant -> neither signup fails
- [ ] Sign in with correct details
- [ ] **[F]** Sign in with the wrong password -> readable message
- [ ] Sign out, then sign back in
- [ ] **[F]** Close the app halfway through signup, reopen -> no half-made account

### Profile

- [ ] Edit name, handle, college, city, bio and save
- [ ] Upload an avatar; it appears on your listings and comments
- [ ] **[F]** Change your handle to one already taken -> readable message

### Feed and shopping

- [ ] Feed loads and scrolls
- [ ] Like counts and comment counts are correct
- [ ] Like, unlike, save, comment
- [ ] Open a listing; photos and video swipe
- [ ] **[F]** Open a listing id that does not exist -> "This listing is gone", not a demo product
- [ ] Make an offer
- [ ] Buy; the order appears in Inbox and the listing shows sold
- [ ] **[F]** Open checkout for a missing item -> refuses to check out
- [ ] Rate the seller after buying
- [ ] Search finds items by title, style and brand
- [ ] **[F]** Search for something with no results -> says so, does not look broken
- [ ] Tapping a category returns matching items

### Scanner

- [ ] The Scan button is findable on Discover without being told
- [ ] The permission request explains why the camera is needed
- [ ] **[F]** Deny the camera -> can still browse; the escape actually goes somewhere
- [ ] Scan a sweatshirt -> details come back
- [ ] **[F]** Point at nothing / a wall -> says it is still trying, does not hang silently
- [ ] **[F]** Turn off wifi mid-scan -> a message, not a spinner forever
- [ ] "Find ones like this" leads to items for sale
- [ ] Save to wardrobe; it appears in the wardrobe
- [ ] Closet scan finds several garments in one photo
- [ ] Scanning from the Sell tab pre-fills the listing form

### Selling

- [ ] Post a listing with one photo, a title and a price
- [ ] It appears at the top of the feed
- [ ] Add several photos and a video
- [ ] **[F]** Try to post with no photo -> the button says what is missing
- [ ] Cancel leaves the form and does not trap you

### Navigation

- [ ] Every X and Back goes somewhere
- [ ] **[F]** Open any screen directly from its URL, then press X -> lands on the feed, not nothing
- [ ] All five tabs work
- [ ] **[F]** As a guest, try to like / sell / message -> sent to sign-in, not silently ignored

### Robustness

- [ ] **[F]** Aeroplane mode on every screen -> readable messages, no blank screens
- [ ] **[F]** Slow connection -> loading states, not frozen screens
- [ ] **[F]** Double-tap Buy / Post / Send -> only one thing happens
- [ ] **[F]** Refresh mid-load -> recovers
- [ ] **[F]** A very long username or title -> layout does not break

### Devices

- [ ] iPhone (Safari, via Add to Home Screen)
- [ ] Android
- [ ] Small phone (SE-sized) - nothing cut off, nothing scrolls sideways
- [ ] Desktop browser - stays phone-shaped and centred

### Accessibility

- [ ] Every tappable thing is at least ~44pt tall
- [ ] Text is readable at arm's length
- [ ] No action is explained by colour alone
- [ ] Every icon-only button is either obvious or labelled
- [ ] Disabled buttons are visibly disabled and say why

---

## Known gaps this checklist will surface

These are documented in the README under "Known issues" and are expected:

- Demo listings (ids `1`-`5`) and demo sellers are mixed in with real data.
  Messaging a demo seller goes nowhere.
- Payment is simulated - buying creates an order but charges nothing.
- No password reset.
