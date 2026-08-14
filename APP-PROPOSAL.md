# PRC Pakistan — Mobile App Proposal

> **Prepared by:** mo digital
> **For:** PRC Pakistan
> **Status:** Prototype · Version 1.4.0
> The website is live — and alongside it, we designed a companion **app** so PRC Pakistan lives on families' home screens, not just in their browser bookmarks.

---

## 1. The one-line pitch

The PRC Pakistan App is an **installable, offline-capable, English ⇄ Urdu mobile app** that puts PRC's articles, self-assessments, resources and one-tap support on every family's phone — no Play Store, no App Store, no account, no data collection.

## 2. Why an app?

- The website is broad; the app is **focused**. One thumb-reachable surface for the three things families ask for most: **read, check, connect**.
- It installs to the home screen like a native app and **works offline** (service worker caches the shell).
- It speaks the user's language: **full English ⇄ Urdu switching with RTL layout**.
- It is **private by design**: assessments run entirely on-device. No sign-up, no cloud sync, nothing is sent to us.

## 3. Current prototype — what the app already does

| Area | Detail |
|---|---|
| **Home** | Time-based greeting (**morning / afternoon / night**), large "What would you like to learn today?" prompt, 2×2 quick actions (Read / Self-Assess / Book / Services), live stats, **Continue learning** card (resumes your last article), **Daily learning streak** (7 dots for the week), tip of the day, featured article, WhatsApp community card |
| **Articles** | 17 articles with category + language filters and search; opens in a **clean, distraction-free reader** — website navigation, menus and footer are stripped instantly and can never appear |
| **Saved & Liked** | **Bookmark an exact line** of any article (saved with its quote, reopens at that line) and **like e-books** — all collected in a Saved & Liked library, one tap from the top bar |
| **Self-assessments** | 3 quizzes (Listening, Parenting Stress, Relationship Connection) with sliders, writing questions, a speedometer score /100, retake, and **"Recommended reading" — each result suggests related articles** so the score leads somewhere |
| **Resources** | Free e-books (Kids Story, Palestine: Land of Prophets) in an embedded reader, with like/heart |
| **Accessibility** | **Text size (A− / A+)**, **high-contrast mode**, **reader settings** (font, line spacing, reader text size) and **Listen — read articles aloud** with the device voice |
| **Services** | Full service list with one-tap booking via WhatsApp |
| **About** | Mission, vision, why-PRC points, **Meet Our Team** accordion |
| **More** | Helplines & emergency numbers, Ask a Question, language toggle, dark mode, install app, socials — with a single credit line: *Developed by mo digital · Version 1.4.0* |
| **Notifications** | In-app notification sheet — including a **daily streak motivator** ("Day 3 — keep going!" / "Your streak is at risk — read today") |
| **PWA** | Installable from **any page of the site** (manifest + service worker on every page), offline app shell, correct app icon on Android/iOS |

## 4. What changed in this round (v1.4.0)

1. **Removed the footer from all app screens** — the app now ends cleanly at the tab bar; the only credit line lives in the More tab.
2. **Article reader hardened** — site navigation, menus and footers are stripped the instant the page parses (no flash, even on slow networks), so reading is truly distraction-free.
3. **Home is now a "what next?" screen** — large greeting + *"What would you like to learn today?"*, plus a **Continue learning** card that picks up the last article.
4. **Daily learning streak** — 7 dots for the week + streak counter + in-app motivation notification.
5. **Quizzes now recommend resources** — every result suggests 3 related articles matched to the topic (personalised follow-up after each assessment).
6. **Quiz copy** changed from "3 min read" to **"It only takes 3 min"** (lower commitment, higher completion).
7. **Home quick actions** redesigned into a clear **2-column grid**.
8. **Whole-site installability** — the app can now be installed from the homepage, About, blogs, anywhere — not just the app page.
9. **Bookmark an exact line + like resources** — save a quote from any article and reopen it at that exact line; heart your favourite e-books; everything lives in a Saved & Liked library.
10. **Accessibility built in** — text size (A− / A+), high-contrast mode, reader comfort settings (font, spacing, size) and **Listen** (read articles aloud).
11. **Time-aware greetings** — good morning / good afternoon / a warm night greeting.

## 5. Proposed next — quick wins (days)

1. **Bookmark / Save for later** with a Saved tab (localStorage).
2. **Reading progress + auto-resume** in the reader (built on the new Continue card).
3. **Share article** button in the reader (Web Share API → WhatsApp / Facebook).
4. **"Talk to a coach" quick-call** — one tap opens WhatsApp with the team number.
5. **Structured mini-courses** — e.g. a "5-Day Listening Challenge": one short lesson per day, tied to the streak.

## 6. Accessibility menu — built in now, plus next ideas

**Already in the prototype:** language switching, dark mode, **text size (A− / A+)**, **high-contrast mode**, **reader comfort** (font, line spacing, reader text size) and **Listen — read articles aloud**.

Proposed next:
1. **Reduce motion toggle** — a manual switch to turn off animations/transitions (today it follows the system setting).
2. **Screen-reader announcements** (`aria-live`) for quiz results and notifications.
3. **Voice-navigation labels** for the tab bar.
4. **Larger touch targets (≥ 44px)** on every tab-bar and list item.
5. **Noto Nastaliq for all Urdu body copy** — consistent Urdu typography everywhere.

## 7. Learning features — built in now, plus next ideas

**Already in the prototype:** Continue learning (auto-resume), daily learning streak, **bookmark an exact line** in an article, **like resources**, and **personalised recommendations after each assessment**.

Proposed next:
1. **Reading progress bar** in the reader — see how far you are in each article.
2. **Share article** button in the reader (Web Share API → WhatsApp / Facebook).
3. **Structured mini-courses** — e.g. a "5-Day Listening Challenge": one short lesson per day, tied to the streak.
4. **Weekly goals & reminders** — set a goal (e.g. 3 articles/week); in-app reminders + streak keep it alive.
5. **Progress dashboard & badges** — streaks, articles read, assessments completed — a private "your growth" view.

## 8. Out of scope (by design, v1)

- No accounts, no cloud sync, no data collection — privacy is a selling point.
- No native iOS/Android stores in v1 — PWA install covers the audience and updates are instant.
- No in-app payments — bookings flow to WhatsApp/contact as today.

## 9. Why now

The website is already trusted by thousands of families. The app is the natural next step: **the same content, in a calmer, phone-first wrapper, reachable in one tap from the home screen — and installable from the site today.**

*Prototype is ready to review. Feedback welcome.*
