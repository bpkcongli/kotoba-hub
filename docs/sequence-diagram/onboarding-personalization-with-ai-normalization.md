# Personalization Assessment -> AI Normalization -> User Confirmation -> Learner Profile Update Sequence Diagram

## Scope
- Diagram ini memodelkan detail flow `ARCH-07` yang sebelumnya belum dipecah di diagram onboarding umum.
- Fokus utamanya adalah bagaimana input assessment diproses menjadi draft personalization, kapan AI normalization dipakai, kapan user harus konfirmasi, dan kapan `learner_profile` baru boleh disimpan.
- Diagram ini melengkapi `onboarding-personalization.md`, bukan menggantikannya.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    participant App as Web App / Onboarding Wizard
    participant Personalization as Personalization Module
    participant Progress as Progress Module
    participant Syllabus as Syllabus Module
    participant AI as AI Provider
    participant Users as Users Module
    participant DB as MySQL

    Learner->>App: Submit structured onboarding assessment
    Note over Learner,App: current level, target JLPT, daily goal, script familiarity, <br> weak areas, optional free-text note
    App->>Personalization: Submit assessment input

    Personalization->>Progress: Get baseline mastery snapshot
    Progress->>DB: Read progress_events / skill_mastery_snapshots
    DB-->>Progress: Empty or existing baseline
    Progress-->>Personalization: Baseline mastery context

    Personalization->>Syllabus: Load valid catalog references
    Syllabus->>DB: Read tracks / units / skills metadata
    Syllabus-->>Personalization: Valid target and skill reference data

    alt Optional free-text note provided
        Personalization->>AI: Normalize note into structured claims
        Note over Personalization,AI: AI output harus berbentuk structured JSON agar bisa dipetakan ke candidate skills / profile hints
        AI-->>Personalization: Normalized suggestions + confidence
        Personalization->>Syllabus: Validate suggested skills against catalog
        Syllabus-->>Personalization: Valid normalized references
    else No free-text note
        Personalization->>Personalization: Build draft from structured form only
    end

    Personalization->>DB: Store optional assessment / normalization log
    Personalization-->>App: Return assessment draft for confirmation
    App-->>Learner: Show draft profile + suggested skills for review

    alt User revises draft
        Learner->>App: Adjust or remove suggested items
        App->>Personalization: Submit confirmed assessment with user edits
    else User confirms as-is
        Learner->>App: Confirm assessment draft
        App->>Personalization: Submit confirmation
    end

    Personalization->>Users: Persist final learner profile
    Note over Personalization,Users: AI-derived suggestion tidak boleh langsung menjadi source of truth tanpa user confirmation
    Users->>DB: Upsert learner_profiles + onboarding_completed = true
    Users-->>Personalization: Profile saved

    Personalization-->>App: Final recommendation spec + next lesson hint
    App-->>Learner: Redirect to dashboard with confirmed profile
```

## Key Decisions Locked By This Diagram
- `personalization` boleh memakai AI untuk menormalisasi catatan bebas user, tetapi hasil AI hanya menghasilkan draft yang masih perlu dikonfirmasi user.
- `syllabus` tetap dipakai untuk memvalidasi target belajar dan skill hasil normalisasi agar tidak ada referensi di luar katalog resmi.
- `users` tetap menjadi owner untuk persistence `learner_profile`; `personalization` hanya menghitung dan mengirim hasil final yang sudah dikonfirmasi.
- Structured form tetap menjadi baseline utama. AI normalization bersifat opsional dan hanya memperkaya input saat user memberikan free-text note.

## Expected Outcome
- Assessment onboarding bisa menerima kombinasi structured form dan optional free-text note tanpa membuat AI menjadi source of truth tunggal.
- User selalu melihat dan mengonfirmasi draft akhir sebelum profile disimpan sebagai state resmi sistem.
