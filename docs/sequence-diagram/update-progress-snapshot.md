# Update Progress Snapshot Sequence Diagram

## Scope
- Diagram ini memodelkan handoff setelah hasil jawaban sudah tersimpan di module producer, baik dari `flashcards` maupun `practice`.
- Fokus utamanya adalah proses `record learning event -> validate attribution -> recompute mastery -> upsert snapshot`.
- Diagram ini menjadi flow bersama untuk update progress setelah practice activity apa pun.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Activity as Flashcards / Practice Module
    participant Progress as Progress Module
    participant Syllabus as Syllabus Module
    participant DB as MySQL

    Note over Activity,Progress: Handoff dimulai setelah hasil jawaban sudah tersimpan <br> di database module producer

    Activity->>Progress: Record structured learning event
    Note over Activity,Progress: Payload minimal: user_id, skill_id, session_id, activity_type, question_type, <br> score/is_correct, answered_at, grading metadata

    Progress->>Syllabus: Validate skill_id and resolve attribution
    Syllabus->>DB: Read skill -> lesson -> unit -> track mapping
    Syllabus-->>Progress: Valid attribution context

    Progress->>DB: Insert progress_event
    Progress->>DB: Read recent attempts window for the skill
    DB-->>Progress: Recent attempts history
    Progress->>Progress: Recompute skill mastery snapshot
    Progress->>DB: Upsert skill_mastery_snapshot and rollup summary

    alt Producer is Flashcards
        Progress-->>Activity: Updated mastery snapshot + flashcard progress delta
    else Producer is Practice
        Progress-->>Activity: Updated mastery snapshot + practice progress delta
    end
```

## Key Decisions Locked By This Diagram
- `progress` tetap menjadi source of truth untuk `progress_events` dan `skill_mastery_snapshots`.
- Producer activity seperti `flashcards` dan `practice` tidak menulis langsung ke storage milik `progress`.
- `syllabus` dipakai sebagai validator resmi untuk memastikan attribution skill selalu sah sebelum event disimpan.
- Recompute snapshot terjadi segera setelah event baru masuk, sehingga feedback loop ke UI dan recommendation berikutnya tetap write-through.

## Expected Outcome
- Baik flashcard maupun random question mengikuti jalur update progress yang sama setelah result internal mereka tersimpan.
- Snapshot mastery terbaru selalu tersedia segera setelah satu interaction selesai diproses.
