# Onboarding Personalization Sequence Diagram

## Scope
- Diagram ini memodelkan alur setelah user sudah punya session aktif dan mencoba masuk ke area aplikasi.
- Diagram mencakup dua kondisi: user yang sudah selesai onboarding dan user yang masih perlu onboarding personalization.
- Flow login sengaja tidak diulang di sini; titik awalnya adalah `session established`.
- Detail khusus `AI normalization -> user confirmation -> learner profile update` dipecah lagi ke diagram `ARCH-07`.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    participant App as Web App / App Router
    participant Users as Users Module
    participant Personalization as Personalization Module
    participant Progress as Progress Module
    participant Syllabus as Syllabus Module
    participant DB as MySQL

    Learner->>App: Access protected app route
    App->>Users: Get profile summary for current user
    Users->>DB: Read user + learner_profile
    DB-->>Users: Profile state

    alt Onboarding already completed
        Users-->>App: onboarding_completed = true
        App-->>Learner: Continue to dashboard / app home
    else Onboarding required
        Users-->>App: learner_profile missing or onboarding_completed = false
        App-->>Learner: Redirect to onboarding wizard

        App->>Syllabus: Get onboarding reference data
        Syllabus->>DB: Read valid tracks / units / skills metadata
        Syllabus-->>App: Target level and skill reference options

        Learner->>App: Submit onboarding form
        App->>Personalization: Submit assessment input
        Note over App,Personalization: Input utama: current level, target JLPT, daily goal, script familiarity, weak areas, optional free-text note

        Personalization->>Progress: Get baseline mastery snapshot
        Progress->>DB: Read progress_events / skill_mastery_snapshots
        DB-->>Progress: Empty or existing baseline
        Progress-->>Personalization: Baseline mastery context

        Personalization->>Syllabus: Validate selected target + map relevant skills
        Syllabus->>DB: Read syllabus metadata
        Syllabus-->>Personalization: Valid catalog references

        Personalization->>Users: Persist final learner profile
        Users->>DB: Upsert learner_profiles + onboarding_completed = true
        Users-->>Personalization: Profile saved

        Personalization-->>App: Initial recommendation spec + next lesson hint
        App-->>Learner: Redirect to dashboard with personalized starting point
    end
```

## Key Decisions Locked By This Diagram
- `users` tetap menjadi owner untuk status `onboarding_completed` dan persistence `learner_profile`.
- `personalization` mengolah input onboarding, membaca baseline dari `progress`, dan memvalidasi referensi ke `syllabus`.
- Jika onboarding sudah selesai, flow berhenti cepat di route guard tanpa memanggil ulang proses personalization.

## Expected Outcome
- User yang sudah onboarding langsung masuk ke area belajar.
- User yang belum onboarding diarahkan ke wizard, lalu disimpan sebagai `learner_profile` yang siap dipakai untuk recommendation awal.
- Untuk detail tahap draft/confirmation hasil normalisasi AI, lihat [personalization-assessment-ai-normalization-user-confirmation-learner-profile-update.md](./personalization-assessment-ai-normalization-user-confirmation-learner-profile-update.md).
