# CivicHelper

**Every letter, in plain words.** Paste a confusing official letter or form and get it explained in simple plain language — what it says, what it means for you, and the steps to take, with deadlines.

Built for anyone baffled by government, council, utility or benefits letters — and for the family members and carers who help them read the mail.

## What it does

- **Plain-language explanations** — paste any official letter and get a short summary, "what this means for you", numbered action steps with deadlines, and the key dates pulled out.
- **Live AI, honest demo mode** — when the deployed service is connected, Gemini explains the letter (LIVE AI badge). Until then the app explains letters on-device with a rule-based reader and marks them DEMO — it only uses dates, amounts and sentences that are actually in the letter.
- **Paper-trail inbox** — every letter is a document card with a sender seal, an urgency ribbon and a plain-language verdict; tap one for the full stamped explanation.
- **Deadlines** — every undone action step with a date, soonest first, with big day numerals and one-tap done toggles.
- **Sample letters included** — a council tax notice, a utility tariff change and a benefits appointment, so anyone can try an explanation immediately.
- **History** — explained letters are one tap away to re-open, with clear-history in Settings.
- **Accounts** — sign in with Google or email/password to sync letters and history across devices, or continue as a guest (guest mode lasts for this visit only).

## Live

- **Web app:** _live link added once deployed_
- **GitHub:** https://github.com/Aryanch1/CivicHelper
- **Design:** https://www.figma.com/design/PB6W477JNvVeuD8q5YqFzw — "CivicHelper — Daily App"

## Tech

Designed in Figma; React Native + Expo (SDK 58) + TypeScript — one codebase for Android, iOS and web. Gemini AI (`gemini-3.5-flash-lite`) for letter explanations via a Python serverless function (`api/explain.py`, key held server-side only). Firebase for accounts (Email/Password + Google) and sync. Archivo display type, stamp-red + postmark-blue paper-trail identity, Reanimated spring motion, custom rubber-stamp pull-to-refresh.

## Run it

```bash
npm install
npm run web        # web (Expo)
npm run android    # Android (Expo Go or a dev build)
npm run ios        # iOS (Expo Go)
```

Copy `.env.example` to `.env` to point the explainer at a deployed API origin (`EXPO_PUBLIC_API_URL`); without it the web app uses its own `/api/explain` and native builds fall back to the on-device demo explainer. No API key ever belongs in the app or the repo.

## Disclaimer

CivicHelper gives plain-language explanations, not legal advice. For anything binding, check with the office that sent the letter.

## License

MIT License — Copyright (c) 2026 Aryanmouli Cherupalli
