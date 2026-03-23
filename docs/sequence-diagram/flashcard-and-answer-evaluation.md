# Flashcard + Answer Evaluation Sequence Diagram

## Scope
- Diagram ini hanya memodelkan flow flashcard sampai hasil jawaban tersimpan di database milik module `flashcards`.
- Flow berhenti sebelum `record learning event` dikirim ke module `progress`.
- Diagram ini fokus ke ownership internal `flashcards` untuk evaluasi jawaban dan update session state.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    participant App as Web App / Flashcard UI
    participant Flashcards as Flashcards Module
    participant DB as MySQL

    Learner->>App: Submit flashcard answer
    App->>Flashcards: POST /flashcards/sessions/:id/answer

    Flashcards->>DB: Load flashcard session, card item, current bucket
    DB-->>Flashcards: Session + card context

    Flashcards->>Flashcards: Evaluate answer deterministically
    alt Answer correct
        Flashcards->>Flashcards: Promote Leitner bucket / mark success
    else Answer incorrect
        Flashcards->>Flashcards: Demote or keep bucket / mark retry needed
    end

    Flashcards->>DB: Persist card result + session state update
    Flashcards-->>App: Answer result + bucket update
    App-->>Learner: Show immediate feedback
```

## Key Decisions Locked By This Diagram
- `flashcards` tetap menjadi owner untuk evaluasi jawaban flashcard dan perubahan Leitner bucket.
- Semua hasil evaluasi dan perubahan bucket disimpan dulu di storage milik `flashcards` sebelum ada handoff ke module lain.
- Handoff ke `progress` sengaja dipisah ke diagram lain agar boundary ownership lebih jelas.

## Expected Outcome
- Satu jawaban flashcard selesai diproses penuh di boundary `flashcards` sampai state internalnya aman tersimpan.
- Setelah titik ini, flow bisa dilanjutkan ke diagram [update-progress-snapshot.md](./update-progress-snapshot.md).
