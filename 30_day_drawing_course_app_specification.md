# Product & Technical Specification: 30-Day Drawing Course App

**Version:** 1.1 (Implemented v1.0 Architecture)  
**Target Platforms:** Android & iOS (Mobile-First)  
**Architecture Paradigm:** Offline-First / Local-First (Cloud-Ready)

---

## 1. Executive Summary & Vision

The **30-Day Drawing Course App** is a guided, distraction-free mobile companion designed to help artists build a daily 60-minute drawing habit. It delivers a structured curriculum covering foundational mark-making, perspective, portraiture, figure anatomy, and landscapes.

Each daily module splits into **15 minutes of theory & warm-up** and **45 minutes of deliberate practice**, accompanied by vector concept diagrams and studio-lit reference plates. All user progress and sketchbook photos are persisted locally on the device for immediate offline access without requiring an account, while the underlying repository and SQLite schema are structured for future cloud synchronization.

---

## 2. Implemented User Flows & Features

### 2.1 Zero-Friction Onboarding
* **No Account Required:** Users land directly on the curriculum without a login wall. An anonymous local `user_profile` record (UUID v4) is automatically provisioned on first launch.
* **Daily Habit Setup:** Dismissible prompt on the Course Dashboard to enable a daily 7:00 PM local reminder notification (`expo-notifications`), adjustable anytime in Settings.

### 2.2 Course Dashboard ([app/(tabs)/index.tsx](app/(tabs)/index.tsx))
* **Overall Progress Card:** Progress bar (`X / 30 Days Completed`), current consecutive daily streak, and total logged practice hours.
* **Quick Resume CTA:** Prominent button jumping directly to the next uncompleted day (`/lesson/[day]`).
* **Structured Curriculum Map:** Collapsible sections across all 30 days:
  * **Week 1 (Days 1–7):** Line, Form & Perspective
  * **Week 2 (Days 8–14):** Faces & Expressions
  * **Week 3 (Days 15–21):** Bodies, Anatomy & Movement
  * **Week 4 (Days 22–28):** Landscapes & Composition
  * **Capstone Projects (Days 29–30):** Narrative & Environmental Pieces
* **Flexible Navigation:** Users can open any day freely, revisit completed days, or jump ahead.

### 2.3 Daily Lesson Workspace ([app/lesson/[day].tsx](app/lesson/%5Bday%5D.tsx))
Each day is organized into two segmented tabs plus a persistent bottom session timer:
1. **Theory (15m):**
   * Core concept summary and scannable key points.
   * **Expandable Concept Diagrams:** Crisp, theme-aware vector diagrams (`src/components/ConceptDiagram.tsx`) supporting tap-to-expand modal view.
   * 15-minute warm-up drill prompt and completion toggle.
2. **Exercise (45m):**
   * Step-by-step deliberate practice instructions.
   * **Reference Image Gallery:** Horizontally scrollable cards opening the Fullscreen Reference Viewer at the selected index.
   * Completion toggle, auto-saving self-reflection notes, and a **Log Your Sketchbook Photo** button.

### 2.4 Fullscreen Interactive Reference Viewer ([app/viewer.tsx](app/viewer.tsx))
* **Pinch-to-Zoom, Pan & Double-Tap Reset:** Smooth gesture handling (`react-native-gesture-handler` + `react-native-reanimated`) with a **Lock Zoom/Pan** toggle to prevent accidental shifts while drawing.
* **Keep Screen Awake:** Automatically prevents the screen from sleeping while viewing references (`expo-keep-awake`).
* **Value Check (Grayscale Toggle):** One-tap toggle switching instantaneously to exact-luminance (`0.299R + 0.587G + 0.114B`) grayscale twin plates.
* **Composition Grid Overlay:** Cycles `Off` → `3×3 Rule of Thirds` → `Center Crosshairs` via `src/components/GridOverlay.tsx`.
* **Fullscreen Mini-Timer & Gallery Controls:** Next/Previous navigation and a compact timer pill supporting standard countdowns and **Interval Mode** auto-advancing.

