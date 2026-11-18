# CivicHelper — Design Spec

**App:** CivicHelper — paste a confusing official letter or form, get a
plain-language explanation (what it says, what it means for you, numbered
action steps with deadlines, key dates extracted), for anyone baffled by
government, council, utility or benefits letters.
**Disclaimer (on every explanation screen):** "This is a plain-language
explanation, not legal advice. For anything binding, check with the office
that sent the letter."
**Theme:** stamp red `#C0392B` (deep `#8E281D`, light `#D96A5A`, soft
`#F6DCD6`, pale `#FDF0EC`) + postmark blue `#33587A` accent on warm paper
`#FAF6EE` with ink charcoal `#26221C`. NOT deep green, NOT teal, NOT
navy/gold, NOT terracotta/sage.
**Display font:** Archivo 700/800 (bundled via
`@expo-google-fonts/archivo`) for headlines, screen titles and big numbers;
system font for body. (FridgeToMeal/MediGuide used Sora, SplitEase used
Fraunces, PlantDoctor used Bricolage Grotesque — CivicHelper deliberately
uses a different family.)
**Figma:** https://www.figma.com/design/PB6W477JNvVeuD8q5YqFzw —
"CivicHelper — Daily App". File created 2026-11-18; the canvas
population write did not land (the `use_figma` call's session ended
before completion and the file still shows only "Page 1") — DESIGN.md
is the source of truth, and the file link is in the README.

## Visual identity (distinct from FridgeToMeal, MediGuide, SplitEase, PlantDoctor)

- **Home structure:** a "paper trail" — a timeline/feed of letters
  (incoming mail stack), NOT a photo hero, NOT a dashboard grid, NOT a
  ledger, NOT a deck of cards. Typographic hero — huge Archivo headline
  "Every letter, in plain words." — plus a data strip (letters explained,
  deadlines this week, steps done). The paste-a-letter composer is the
  primary tool up top.
- **Letter cards:** styled like documents/envelopes — a paper card with a
  sender seal (circular monogram), an urgency ribbon (red = due soon,
  amber = soon, gray = no deadline), a plain-language verdict line, and a
  due chip. No photos anywhere: the imagery layer is a designed graphic
  system (seals, ribbons, perforated edges, postmark rings).
- **Navigation:** bottom tab bar in dark ink with cream labels, a
  stamp-red pill on the active tab, and a raised circular red "+" button
  in the centre (Explain). Tabs: Letters, Deadlines, Settings. NO floating
  glass pill tab bar (FridgeToMeal/MediGuide), NO top segmented tabs
  (SplitEase), NO flat light labeled bar (PlantDoctor). On ≥840dp the bar
  becomes a left master-detail rail: a vertical ink rail on the far left,
  letters list on the left, selected letter detail on the right.
- **Cards:** document cards, 30px radius, with a perforated top edge
  (dashed hairline) and a seal; explanation results as "stamped" cards
  with numbered action steps and a red "EXPLAINED" stamp mark.
- **Glass:** frosted glass only where it fits this identity (the Welcome
  card, small overlay chips) — always the two-layer structure (outer view
  background + shadow, inner overflow-hidden view clipping the BlurView)
  so Android never paints a white plate.
- **Refresh motif:** a rubber stamp (Reanimated, scrubbed by pull
  distance; header refresh button on web). Pulling drops a circular
  stamp down onto the page; past the threshold it presses, the
  "EXPLAINED" mark stamps in, and the list settles with a spring.

## Design tokens (lib/theme.ts)

- Palette: stamp-red primary + postmark-blue accent + warm-paper
  neutrals; warning amber for soon deadlines; error red; success green
  for done steps.
- Radii: cards 30px, sheets 38px top, pills fully round, inputs 24px,
  seal circles 999px.
- Spacing: 8-point grid (4/8/16/24/32/48).
- Shadows: soft card shadow (ink-tinted), stamp-red glow on primary CTA.
- Type scale: Display 42 (56 wide) / Title 24 / Subtitle 17 / Body 15 /
  Caption 12 / Label 11.
- Breakpoints: `<600` phones (single column) · `600–840` large phone /
  foldable folded · `840–1280` tablet / foldable unfolded (two-pane:
  list left, detail right) · `≥1280` desktop centred shell (max 1120).

## Imagery layer (required, from day one)

No photos: CivicHelper is not a visual concept, so the imagery layer is
a designed graphic system — sender seals (circular monograms in cycled
colors), urgency ribbons, perforated edges, postmark rings, and the
stamp motif. No text-only template list anywhere: every letter card
carries a seal, a ribbon and a verdict.

