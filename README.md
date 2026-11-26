# 30-Day Drawing Course

An offline-first, mobile-first **30-Day Drawing Course** companion app built with **Expo (React Native)**, **TypeScript**, and **SQLite**. Designed to help artists build a consistent 60-minute daily drawing habit (`15 min` theory & warm-up + `45 min` deliberate practice) without accounts, subscriptions, or internet requirements.

---

## Features

- **Zero-Friction Offline Start:** Launches straight into the curriculum with a locally generated anonymous UUID profile—no login wall.
- **Structured 30-Day Curriculum:**
  - **Week 1 (Days 1–7):** Line, Form & Perspective
  - **Week 2 (Days 8–14):** Faces & Expressions
  - **Week 3 (Days 15–21):** Bodies, Anatomy & Movement (includes Day 15 timed gesture interval training)
  - **Week 4 (Days 22–28):** Landscapes & Composition
  - **Capstone (Days 29–30):** Narrative & Environmental Studies
- **Vector Concept Diagrams:** 30 theme-aware SVG instructional diagrams (`react-native-svg`) with tap-to-expand view.
- **Bundled Studio Reference Plates:** 40 original raymarched/shaded reference images plus 40 exact-luminance grayscale twins for 100% offline practice.
- **Interactive Fullscreen Reference Viewer:**
  - Pinch-to-zoom, pan, and double-tap reset with a **Zoom/Pan Lock** toggle
  - Instant **Grayscale (Value Check)** toggle
  - **Composition Grid Overlay** (`Off` → `3×3 Rule of Thirds` → `Center Crosshairs`)
  - **Keep Screen Awake** lock while drawing
  - Built-in mini timer with **Interval Mode** auto-advancing across poses
- **Wall-Clock Session Timers:** `15m Warm-up`, `45m Exercise`, and `Interval` timers using timestamp math (drift-free when backgrounded), harmonic completion chime, haptic feedback, and automatic practice time logging.
- **My Sketchbook:** Photograph or import your daily physical drawings (auto-resized & compressed locally), filter by week, view reflection notes, and compare **Earliest vs. Latest** sketches (e.g., Day 1 vs. Day 30).
- **Daily Habit Reminders & JSON Backup:** Local daily notification reminders (`expo-notifications`), neutral Light/Dark canvas themes, and portable `.json` export/import with Last-Write-Wins merge semantics ready for future v2 cloud sync.

---

## Tech Stack

- **Framework:** React Native `0.88` + Expo SDK `58` + Expo Router (`app/`)
- **Language:** TypeScript `6`
- **Persistence:** `expo-sqlite` (versioned migrations + Repository pattern) & `expo-file-system`
- **Media & Gestures:** `react-native-gesture-handler`, `react-native-reanimated`, `react-native-svg`, `expo-image-picker`, `expo-image-manipulator`
- **Device Services:** `expo-audio`, `expo-keep-awake`, `expo-haptics`, `expo-notifications`, `expo-sharing`, `expo-document-picker`, `expo-crypto`
- **Testing:** Jest + `ts-jest`

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- Expo Go or Android SDK (for local native builds)

### Install & Run

```bash
npm install
npx expo start
```

### Verify & Regenerate Assets

```bash
npm run typecheck        # TypeScript check (tsc --noEmit)
npm test                 # Jest unit tests (curriculum, streaks, status transitions, backup validation)
npm run generate-assets  # Regenerate bundled icons, chime.wav, and 80 reference PNGs
```

---

## Building a Signed Android APK Locally

1. Generate a local release keystore (kept outside git):
   ```bash
   mkdir -p android-signing
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore android-signing/release.keystore \
     -alias drawing-bootcamp-key \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Generate native Android files:
   ```bash
   npx expo prebuild --platform android
   ```
3. Build the release APK with **Java 21** and signing environment variables:
   ```powershell
   $env:JAVA_HOME = "C:\path\to\jdk-21"
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:CMAKE_STAGING_DIR = "C:/cx"  # Avoids Windows 260-char Ninja path limits
   $env:RELEASE_STORE_FILE = "../../android-signing/release.keystore"
   $env:RELEASE_STORE_PASSWORD = "your-keystore-password"
   $env:RELEASE_KEY_ALIAS = "drawing-bootcamp-key"
   $env:RELEASE_KEY_PASSWORD = "your-key-password"

   cd android
   .\gradlew.bat assembleRelease
   ```
4. Output APK: `android/app/build/outputs/apk/release/app-release.apk`.

---

## Project Structure

```text
drawing-bootcamp/
├── app/                   # Expo Router screens ((tabs), lesson/[day], viewer)
├── src/
│   ├── components/        # ConceptDiagram, SessionTimerBar, GridOverlay
│   ├── context/           # AppDataContext (reactive repository state)
│   ├── curriculum/        # curriculum.json, types, curriculumService, assetRegistry
│   ├── db/                # SQLite initialization & migrations
│   ├── domain/            # Pure streak, status & backup validation logic
│   ├── repositories/      # Abstract interfaces + SQLite implementations
│   ├── services/          # Sketch storage, notifications, JSON backup
│   └── theme/             # Neutral paper-light & charcoal-dark palettes
├── assets/                # Generated app icons, chime.wav, and reference PNGs
├── scripts/               # Deterministic Node.js asset generator
└── 30_day_drawing_course_app_specification.md
```

---

## License & Asset Attribution

- **Source Code:** Licensed under the [MIT License](LICENSE) — Copyright (c) 2026 Sam Fraser.
- **Bundled Visual & Audio Assets:** All reference plates (`assets/references/`), app icons (`assets/images/`), SVG concept diagrams (`src/components/ConceptDiagram.tsx`), and the timer chime (`assets/sounds/chime.wav`) are original assets programmatically generated for this project with no external third-party copyright restrictions.
