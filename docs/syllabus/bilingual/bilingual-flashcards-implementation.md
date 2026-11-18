# Flashcard bilingual — BIL-05

Status: runtime dan seed awal tersedia; dependency BIL-03 selesai. Dokumen ini memfinalkan
perluasan kontrak flashcard sebelum perubahan runtime. BIL-07 tetap memiliki
terjemahan pesan UI/API umum; BIL-08 memiliki rollout production.

## Kontrak dan kompatibilitas

- GET deck dan POST session menerima opt-in `contentFormat=localized` serta
  `contentLocale=en|id` opsional. Locale eksplisit → preferensi users → `en`.
  Locale tanpa format, locale unsupported, format asing dan query berulang ditolak.
- Request tanpa format memakai shape lama dan `ENGLISH` asli, tanpa membaca
  preferensi. Snapshot sesi lama dan retry answer tidak ditulis ulang.
- Mode baru `MEANING` memisahkan representasi arti dari bahasa. Pada localized,
  pasangan KANJI/KANA/MEANING dan JAPANESE/MEANING mengikuti pasangan lama
  ENGLISH. `ENGLISH` hanya untuk request legacy; `MEANING` hanya localized.
- Response localized menyertakan `localization` (requested/resolved locale,
  fallback, contentRevision, translationRevision) untuk deck dan item. Session
  config menyimpan contentFormat/contentLocale requested. Metadata item berlaku
  untuk paket arti, penjelasan, contoh, prompt serta seluruh opsi pada turn.
- Feedback localized memakai `meaning` pada kanji/vocabulary details, bukan
  `englishMeaning`; explanationText dapat null. Field legacy tetap pada sesi lama.
  Pesan status/headline umum tetap bahasa UI existing sampai BIL-07.
- Answer tidak menerima locale/format baru. Feedback dan nextItem memakai paket
  tersimpan; key server-only tidak dikirim sebelum answer.

## Persistence, seed, dan fallback

- Perluasan additive milik flashcards menyimpan content revision serta paket
  localizations pada deck/item. Paket mempunyai sourceRevision,
  translationRevision, isPublished, sourceRefs; paket current harus merujuk
  revisi canonical yang sama. Tidak mengubah ID, membership atau key Leitner.
- Paket item menyimpan meaning, explanationText, exampleWords dan bank
  MEANING canonicalAnswer/aliases/distractors serta scriptOptions Jepang/romaji
  per bahasa. Canonical Jepang dan himpunan alias Indonesia harus sama dengan
  baseline Inggris dari sumber canonical. Distractor dibentuk
  dari kandidat lokal yang setara; alias benar dan kandidat dengan prompt/arti
  yang sama dikecualikan. Normalisasi NFKC/case/whitespace menolak duplikat.
- Locale dipilih sebagai satu paket per turn. Jika paket requested tidak
  published/current atau tidak mempunyai opsi unik yang cukup, fallback seluruh
  paket ke Inggris current. Tidak mencampur bahasa opsi atau memakai draft.
  Inggris published/current wajib tersedia. Bila tidak ada paket dengan opsi
  valid untuk pasangan script yang dipilih, creation ditolak dengan 142205001.
- Data legacy yang belum diaudit tidak otomatis diberi label Inggris. Seed
  localized terpisah berprovenance memperluas artefak canonical tanpa mengganti
  snapshot v1. Cakupan terjemahan dan fallback dilaporkan pada hasil verifikasi.
- Snapshot sesi membekukan deck, locale/revisi, semua prompt/opsi/kunci,
  penjelasan/contoh serta attribution skill sebelum creation response.
  Reseed/preference berubah hanya memengaruhi sesi baru.
- Import transaksional mempertahankan session/answer/state/custom deck dan
  memvalidasi revisi/fingerprint agar payload berubah perlu revisi baru.
  Migration dan smoke hanya dijalankan pada DB disposable saat implementasi.

## Verifikasi yang disyaratkan

Tes menutup locale/fallback/draft/stale, legacy ENGLISH dan sesi tersimpan,
MEANING kedua arah, collision/alias distractor, retry setelah reseed/preference
berubah, key Leitner user+item yang sama, DTO tanpa key/internal localization,
serta FE stale response, bahasa sesi terkunci, dan kegagalan creation setelah
perubahan preferensi. Hasil eksekusi tercatat di bawah.


## Cakupan seed dan batas konten

- Artefak v1 tidak diubah: 749 vocabulary dan 147 kana, serta 20 skill kanji
  yang dibaca adapter dari snapshot syllabus. Publikasi katalog DB tetap
  menentukan item mana yang benar-benar masuk system deck.
- `content/flashcards/system-decks/localizations.v2.json` berisi judul Indonesia
  88 deck artefak dan arti bilingual untuk 38 vocabulary ID (beberapa lexeme
  muncul pada ownership berbeda). Judul kanji memakai terminologi unit terkurasi.
  Paket kana tidak memerlukan arti; teks Jepang/romaji tetap canonical.
