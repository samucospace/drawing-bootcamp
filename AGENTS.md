# AGENTS.md

This is an Expo/React Native mobile application (**30-Day Drawing Course**). Prioritize mobile-first patterns, offline-first reliability, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing any code that touches an Expo, EAS, or React Native API:

1. Check the `expo` version in `package.json` (currently `~58.0.26`).
2. Inspect the installed TypeScript declarations in `node_modules/<package>/build/*.d.ts` or fetch the matching versioned docs (`https://docs.expo.dev/versions/v58.0.0/` / `https://docs.expo.dev/llms.txt`).

### SDK 58 API Notes Used in This Repo
- **`expo-file-system`**: Uses the class-based API (`Paths.document`, `Paths.cache`, `new Directory(...)`, `new File(...)`, `file.copySync(...)`, `file.write(...)`, `file.text()`).
- **`expo-audio`**: Uses `useAudioPlayer(source)` (`player.seekTo(0)`, `player.play()`) instead of legacy `expo-av`.
- **`expo-notifications`**: Daily triggers use `type: SchedulableTriggerInputTypes.DAILY` with `{ hour, minute, channelId }`.
- **`expo-sqlite`**: Uses async API (`openDatabaseAsync`, `execAsync`, `getFirstAsync`, `getAllAsync`, `runAsync`, `withTransactionAsync`).

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm install for Expo/RN dependencies
npx expo start              # Start dev server
npm run typecheck           # Run TypeScript compiler check (tsc --noEmit)
npm test                    # Run Jest unit tests
npm run generate-assets     # Regenerate reference plates, icons, chime, and assetRegistry.ts
npx expo-doctor             # Diagnose dependency and config issues
```

Run `npm run typecheck` and `npm test` before declaring any task done.

## Project Structure & Navigation

- **Expo Router routes live in `app/`** (not `src/app/`):
  - `app/_layout.tsx` — Root Stack (`GestureHandlerRootView`, `SafeAreaProvider`, `AppDataProvider`)
  - `app/(tabs)/index.tsx` — Course Dashboard
  - `app/(tabs)/sketchbook.tsx` — Sketch Journal & Comparison View
  - `app/(tabs)/settings.tsx` — Reminders, Theme, JSON Backup, Cloud-Sync Metadata
  - `app/lesson/[day].tsx` — Daily Lesson Workspace (Theory 15m | Exercise 45m)
  - `app/viewer.tsx` — Fullscreen Reference Viewer Modal
- **Application modules live in `src/`**:
  - `src/curriculum/` — Static 30-day curriculum JSON, types, service, and static `assetRegistry.ts`
  - `src/db/` — SQLite database initialization and `PRAGMA user_version` migrations
  - `src/repositories/` — Abstract interfaces (`types.ts`) and SQLite implementations (`sqlite/`)
  - `src/domain/` — Pure business logic (`progressStats.ts`: streak, status derivation, backup validation)
  - `src/services/` — Device services (sketch image compression/storage, local notifications, JSON backup sharing/import)
  - `src/components/` — Reusable UI (`ConceptDiagram.tsx`, `SessionTimerBar.tsx`, `GridOverlay.tsx`)
  - `src/context/` & `src/theme/` — Reactive data provider and neutral Light/Dark themes
- Keep UI components decoupled from SQLite: always access persistence through `useAppData()` / repository interfaces.

## Native & Local Android APK Builds

- `android/` and `ios/` are generated via Continuous Native Generation (`npx expo prebuild --platform android`). They are gitignored—configure native permissions and plugins in `app.json`.
- **JDK:** Gradle requires **Java 21** (not Java 25) when building Android locally.
- **Windows MAX_PATH (Ninja):** On Windows, CMake/Ninja codegen object paths (e.g., `react-native-gesture-handler`) can exceed 260 characters unless `externalNativeBuild.cmake.buildStagingDirectory` is pointed to a short path (e.g., `CMAKE_STAGING_DIR=C:/cx`) and `arguments "-DCMAKE_OBJECT_PATH_MAX=230"` is configured.
- **Signing Secrets:** Never hardcode keystore passwords in `build.gradle` or commit `*.keystore` / `*.jks` files. Pass `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, and `RELEASE_KEY_PASSWORD` via environment variables or local Gradle properties outside git.
