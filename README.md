# VitalFlow 🫀

**AI-assisted health monitoring and heart attack risk alerts**, built with React Native, Expo Router and Supabase.

VitalFlow reads vital signs from a wearable device (heart rate, SpO2, body temperature and sweat/GSR), stores them in Supabase, and turns them into a live dashboard, trend analytics, a risk score and real-time alerts. It also keeps the user's medical records and an emergency Medical ID QR code ready for first responders.

It runs on **Android, iOS and the web**. With no backend configured it starts in **demo mode**, with a built-in sensor simulator, so you can try every screen right away.

---

## ✨ Features

### Live monitoring
- Real-time heart rate, SpO2, body temperature and sweat level, with animated metric cards
- Heart attack risk level (Low / Medium / High) from the model output stored with each reading
- One-tap **Emergency SOS** that calls the right emergency number for the user's country

### Analytics
- Heart rate, SpO2, temperature and risk trends for 24H, 7D, 30D and 3M
- Health summary: average heart rate, high-risk events, health score and heart rate trend

### Alerts
- Alerts are created automatically from abnormal readings (vital-sign thresholds and AI risk)
- Severity levels (critical, high, medium, low) and types (vital, risk, emergency, system)
- Search, filter, mark as read, snooze, delete and clear all
- Unread badge on the bottom navigation bar
- Duplicate protection: each reading is checked once, and a repeating condition raises one alert per 5 minutes

### Health & emergency
- Emergency contacts with one-tap calling
- Medications, medical conditions and allergies (add / edit / delete)
- Nearby hospitals map (OpenStreetMap / Overpass), with directions and calling
- **Medical ID QR code**: save it as an image, or share a readable medical summary

### Profile
- Personal and medical profile, insurance and organ donor status
- Profile photo upload
- Notification and data-sharing preferences, saved per user

---

## 🛠️ Tech stack

| Area | Technology |
|------|------------|
| App | React Native 0.81, Expo SDK 54, Expo Router 6 |
| Language | JavaScript / JSX, some TypeScript |
| Backend | Supabase (Postgres, Auth, Realtime, Storage) |
| Maps | react-native-maps (native), Leaflet/OpenStreetMap (web) |
| UI | expo-linear-gradient, @expo/vector-icons, react-native-chart-kit, react-native-qrcode-svg |
| Device | expo-location, expo-notifications, expo-camera, expo-image-picker, expo-sharing |

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js 20 or newer
- The **Expo Go** app on your phone, or an Android emulator / iOS simulator (optional)

### 2. Install
```bash
git clone https://github.com/<your-username>/VitalFlow.git
cd VitalFlow
npm install
```

### 3. Run
```bash
npm start        # then scan the QR code with Expo Go, or press a / i / w
npm run web      # open directly in the browser
npm run android  # Android emulator or device
```

Without a `.env` file the app runs in **demo mode**:
- Sign up with any email and password. Accounts and data are stored only on the device.
- Demo profile, contacts, medications and 30 days of history are created for each new account.
- A simulated sensor sends a new reading every 5 seconds. About every 2 minutes it simulates a short stress episode, so you can watch the risk level and the alerts react.

### 4. Connect Supabase (real data)
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it. This creates the tables, Row Level Security policies, the `avatars` storage bucket and realtime publication. It is safe to re-run.
3. Copy `.env.example` to `.env` and fill in your values from **Project Settings → API**:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key   # only for native production builds
   ```
4. For instant sign-up, turn off **Authentication → Providers → Email → Confirm email**, or confirm users by email.
5. Restart with `npx expo start -c`.

### 5. Sending device readings
Your wearable or gateway inserts rows into `public.health_readings` for the signed-in user:

| Column | Type | Meaning |
|--------|------|---------|
| `user_id` | uuid | Owner (Supabase auth user id) |
| `heart_rate` | integer | Beats per minute |
| `spo2` | numeric | Oxygen saturation, % |
| `temperature` | numeric | Body temperature, **°C** (shown in °F in the app) |
| `gsr_value` | numeric | Galvanic skin response (sweat) |
| `heart_attack_risk` | numeric | Model output from 0 to 1 |
| `latitude`, `longitude` | double | Optional location |

The app picks up new rows instantly through Supabase Realtime, and polls as a fallback.

---

## 🎯 Alert thresholds

| Metric | Normal | Alert raised when |
|--------|--------|-------------------|
| Heart rate | 60 to 100 BPM | below 60 or above 130 (medium), 50/150 (high), 40/180 (critical) |
| SpO2 | 95 to 100% | below 92% (medium), 90% (high), 85% (critical) |
| Temperature | 36.0 to 38.5 °C | outside 36.0 to 38.5 (medium), 35.5 to 39.0 (high), 35.0 to 40.0 (critical) |
| Heart attack risk | below 50% | 50% (medium), 65% (high), 80% (critical) |

---

## 📁 Project structure

```
app/                Expo Router screens (signin, signup, home, analytics, health, alerts, profile)
components/         Screen components, modals, navbar, hospital map
hooks/              Data hooks: auth, health data, alerts, alert generation, profile, records
lib/
  supabase.js       Supabase client (native); falls back to demo mode without keys
  supabase.web.js   Supabase client (web)
  mockSupabase.js   Demo mode: local database, realtime events, sensor simulator
  notifications.ts  Local push notification helpers
supabase/schema.sql Database schema, RLS policies, storage and realtime setup
utils/              Emergency numbers by country
```

---

## 🧪 Scripts

| Command | What it does |
|---------|--------------|
| `npm start` | Start the Expo dev server |
| `npm run web` | Run in the browser |
| `npm run android` / `npm run ios` | Run on a device or emulator |
| `npm run lint` | Lint the project |

---

## ⚠️ Disclaimer

VitalFlow is an academic project. It is **not a medical device** and must not be used for diagnosis or to replace professional medical care. In an emergency, call your local emergency number.