- Inggris menggunakan field `englishMeaning` dan canonicalAnswers.ENGLISH
  yang berasal dari gloss English generator JMdict, serta meaningsEn kanji;
  bukan pelabelan ulang teks bebas legacy. Contoh/penjelasan existing nullable
  dipertahankan. Bentuk schema mendukung contoh/penjelasan bilingual tambahan.
- Paket Indonesia yang belum ditulis tidak dipalsukan. Vocabulary/kanji tersebut
  memakai paket Inggris lengkap dengan metadata fallback. Kurasi seluruh arti
  Indonesia di luar 38 ID masih backlog konten; runtime tidak mengklaim seluruh
  bank telah diterjemahkan. Kandidat pending tetap tanpa progress resmi.
- Pada DB disposable hasil merge 16 lesson BIL-03: 66 system deck / 639 item /
  639 membership eligible; 53 mapped dan 586 pending. Inggris: 66 deck/639 item;
  Indonesia: 66 deck/30 item. Delapan dari 38 ID overlay belum eligible di katalog
  ini. Angka berubah sesuai publikasi, tidak menjadi seed target baru.

Schema overlay diperiksa strict oleh `FileCanonicalFlashcardSource`. Root
`schemaVersion=2.0.0`, `contentRevision`, `translationRevision`, `sourceRefs`,
`items` berkey UUID dengan surfaceFormText/en/id, `decks` berkey UUID en/id,
dan `unitTitles` berkey unit slug. Identitas overlay harus cocok sumber.
`attachFlashcardLocalizations` membentuk paket tersimpan melalui schema Zod
`deckTranslationSchema`/`itemTranslationSchema`; importer memvalidasinya lagi.

Revisi overlay berlaku konservatif untuk seluruh plan. Naikkan
`translationRevision` bila teks, provenance, alias atau pool berubah. Perubahan
canonical atau perubahan katalog yang mengubah pool legacy juga memerlukan
`contentRevision` baru beserta translationRevision baru agar sourceRevision
current. Tidak boleh menghapus localization existing atau menurunkan revisi;
retire dengan isPublished=false pada paket, bukan menghapus histori revisinya.
Pembuatan session tetap POST baru tanpa idempotency creation tambahan; retry
answer tetap memakai hasil/event existing yang sama.

## Operasi

Gunakan app/ops dari release yang sama. Setelah backup pada rollout BIL-08:

```sh
bun run db:migrate
bun run db:seed:flashcards:dry-run
bun run db:seed:flashcards
```

Dry-run membaca katalog DB, tidak menulis, dan melaporkan `localizationCoverage`.
Seed flashcard dijalankan setelah migration dan merge syllabus yang dipilih;
sebelum seed, request legacy tetap tersedia sedangkan creation localized dapat
menolak item tanpa paket current. Jangan down migration atau reseed binary lama
sebagai rollback. Snapshot sesi existing tidak perlu dikonversi.

Smoke menggunakan DB disposable kosong, nama berakhiran `_test` dan berbeda dari
DATABASE_URL. Flag tulis wajib. `--bilingual-syllabus` menjalankan v1 → merge v2
sebelum seed flashcard agar integrasi dependency BIL-03 diperiksa:

```sh
FLASHCARDS_TEST_DATABASE_URL='mysql://USER:PASSWORD@HOST/kotoba_flashcards_test' \
  bun run test:flashcards --allow-test-db-write --bilingual-syllabus
```

## Hasil verifikasi

- Smoke MySQL 8.4 lulus dengan katalog v1 maupun merge v2: repeatable seed,
  identity/ownership, rollback konflik revisi, snapshot/fallback, transaksi jawaban,
  concurrent replay/progress recovery dan state Leitner user+item yang sama.
- Chrome 1440×1000 dan 390×844 pada preview/DB disposable: setup, sesi dan feedback
  Indonesia, anotasi lang Jepang/Indonesia, completion, serta paket sesi tetap
  Indonesia setelah preferensi disimpan menjadi Inggris. Tidak ada overflow
  horizontal, exception JS atau kegagalan API; screenshot `/tmp/bil05-browser-evidence/`.
- Review subagent berupa pemeriksaan algoritma/transisi dan pasangan glossary
  yang dikirim lewat pesan. Tool workspace subagent tidak tersedia; eksekusi dan
  integrasi file dilakukan agent utama. Review memperbaiki こちらこそ dan recovery
  setup setelah perubahan locale saat creation gagal. Ini bukan audit independen
  seluruh berkas atau suite E2E TEST-11.
- `bun run check` lulus: lint tanpa warning, typecheck, format, empat release test
  file dan 64 suite / 724 tes Jest. Build production dan `db:generate` tanpa drift
  lulus. Verifikasi Docker app/ops lulus dengan checksum sumber/migration/overlay,
  parse overlay offline, dry-run v1/v2 serta guard tanpa env DB. Tidak ada migration/seed/deployment pada database production.
