# Random Question Generator + Answer Evaluation Sequence Diagram

## Scope
- Diagram ini memodelkan flow practice session sampai hasil jawaban tersimpan di database milik module `practice`.
- Flow berhenti sebelum `record learning event` dikirim ke module `progress`.
- Diagram menggabungkan dua fase yang masih satu ownership: question generation dan answer evaluation.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    participant App as Web App / Practice UI
    participant Practice as Practice Module
    participant Personalization as Personalization Module
    participant Syllabus as Syllabus Module
    participant AI as AI Provider
    participant DB as MySQL

    Learner->>App: Start random practice
    App->>Practice: POST /practice/sessions/generate

    Practice->>Personalization: Request recommendation spec
    Personalization-->>Practice: target_skill_ids + difficulty_band + question_mix

    Practice->>Syllabus: Load valid content constraints
    Syllabus->>DB: Read skill, lesson, unit, and allowed question type metadata
    Syllabus-->>Practice: Content bundle for candidate skills

    Practice->>AI: Generate practice set in structured JSON
    AI-->>Practice: Candidate questions + expected grading metadata

    Practice->>DB: Insert practice_session + practice_questions
    Practice-->>App: Return generated session
    App-->>Learner: Render practice questions

    Learner->>App: Submit answer
    App->>Practice: POST /practice/sessions/:id/answer
    Practice->>DB: Load question + session context
    DB-->>Practice: Question metadata

    alt Deterministic question type
        Practice->>Practice: Grade with deterministic rules
    else Free-response / subjective type
        Practice->>AI: Grade answer + generate short feedback
        AI-->>Practice: Structured grading result
    end

    Practice->>DB: Insert practice_answer + update session progress
    Practice-->>App: Grading result + feedback
    App-->>Learner: Show immediate feedback
```

## Key Decisions Locked By This Diagram
- `practice` menjadi owner untuk session generation, question storage, answer evaluation, dan session-state update.
- `personalization` hanya menyuplai recommendation spec, bukan question payload final.
- AI dipakai untuk generation dan grading yang memang membutuhkannya, sementara question deterministik tetap bisa dinilai langsung di `practice`.
- Flow ini sengaja berhenti di persistence internal `practice`; penulisan ke `progress` dipisah ke diagram lain.

## Expected Outcome
- Practice session bisa digenerate dan dinilai penuh dalam boundary `practice`.
- Setelah hasil jawaban tersimpan, sistem siap menjalankan handoff terpisah ke `progress`.
- Setelah titik ini, flow bisa dilanjutkan ke diagram [update-progress-snapshot.md](./update-progress-snapshot.md).