## Screen inventory & flow

1. **Splash** — warm paper, red stamp glyph, "CivicHelper".
2. **Welcome** (gate on every open for signed-out non-guests) — stamp
   graphic (a letter being stamped, drawn with views), headline "Every
   letter, in plain words.", exactly four options: Continue with Google ·
   Create account (name + email + password + confirm, match check) · Log
   in (email/password + Forgot password) · Continue without an account.
3. **Letters (Home)** — typographic hero (huge Archivo headline +
   data strip: letters explained / deadlines this week / steps done);
   "Paste a letter" composer card up top (primary tool); letters as a
   timeline/feed of document cards (seal, ribbon, verdict, due chip);
   tap a card → letter detail. Two-pane on ≥840: list left, selected
   letter detail right.
4. **Explain** — paste/type the letter text (multiline input) + sender
   + title fields; 3 sample-letter chips (council tax notice, utility
   tariff change, benefits appointment); "Explain this letter" CTA
   (animated loading dots); error state with retry wording. On success
   the letter is saved and the detail screen opens (visible feedback).
5. **Letter detail** (`/letter/[id]`) — document header (seal, sender,
   received date); "In plain words" summary; "What this means for you";
   numbered action steps with deadlines and done toggles; key dates;
   source badge (Live AI / Demo); the not-legal-advice disclaimer
   banner; "Mark done" CTA (confirms in place: "Marked done" appears
   under the CTA where the user is looking); delete letter.
6. **Deadlines** — upcoming action steps with dates, soonest first;
   big day numerals, letter + step, done toggle per step; empty state
   when nothing is due.
7. **Settings / Profile** — avatar (client-side resized, stored on the
   user doc), display name, email + sign-in method, password-reset email,
   sign out; guest account card routing to Welcome; history (one-tap
   re-use + clear-history); service status; version read from `app.json`.
8. **Help** — how it works (4 steps), what CivicHelper is not,
   disclaimer, privacy.
9. **Empty/error states** — no letters yet, no deadlines, letter not
   found, explanation error with retry wording.

## Transition & animation plan

- App open: splash holds on warm paper until Archivo loads; Home
  headline rises in (spring).
- Welcome → Home: slide_from_right (expo-router stack default).
- Home → Explain → Detail: after a successful explanation the detail
  screen slides in; the Mark-done button confirms in place.
- Cards/lists: staggered rise (`FadeInDown` + spring, 60–70ms stagger).
- Buttons: Reanimated spring press to ~0.95 with overshoot settle; glow
  tightens; light haptic on primary actions (mobile only).
- Chips: pop (scale bounce 1.18 → 1) when selected.
- Loading: bouncing dots inside the CTA; skeleton lines while the
  explanation loads on the detail screen; never a frozen screen.
- Custom pull-to-refresh: a rubber stamp, scrubbed by pull distance
  (threshold 90px); on release it presses and loops (stamp thumps +
  "EXPLAINED" mark fades in) while data returns, then content settles
  with a spring. On web the same stamp animates on the header refresh
  button.
- History "Use": re-opens the letter on the detail screen (new screen =
  visible feedback), with "Opening…" shown on the tapped row while it
  loads.

## Visual self-check (quality + distinctness)

Scored against the 8 shared rules in `DESIGN_REFERENCE.md` plus
DISTINCTNESS — could this screen be mistaken for FridgeToMeal,
MediGuide, SplitEase or PlantDoctor? Honest estimates, 2026-11-18
(code review against the `expo export` build; no live Vercel URL exists
yet to screenshot at widths):

- Home (Letters inbox): quality ~90%, distinctness ~95% — typographic
  hero + document timeline + dark ink tab bar with raised red Explain
  button; nothing in the earlier apps looks like a mail stack.
- Explain (paste + samples): quality ~88%, distinctness ~92% —
  composer-first screen with sample chips; no photo hero, no ledger.
- Letter detail: quality ~90%, distinctness ~92% — stamped explanation
  card, numbered steps, seal header; reads as a document, not a recipe
  card, prescription card or ledger row.
- Deadlines: quality ~86%, distinctness ~88% — big day numerals with
  letter + step; closest in spirit to PlantDoctor's Care list, but the
  stamp-red/ink identity and document framing keep it apart.
- Welcome: quality ~88%, distinctness ~90% — stamp graphic instead of
  a photo hero, coin stack or arch tile.
- Settings / Help: quality ~85%, distinctness ~85% — same account
  system as the other apps by design (the standard pattern), restyled
  in the stamp-red/paper identity.