### 2.5 Built-In Session Timers ([src/components/SessionTimerBar.tsx](src/components/SessionTimerBar.tsx))
* **Presets:** One-tap `15m Warm-up`, `45m Exercise`, and configurable `Interval` mode (e.g., Day 15's `20 × 60s` gesture pose rounds).
* **Wall-Clock Accuracy:** Uses `endTimeMs` timestamp math so backgrounding the app does not drift.
* **Feedback & Logging:** Plays bundled [assets/sounds/chime.wav](assets/sounds/chime.wav) (`expo-audio`) + haptic feedback (`expo-haptics`), keeps the screen awake while running, and persists logged seconds to `day_progress.time_spent_seconds`.

### 2.6 My Sketchbook ([app/(tabs)/sketchbook.tsx](app/(tabs)/sketchbook.tsx))
* **Capture & Compression:** Camera or photo library capture via `expo-image-picker`, resized to max width `1600px` and compressed to JPEG (`0.82`) via `expo-image-manipulator`, then persisted in `${Paths.document}/sketches/` via `expo-file-system`.
* **Gallery & Filters:** 2-column chronological grid filterable by week (`All`, `Week 1`–`Week 4`, `Capstone`), fullscreen viewer with reflection notes, and soft-delete support.
* **Progress Comparison:** Side-by-side comparison modal contrasting the earliest vs. latest uploaded sketches (e.g., Day 1 vs. Day 30).

### 2.7 Settings & Local Backup ([app/(tabs)/settings.tsx](app/(tabs)/settings.tsx))
* Daily reminder toggle and 30-minute time stepper (`expo-notifications`).
* Default **Keep Screen Awake** toggle and neutral Canvas Theme selector (`System`, `Light` warm off-white, `Dark` neutral charcoal).
* **Portable JSON Backup:** Export (`expo-sharing`) and Import (`expo-document-picker`) of `BackupPayloadV1` using Last-Write-Wins merge semantics based on `updated_at`.
* **Cloud Sync (V2 Ready):** Displays local anonymous `device_user_id` and pending-sync record count.

---

## 3. Technical Architecture (Local-First, Cloud-Ready)

### 3.1 Implemented Tech Stack
* **Framework:** React Native `0.88.1`, React `19.3.0`, Expo SDK `58` (`~58.0.26`), TypeScript `~6.0.3`
* **Navigation:** `expo-router` (`app/` root with `(tabs)` navigator, `lesson/[day]`, and `viewer` fullscreen modal)
* **Local Relational Database:** `expo-sqlite` (`openDatabaseAsync('drawing_bootcamp.db')`) with `PRAGMA user_version` migrations
* **Local Media & File Storage:** `expo-file-system` (`Paths`, `Directory`, `File`), `expo-image-picker`, `expo-image-manipulator`
* **Gestures & Graphics:** `react-native-gesture-handler`, `react-native-reanimated`, `react-native-svg`
* **Device Utilities:** `expo-keep-awake`, `expo-audio`, `expo-haptics`, `expo-notifications`, `expo-sharing`, `expo-document-picker`, `expo-crypto`
* **Testing:** `jest` + `ts-jest`

### 3.2 Cloud-Readiness Strategy (Repository Pattern)
1. **Abstract Data Interfaces ([src/repositories/types.ts](src/repositories/types.ts)):** UI components interact through `AppDataContext` (`src/context/AppDataContext.tsx`) backed by `IProfileRepository`, `IProgressRepository`, and `ISketchRepository`.
2. **Client-Generated UUIDs:** Mutable records generate UUID v4 primary keys on device via `expo-crypto` (`Crypto.randomUUID()`).
3. **Sync Metadata Columns:** User tables carry `updated_at` (ISO-8601 UTC), `deleted_at` (soft-delete on `sketch_uploads`), and `sync_status` (`'local_only' | 'pending' | 'synced'`).
4. **Static vs. Mutable Separation:** Curriculum content lives in versioned JSON (`src/curriculum/curriculum.json`) while user state lives in SQLite.
5. **Pure Domain Layer ([src/domain/progressStats.ts](src/domain/progressStats.ts)):** Status derivation (`deriveDayStatus`), streak/hour calculations (`computeCourseStats`), and backup validation (`validateBackupPayload`) live in pure TypeScript modules independent of SQLite or React Native.

---

## 4. Data Models

### 4.1 Static Curriculum Schema ([src/curriculum/curriculum.json](src/curriculum/curriculum.json))
All 30 days are bundled statically and resolved at runtime via [src/curriculum/curriculumService.ts](src/curriculum/curriculumService.ts) and [src/curriculum/assetRegistry.ts](src/curriculum/assetRegistry.ts).

```json
{
  "course_version": "1.0.0",
  "title": "30-Day Drawing Course",
  "days": [
    {
      "day_number": 8,
      "week": 2,
      "week_title": "Faces & Expressions",
      "title": "The Loomis Head Construction",
      "theory": {
        "duration_minutes": 15,
        "summary": "...",
        "key_points": ["..."],
        "warmup_drill": "...",
        "concept_images": [
          {
            "id": "day08_concept_01",
            "diagram_id": "loomis_head_steps",
            "caption": "4-step construction of the Loomis head in 3/4 view."
          }
        ]
      },
      "exercise": {
        "duration_minutes": 45,
        "instructions": "...",
        "timer_mode": "standard",
        "interval_seconds": null,
        "reference_images": [
          {
            "id": "day08_ref_01",
            "asset_id": "ref_09_loomis_3q_up",
            "title": "Planar Head — 3/4 Up",
            "attribution": "Studio Render (CC0)",
            "tags": ["3/4 view", "looking up"]
          }
        ]
      }
    }
  ]
}
```

### 4.2 Mutable User Progress Schema ([src/db/database.ts](src/db/database.ts))

#### Table: `user_profile`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | Client-generated UUID v4. |
| `reminder_enabled` | `INTEGER` | `0` or `1`. |
| `reminder_time` | `TEXT` | Local `HH:MM` string (default `'19:00'`). |
| `keep_awake_default` | `INTEGER` | `0` or `1` (default `1`). |
| `theme_preference` | `TEXT` | `'system'`, `'light'`, or `'dark'`. |
| `onboarding_dismissed` | `INTEGER` | `0` or `1`. |
| `created_at` | `TEXT` | ISO-8601 UTC timestamp. |
| `updated_at` | `TEXT` | ISO-8601 UTC timestamp. |

#### Table: `day_progress`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | Client-generated UUID v4. |
| `user_id` | `TEXT` | Foreign key to `user_profile.id`. |
| `day_number` | `INTEGER` | `1`–`30` (`UNIQUE(user_id, day_number)`). |
| `theory_completed` | `INTEGER` | `0` or `1`. |
| `exercise_completed` | `INTEGER` | `0` or `1`. |
| `status` | `TEXT` | `'not_started'`, `'in_progress'`, or `'completed'`. |
| `time_spent_seconds` | `INTEGER` | Cumulative logged practice seconds. |
| `user_notes` | `TEXT` | Reflection notes. |
| `completed_at` | `TEXT` | Nullable ISO-8601 completion timestamp. |
| `updated_at` | `TEXT` | ISO-8601 timestamp for Last-Write-Wins sync. |
| `sync_status` | `TEXT` | `'local_only'`, `'pending'`, or `'synced'`. |

#### Table: `sketch_uploads`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | Client-generated UUID v4. |
| `day_progress_id` | `TEXT` | Foreign key to `day_progress.id`. |
| `day_number` | `INTEGER` | `1`–`30` for fast day/week filtering. |
| `local_file_uri` | `TEXT` | Local compressed JPEG URI in app documents. |
| `remote_file_url` | `TEXT` | Nullable remote URL for future cloud storage. |
| `created_at` | `TEXT` | ISO-8601 capture timestamp. |
| `deleted_at` | `TEXT` | Nullable soft-delete timestamp. |
| `sync_status` | `TEXT` | `'local_only'`, `'pending'`, or `'synced'`. |

---

## 5. Visual & Audio Asset Pipeline

All bundled assets are original and generated deterministically via [scripts/generate-assets.mjs](scripts/generate-assets.mjs) (`npm run generate-assets`) using zero external dependencies:
* **Concept Diagrams:** 30 theme-aware SVG diagrams rendered by `src/components/ConceptDiagram.tsx`.
* **Reference Plates:** 40 studio-lit/raymarched `640×640` PNG plates + 40 exact-luminance grayscale twin PNGs (`assets/references/`, ~19.3 MB total) indexed in `src/curriculum/assetRegistry.ts`.
* **Audio & Branding:** Harmonic bell chime (`assets/sounds/chime.wav`) and adaptive app icons/splash (`assets/images/`).

---

## 6. Roadmap Status

* **Phase 1 (Local MVP) — Completed (v1.0):** SQLite schema + repository layer, full 30-day curriculum, concept diagrams, Dashboard, Lesson View, Fullscreen Reference Viewer (zoom/pan/lock/keep-awake), 15m/45m/Interval timers, and JSON backup export/import.
* **Phase 2 (Artist Utilities & Retention) — Completed (v1.0):** Grayscale Value Check toggle, 3×3 / Crosshair grid overlays, Sketchbook photo capture + chronological gallery + Day 1 vs. Day 30 comparison, and daily local notification reminders.
* **Phase 3 (Cloud Scale & Community) — Planned (v2):** Optional authentication, remote sync implementation of `IProfileRepository` / `IProgressRepository` / `ISketchRepository`, cloud object storage for `sketch_uploads.remote_file_url`, and multi-device sync.
