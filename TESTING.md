# Testing IzyBrd

Two parts: **tasks to give a tester** (what your friends do), and a
**manual checklist** (what you run before a release).

---

## Part 1 - Give this to a tester

Do not explain anything first. Hand them the link and these tasks. Where they
get stuck is the result you are collecting; if you explain, you lose it.

Phrase every task by the **goal**, never the control. "Tap Scan" tests whether
they can read; "show me how you'd find one like it" tests whether the app
communicates. If they cannot find it, that is the finding - do not rescue them.

> 1. Make yourself an account.
> 2. Show me what this app is for.
> 3. Find a sweatshirt you actually like.
> 4. Tell that person you like it.
> 5. You are holding a hoodie you own. Show me how you would find one like it
>    on here.
> 6. From that, find something you could actually buy.
> 7. Go back and find a different one.
> 8. Start buying it - stop before you confirm.
> 9. Show me your account.
> 10. Pretend you forgot your password. What would you do?

### What to write down

For each task, note only these. Do not note your explanations - and try not to
give any. Count to ten in your head before you help; most people find it in
eight, and what they tried first is the most useful thing you will learn all
week.

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
- [ ] A photo taken on the phone camera posts without a long wait, and still
      looks sharp full-screen (it is resized to 1080px on upload)
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

Expected, documented in the README - not bugs to report:

- **Payment is simulated.** Buying creates an order and charges nothing. The
  card on the checkout screen is fixed text.
- **No shipping.** No tracking, labels or address validation.
- **No order history screen.** Purchases appear in the Inbox, not as a list.
- **Demo listings still exist** (ids `1`-`5`) but only appear if the database
  has no real listings at all. With real listings present you will not see them.

## Add a password-reset check

- [ ] Sign-in shows "Forgot your password?"
- [ ] **[F]** Tap it with the email box empty -> tells you to fill it in first
- [ ] Tap it with your address -> confirms a link is on its way
- [ ] The email arrives and the link lets you set a new password
