# 🌺 Delusional Leap

<img width="1600" height="897" alt="image" src="https://github.com/user-attachments/assets/488fbfd0-3d02-4bcb-944a-c3b77109303f" />


**The app that turns Gabby Beckford's 1M+ inspired scrollers into daily action-takers.**

3 Moves a day. AI-verified. Dreams tracked. Powered by RevenueCat.

> Built for [RevenueCat Shipyard 2026](https://www.revenuecat.com/shipyard/) — Gabby Beckford, Brief #3

[![Dashboard](https://img.shields.io/badge/Dashboard-Live-FF3366?style=for-the-badge)](https://delusional-leap.vercel.app)
[![APK](https://img.shields.io/badge/Android-APK-1B0A2E?style=for-the-badge)](https://expo.dev/accounts/sahu-01/projects/delusional_leap/builds/c5a98f44-5b41-4759-b773-c058025850c0)
[![Play Store](https://img.shields.io/badge/Google_Play-Internal_Testing-green?style=for-the-badge)](https://play.google.com/apps/internaltest/4701453601381704594)

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [RevenueCat Implementation](#-revenuecat-implementation)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Privacy & Security](#-privacy--security)
- [Roadmap](#-roadmap)
- [Built By](#-built-by)

---

## 🎯 The Problem

Gabby Beckford's audience of 1M+ followers saves her posts, screenshots her tips, gets inspired and then does nothing. The gap between inspiration and action is where dreams go to die. No existing goal app provides real accountability through verified proof of completion.

## 💡 The Solution

Delusional Leap breaks dreams into 3 daily micro-actions called **Moves**:

| Move Type | Points | Difficulty | Verification |
|-----------|--------|------------|--------------|
| ⚡ Quick Move | +1 | 2-5 min | Self-reported |
| 🔥 Power Move | +3 | 15-30 min | Photo proof |
| 👑 Boss Move | +10 | The scary one | AI-verified |

Swipe up to complete. Confetti every time. AI checks your proof. No faking it.

**Plus** — Gabby gets her own Creator Dashboard to manage tasks, create sponsored challenges, view analytics, and export brand reports. This isn't just an app — it's a business.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile App** | React Native + Expo | Cross-platform mobile app |
| **Language** | TypeScript | Type-safe development |
| **State Management** | Zustand + AsyncStorage | Local state + persistence |
| **Backend** | Supabase (PostgreSQL) | Database, auth, realtime |
| **Creator Dashboard** | Next.js 14 + Tailwind CSS | Gabby's admin panel |
| **Monetization** | RevenueCat SDK | Subscriptions + consumables |
| **AI Verification** | OpenRouter (Llama 3.1 8B) | Boss Move proof verification |
| **Hosting** | Vercel | Dashboard deployment |
| **Build** | EAS Build | Android APK/AAB generation |
| **Design** | Fraunces + Sora fonts | Typography |

### Key Libraries

```
react-native-confetti-cannon  — celebration animations
react-native-view-shot        — Win Card image generation
expo-image-picker              — photo proof capture
expo-haptics                   — tactile feedback
expo-sharing                   — native share sheet
react-native-reanimated        — smooth animations
@supabase/supabase-js          — database client
react-native-purchases          — RevenueCat SDK
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DELUSIONAL LEAP                       │
├─────────────────────┬───────────────────────────────────┤
│                     │                                   │
│   📱 Mobile App     │   💻 Creator Dashboard            │
│   (React Native)    │   (Next.js 14)                    │
│                     │                                   │
│   • Onboarding      │   • Overview & Stats              │
│   • Daily Moves     │   • User Management               │
│   • Card Fan UI     │   • Task Management (CRUD)        │
│   • AI Verification │   • Sponsored Challenges          │
│   • Paywall         │   • Analytics & Charts            │
│   • Win Cards       │   • Brand Report Export           │
│   • Profile         │   • Real-time Updates             │
│                     │                                   │
├─────────────────────┴───────────────────────────────────┤
│                                                         │
│                  🗄 Supabase Backend                     │
│                                                         │
│   Tables: users, daily_tasks, sponsored_challenges,     │
│           move_completions, streaks                      │
│   Features: PostgreSQL, Realtime, RLS, REST API         │
│                                                         │
├─────────────────────┬───────────────────────────────────┤
│                     │                                   │
│   💰 RevenueCat     │   🤖 OpenRouter                   │
│   (Monetization)    │   (AI Verification)               │
│                     │                                   │
│   • Subscriptions   │   • Llama 3.1 8B                  │
│   • Consumables     │   • Proof text analysis           │
│   • Entitlements    │   • PII stripped before send      │
│   • Paywall         │   • Offline fallback              │
│                     │                                   │
└─────────────────────┴───────────────────────────────────┘
```

### Data Flow

1. **User opens app** → Onboarding collects dream, blocker, pace → saved to Zustand + Supabase
2. **Daily Moves generated** → based on user's dream category + Gabby's dashboard tasks
3. **Move completion** → proof submitted → AI verifies (Boss Moves) → confetti → points awarded
4. **3rd Move completed** → Custom paywall triggers at peak dopamine moment
5. **Gabby adds task on dashboard** → Supabase Realtime → appears on user's phone instantly
6. **Sponsored challenge created** → branded card appears above regular moves on mobile

---

## 💰 RevenueCat Implementation

### 12 Features Integrated

| # | Feature | Implementation |
|---|---------|---------------|
| 1 | **SDK Initialization** | `Purchases.configure()` on app launch with platform-specific API key |
| 2 | **Entitlements** | `"Delusional Leap Pro"` gates premium features |
| 3 | **Offerings** | Default offering with 3 packages |
| 4 | **Products** | Monthly ($4.99), Yearly ($39.99), Lifetime ($79.99) |
| 5 | **Custom Paywall** | Full-screen branded paywall with hibiscus gradient |
| 6 | **Free Trial** | 7-day trial on monthly plan |
| 7 | **Strategic Placement** | Paywall triggers after 3rd Move completion (peak dopamine) |
| 8 | **Customer Center** | Subscription management in Profile tab |
| 9 | **Restore Purchases** | One-tap restore in Profile tab |
| 10 | **Consumables** | Streak Freeze ($0.99) — protect your streak |
| 11 | **Premium Gating** | Free: 3 moves/day, Premium: unlimited |
| 12 | **Customer Info Listener** | Real-time subscription status via `addCustomerInfoUpdateListener` |

<img width="589" height="1280" alt="image" src="https://github.com/user-attachments/assets/018f41fe-328c-4584-809f-e582c8a3ddde" />


### Paywall Strategy

```
User Flow:
Open App → Onboarding → Daily Moves → Complete Move 1 ✅ → Confetti 🎉
→ Complete Move 2 ✅ → Confetti 🎉
→ Complete Move 3 ✅ → Confetti 🎉 → 🔥 PAYWALL APPEARS

Why here? The user just experienced three wins in a row.
Dopamine is peaking. They WANT more. This is the moment
they're most likely to convert.
```

### RevenueCat Configuration

```typescript
// lib/revenuecat.ts
import Purchases from 'react-native-purchases';

// Initialize on app start
Purchases.configure({
  apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
});

// Check entitlements
const customerInfo = await Purchases.getCustomerInfo();
const isPremium = customerInfo.entitlements.active['Delusional Leap Pro'] !== undefined;

// Present offerings
const offerings = await Purchases.getOfferings();
const packages = offerings.current?.availablePackages;

// Purchase
const { customerInfo } = await Purchases.purchasePackage(selectedPackage);

// Restore
const customerInfo = await Purchases.restorePurchases();
```

### Product Catalog

| Product | Price | Type | Trial |
|---------|-------|------|-------|
| Monthly Pro | $4.99/mo | Auto-renewable | 7-day free |
| Yearly Pro | $39.99/yr | Auto-renewable | — |
| Lifetime Pro | $79.99 | Non-consumable | — |
| Streak Freeze | $0.99 | Consumable | — |

---

## ✨ Features

### Mobile App
- **7-screen onboarding** — conversational, quiz-style, feels like talking to a friend
- **Card fan UI** — 3 cards in poker hand layout, swipe to browse, swipe up to complete
- **AI proof verification** — Boss Moves verified by Llama 3.1 via OpenRouter
- **Confetti celebrations** — full-screen explosion on every move completion
- **Custom paywall** — branded, strategic placement at moment of delight
- **Win Cards** — shareable 1080x1920 milestone images with @delusionalleap branding
- **Streak tracking** — daily streak counter with freeze protection
- **Milestone stamps** — Explorer (10), Trailblazer (25), Pathfinder (50), Main Character (100)
- **Vision board** — animated grid that fills as moves complete

### Creator Dashboard
- **Overview** — total users, active users, completion rates, revenue metrics
- **User management** — searchable table of all users with activity data
- **Task management** — add/edit/delete daily tasks by tier (Quick/Power/Boss)
- **Sponsored challenges** — create brand-aligned 7-day challenges with budget tracking
- **Analytics** — charts for completion trends, category breakdown, user growth
- **Brand reports** — exportable PDF/CSV reports for sponsorship deals
- **Real-time sync** — Supabase Realtime pushes dashboard changes to mobile instantly

---

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18
npm >= 9
expo-cli
eas-cli
```

### Installation

```bash
# Clone the repo
git clone https://github.com/SAHU-01/delusional_leap.git
cd delusional_leap

# Install mobile app dependencies
npm install

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

### Environment Variables

Create a `.env` file in the root:

```env
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_key
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=Delusional Leap Pro
EXPO_PUBLIC_BUNDLE_ID=com.sahu01.delusionalleap
EXPO_PUBLIC_OPENROUTER_API_KEY=your_openrouter_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create a `.env.local` file in `/dashboard`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Locally

```bash
# Mobile app (Expo Go)
npx expo start

# Dashboard (Next.js)
cd dashboard
npm run dev
```

### Build APK

```bash
eas build --platform android --profile preview
```

### Build AAB (Play Store)

```bash
eas build --platform android --profile production
```

---

## 📁 Project Structure

```
delusional_leap/
├── app/                    # Expo Router pages
│   ├── (tabs)/             # Tab navigation
│   │   ├── index.tsx       # Today tab (Daily Moves)
│   │   ├── dream.tsx       # Dream tab (Vision Board)
│   │   └── profile.tsx     # Profile tab (Settings)
│   └── _layout.tsx         # Root layout
├── components/             # Reusable components
│   ├── CustomPaywall.tsx   # RevenueCat paywall UI
│   ├── MoveCard.tsx        # Individual move card
│   ├── WinCard.tsx         # Shareable milestone card
│   └── SponsoredChallengeCard.tsx
├── lib/
│   ├── revenuecat.ts       # RevenueCat configuration
│   └── supabase.ts         # Supabase client + queries
├── store/
│   └── useStore.ts         # Zustand state management
├── constants/
│   └── theme.ts            # Colors, fonts, spacing
├── screens/
│   └── Onboarding.tsx      # 7-screen onboarding flow
├── dashboard/              # Next.js Creator Dashboard
│   ├── app/                # Next.js pages
│   │   ├── page.tsx        # Overview
│   │   ├── users/          # User management
│   │   ├── tasks/          # Task management
│   │   ├── challenges/     # Sponsored challenges
│   │   ├── analytics/      # Charts & metrics
│   │   └── reports/        # Brand report export
│   └── components/         # Dashboard components
├── assets/                 # Images, fonts
├── eas.json                # EAS Build configuration
├── app.json                # Expo configuration
└── supabase-schema.sql     # Database schema
```

---

## 🗄 Database Schema (Supabase)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT,
  dream_category TEXT,
  blocker TEXT,
  pace TEXT,
  bucket_list_item TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily tasks (managed by Gabby via dashboard)
CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  tier TEXT CHECK (tier IN ('quick', 'power', 'boss')),
  category TEXT,
  points INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sponsored challenges
CREATE TABLE sponsored_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  brand_name TEXT,
  description TEXT,
  tier TEXT,
  budget NUMERIC,
  duration_days INTEGER DEFAULT 7,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔒 Privacy & Security

- **AI Verification:** Proof text is stripped of personally identifiable information before being sent to OpenRouter. Raw data never leaves the device unprocessed.
- **Data Storage:** All user data stored on Supabase with encryption at rest and Row Level Security policies.
- **Payments:** Handled entirely by RevenueCat + Google Play. We never access payment information.
- **Future:** TEE (Trusted Execution Environments) for zero-knowledge proof verification at scale.
- **Privacy Policy:** [delusional-leap.vercel.app/privacy.html](https://delusional-leap-dashboard.vercel.app/privacy.html)

---

## 🗺 Roadmap

- [ ] H100 GPUs running open-source AI for verification at scale
- [ ] TEE integration for zero-knowledge privacy
- [ ] Brand analytics without collecting personal info
- [ ] iOS App Store release
- [ ] Gabby onboarding — guided creator setup
- [ ] Scaling app to accomodate more users without friction

---

## 🌺 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Deep Plum | `#1B0A2E` | Background |
| Hibiscus Coral | `#FF3366` | Primary accent |
| Cream | `#FFFBF5` | Text |
| Sunset Orange | `#FF9B4E` | Secondary accent |
| Headline Font | Fraunces | Display text |
| Body Font | Sora | UI text |

---

## 👩‍💻 Built By

**Ankita Sahu** — Software Engineer, 24, India

- GitHub: [@SAHU-01](https://github.com/SAHU-01)
- Email: sahuankitaofc.1@gmail.com

> "Smart women don't need more inspiration. They need someone to say; stop saving, start moving."

---

*Built with 🌺 for RevenueCat Shipyard 2026 — Gabby Beckford, Brief #3*
