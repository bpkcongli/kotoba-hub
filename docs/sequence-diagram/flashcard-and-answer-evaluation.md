# Flashcard + Answer Evaluation Sequence Diagram

## Scope
- Diagram ini hanya memodelkan flow flashcard sampai hasil jawaban tersimpan di database milik module `flashcards`.
- Flow berhenti sebelum `record learning event` dikirim ke module `progress`.
- Diagram ini fokus ke ownership internal `flashcards` untuk evaluasi jawaban multiple-choice, update session state, dan feedback payload yang akan dikirim balik ke UI.
- Diagram ini mengasumsikan opsi jawaban final sudah dibentuk ketika session dibuat, lalu dipakai sebagai snapshot tetap untuk turn answer selama session aktif.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    participant App as Web App / Flashcard UI
    participant Flashcards as Flashcards Module
    participant DB as MySQL

    Note over Learner,Flashcards: Session sudah dibuat sebelumnya dengan <br> question_script_mode + answer_script_mode yang dikunci <br> serta option snapshot yang sudah dibentuk

    Learner->>App: Tap one answer option
    App->>Flashcards: POST /flashcards/sessions/:id/answer(itemId, selectedOptionId, responseTimeMs)

    Flashcards->>DB: Load flashcard session, current item, item state, and answer option context
    DB-->>Flashcards: Session + item + bucket + script pair + option snapshot

    Flashcards->>Flashcards: Validate item matches current turn
    Flashcards->>Flashcards: Resolve prompt/answer script pair from session
    Flashcards->>Flashcards: Evaluate selectedOptionId deterministically

    alt Answer correct
        Flashcards->>Flashcards: Promote Leitner bucket / mark success
    else Answer incorrect
        Flashcards->>Flashcards: Demote or keep bucket / mark retry needed
    end

    Flashcards->>DB: Persist flashcard_session_answers + item state + session counters
    Flashcards-->>App: Answer result + bucket update + feedback payload + next item options

    alt Item type is KANJI_CHARACTER
        App-->>Learner: Show correct answer + kanji + english + kunyomi + onyomi + example words
    else Item type is VOCABULARY
        App-->>Learner: Show correct answer + japanese term + kana reading + english meaning
    else Item type is HIRAGANA_CHARACTER or KATAKANA_CHARACTER
        App-->>Learner: Show default feedback: correct answer -> bucket promoted/demoted -> progress update
    end
```

## Key Decisions Locked By This Diagram
- `flashcards` tetap menjadi owner untuk evaluasi jawaban flashcard, perubahan Leitner bucket, dan snapshot opsi jawaban yang dipakai untuk grading.
- Opsi jawaban final dibentuk lebih awal saat session dibuat dari canonical answer + distractor pool item, bukan dibangkitkan ulang ketika user menekan submit.
- Session script pair dipilih sebelum session dimulai dan tidak diubah di tengah session aktif.
- Semua hasil evaluasi, opsi yang ditampilkan, dan perubahan bucket disimpan dulu di storage milik `flashcards` sebelum ada handoff ke module lain.
- Handoff ke `progress` sengaja dipisah ke diagram lain agar boundary ownership lebih jelas.

## Expected Outcome
- Satu jawaban flashcard multiple-choice selesai diproses penuh di boundary `flashcards` sampai state internalnya aman tersimpan.
- Setelah titik ini, flow bisa dilanjutkan ke diagram [update-progress-snapshot.md](./update-progress-snapshot.md).


## Perluasan bilingual — BIL-05

1. Guard existing → validasi representasi/pasangan script. Localized menerima
   MEANING; legacy tetap ENGLISH. Resolve locale eksplisit → users preference
   melalui consumer port → en. Tidak membaca preference pada answer.
2. Repository membaca deck/item published/eligible. Resolve paket deck dan setiap
   turn requested current → en current; validasi seluruh opsi setelah normalisasi.
   Bila opsi requested ambigu/tidak cukup, fallback seluruh paket turn.
3. Simpan deck_snapshot dan turns_payload lengkap sebelum response creation;
   kirim DTO whitelist tanpa key/alias/provenance/internal packages.
4. Answer mengunci sesi/state user+item existing, menilai key snapshot, menyimpan
   localized feedback dan handoff progress existing. Retry identik membaca hasil
   tersimpan; preference/reseed tidak memengaruhi hasil atau bahasa sesi.
