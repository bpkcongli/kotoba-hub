# Practice engine — IMP-09

## Cakupan

Empat endpoint pada [kontrak practice](./api-contract/practice.md) memakai guard
`APP_READY` dan pemeriksaan same-origin. Route App Router mendelegasikan request
ke class controller; DTO memvalidasi input dan memetakan output tanpa expected
answer, profile internal, atau recommendation snapshot.

Random practice membuat session default lima soal, dengan batas request `1..10`.
Personalization menyusun context dari profil terkonfirmasi, katalog published,
mastery, kesalahan terakhir, dan understanding lesson terbaru. Question mix
default adalah `WEAK=0.6`, `REINFORCEMENT=0.3`, `STRETCH=0.1`; AI memakai context
tersebut untuk generation melalui adapter `IMP-08`.

## Recommendation v1

- Kandidat berasal dari skill published yang mendukung practice, pada level
  sampai target learner. Urutan prioritas: measured weak, focus pilihan learner,
  lesson dengan understanding `1..9`, skill baru, reinforcement level sebelumnya,
  lalu skill mastered/claimed-known. Tie memakai urutan editorial syllabus.
- Focus berupa label preferensi, bukan skill code. `particles` dipetakan ke
  `particle`; `kana` mencakup hiragana/katakana. Label lain mencocokkan type,
  code, atau title; label tanpa padanan tidak membuat skill baru.
- Klaim known-skill tidak menghasilkan snapshot mastery. Measured weak tetap
  diprioritaskan walaupun skill pernah diklaim known.
- Context dibatasi 40 kandidat dan 20 kesalahan terbaru, tanpa jawaban mentah.
  Allowed types berlaku untuk semua kandidat: tiga tipe objektif membutuhkan
  objective support; `FREE_RESPONSE` membutuhkan free-response support. Bila
  capability katalog tidak beririsan, v1 memilih kandidat objective lebih dulu.
- Difficulty memakai band paling konservatif dari kandidat; skill tanpa
  snapshot memakai `STANDARD`. Recommendation dibaca ulang setiap generate.

## Grading dan progress

`SHORT_FREE_RESPONSE` membandingkan `normalizedKana`/`normalizedKanji` dengan
`acceptedTextAnswers` setelah Unicode NFKC dan trim tepi. Tidak ada fuzzy match,
penghapusan tanda baca, atau penilaian berdasarkan raw romaji. `SLOT_FILL`
memakai exact option ID; `ARRANGE_TOKEN` memvalidasi semua token tepat sekali
dan membandingkan ordered IDs. Hanya `FREE_RESPONSE` memakai AI grading.

Session menyimpan prompt, expected answer, dan recommendation secara immutable.
Satu question dijawab satu kali dan berurutan. Retry payload yang sama memakai
answer/event stabil; payload berbeda ditolak. Setelah answer committed,
write-through ke progress memakai event ID tersimpan, lalu hasil progress disimpan
pada answer. Question berikutnya menunggu handoff sebelumnya selesai.

Grading AI dilakukan di luar transaksi session. Transaksi kedua memeriksa ulang
question aktif dan existing answer sebelum menyimpan. Request konkuren dapat
melakukan pemanggilan AI berlebih, tetapi hanya satu answer/event yang dipakai;
pool connection tidak ditahan selama menunggu provider dan observability AI.

Direct post-study memilih `min(current + 1, 10)` dari bank canonical lesson.
Tidak ada practice session/question/answer untuk alur ini. Progress memvalidasi
difficulty lagi saat memegang lock lesson; metadata event menyimpan transisi
understanding aktual sebelum/sesudah agar replay setelah attempt baru tetap
melaporkan delta attempt lama. Completion dimulai pada understanding `>=1`.

Receipt `practice_post_study_receipts` mendukung header `Idempotency-Key` UUID
per user. Receipt menyimpan fingerprint payload, event ID, waktu, grade, dan
hasil akhir. Key sama dengan payload berbeda ditolak. Tanpa header setiap
request adalah attempt baru; client harus memakai key stabil untuk retry aman,
termasuk jawaban salah dan review pada level 10.

## Database dan verifikasi

Migration `0005_practice_engine.sql` menambahkan tiga tabel practice dan satu
tabel receipt internal. Jalankan `bun run db:migrate` pada database tujuan yang
memang hendak diperbarui. Startup aplikasi tidak menjalankan migration otomatis.

```sh
bun run test:ci -- tests/unit/practice tests/unit/personalization/recommendation.test.ts tests/unit/progress
bun run check
```

Untuk persistence, provision MySQL kosong terpisah dengan nama berakhiran `_test`.
Set `PRACTICE_TEST_DATABASE_URL` ke database itu, berbeda dari `DATABASE_URL`, lalu:

```sh
bun run test:practice --allow-test-db-write
```

Smoke menerapkan migration dan menulis fixture hanya pada database test, memakai
AI test double tanpa API key/biaya provider. Cakupannya concurrency, ownership,
replay, kegagalan handoff/receipt, direct quiz tanpa session, level cap, serta
recommendation yang membaca progress terbaru. Gunakan database kosong baru untuk
run berikutnya. Lihat [workflow database](../drizzle/README.md).

Keterbatasan katalog published dan bank quiz tetap mengikuti [PRD](../PRD.md).
Implementasi ini tidak mengarang bank quiz yang belum dikurasi. Evaluasi kualitas
soal dan grading terhadap model live tetap mengikuti [panduan AI](./ai-integration.md).

## Hasil verifikasi

Verifikasi implementasi pada 26 Oktober 2026:

- `bun run check` lulus: lint, typecheck, format, dan **449 tes pada 37 suite**,
  termasuk **81 tes practice** serta recommendation/learning-context tests.
- Smoke MySQL **8.4** pada instance sementara dan database `_test` terpisah lulus.
  Selain migration dan jalur utama, smoke membuktikan replay receipt setelah
  attempt baru mempertahankan delta lama, serta dua attempt difficulty 10
  menghasilkan transisi aktual `9->10` dan `10->10` dengan lock lesson.
- Review read-only selesai tanpa temuan terbuka setelah perbaikan transaksi AI,
  body generate opsional, transisi immutable, dan focus label `particles`.
- Database aplikasi tidak dimigrasi. Provider memakai test double; akses dan
  kualitas model live belum diuji.
