# Implementasi dan verifikasi VOC-02

VOC-02 selesai pada 19 November 2026. [Kontrak](standalone-vocabulary-contract.md)
menetapkan owner vocabulary langsung pada track, eligibility aktivitas terpisah dari
navigasi lesson, membership immutable dan promosi pending eksplisit.

## Hasil implementasi

- Migration `0008_standalone_vocabulary.sql` menambahkan discriminator ownership dan
  FK group_track_id, serta nullable lesson/unit attribution pada event flashcard.
  CHECK membatasi bentuk owner dan capability kelompok. Data lesson existing tetap LESSON.
- Facade syllabus `getActivitySkills()` dipakai flashcards/progress; lesson navigation,
  onboarding, post-study quiz dan practice tetap memakai katalog lesson. Lesson unpublished
  tidak menjadi fallback. Gate kelompok memerlukan track/group published dan English current.
- Seed v2 kelompok mempunyai [JSON Schema](../schema/standalone-vocabulary-groups.v2.schema.json),
  [contoh unpublished](../examples/standalone-vocabulary-groups.v2.json), validator identitas,
  guard revisi dan importer transaksional. Inggris berubah memerlukan revisi canonical baru;
  Indonesia boleh stale untuk fallback. CLI baru ikut image ops.
- Seed flashcard memakai manifest promosi itemId/pendingSkillCode/targetSkillId. Item ID
  existing dipertahankan; remap/demotion/missing baseline ditolak. State Leitner, custom deck,
  session/turn/answer dan event lama tidak ditulis ulang.
- Mastery kelompok memakai 20 event terbaru per anggota dan rata-rata seluruh anggota,
  termasuk anggota tanpa attempt bernilai nol. Legacy calculator tetap sama. Evidence band
  memakai skor kelompok pada dua sesi berbeda. Understanding lesson tetap terpisah.
- Timeline/DTO/OpenAPI/frontend menerima unitSlug/lessonSlug null. Review lesson link
  hanya dirender jika lessonSlug ada. Instruksi curator/mapping diselaraskan dengan jalur baru.

## Bukti verifikasi

- `bun run test:ci`: 71 suite, 808 tes lulus.
- `bun run lint`, `bun run typecheck`, `bun run format:check`, `git diff --check`: lulus.
- `bun run test:release`: 4 suite offline lulus, termasuk sesudah perubahan packaging CLI.
- `bun run build`: lulus. Percobaan sandbox awal gagal karena Turbopack memerlukan port
  lokal untuk proses CSS; build dengan izin proses lokal lulus, tanpa mengubah konfigurasi app.
- Smoke MySQL 8.4 pada container/database disposable berbeda dari DATABASE_URL:
  upgrade 0000–0007 ke 0008 dengan fixture legacy, import/replay kelompok dan promosi,
  preservasi row Leitner/custom membership/old session, jawaban turn pending sesudah promosi,
  retry hasil pending, penolakan demotion/kode manifest salah/membership berubah,
  CHECK capability practice, loss response progress dan retry sesudah unpublication,
  satu event per jawaban, mastery parsial/penuh, attribution null dan tanpa understanding,
  serta merge syllabus v2 yang mempertahankan row kelompok dan event progress: lulus.
- Image ops dibangun lokal; CLI kelompok dry-run contoh unpublished berhasil pada
  container `--network none` dengan output `groups:1, items:2, imported:false`.
- Skill mapping lulus `quick_validate.py`; konfigurasi curator TOML berhasil diparse.

## Delegasi dan review independen

Subagent backend-coder dan sdet tidak mendapat tools filesystem/shell pada sesi ini.
Keduanya memberi masukan kontrak serta matriks edge case; implementasi dan eksekusi tes
kemudian dikerjakan agent utama. Subagent code-reviewer memeriksa snapshot kode konkret
beserta kontrak dan bukti tes yang dikirim parent. Verdict: tidak ada defect terkonfirmasi,
termasuk pada delta guard revisi Inggris/Indonesia. Dua pertanyaan reviewer tentang field
metadata dan cakupan tes band/cutoff telah dijawab dengan kode dan kasus tes.

Batas review: reviewer tidak dapat membaca repository/diff lengkap atau menjalankan tes
langsung. Ini review independen snapshot, bukan audit penuh filesystem. Verifikasi build,
database dan seluruh tes dilakukan agent utama.

Fingerprint file akhir yang mencakup snapshot runtime dan delta revision guard:

| File | SHA-256 |
| --- | --- |
| `src/backend/progress/domain/services/mastery-calculator.ts` | `5a34e41c3f92d3486b51750b0965f04fb75483d43b4d818417365a4505d25d13` |
| `src/backend/progress/application/services/impl/progress.service.impl.ts` | `0c7f0c14f2867f075b06d68bd06e211b523c54f273d3700ae523832b0f3d3670` |
| `src/backend/syllabus/domain/value-objects/standalone-vocabulary-seed.ts` | `6b3e7fa62169fa646eb8a7df5eab8161723eaae8040caa8b78f2b061d515dedc` |
| `src/backend/syllabus/interface/secondary/persistence/drizzle-vocabulary-group-importer.ts` | `e778fc6ba83b42e76efc800079addb2ada0500c8277adfb2cebaaa458b290ccd` |
| `src/backend/flashcards/interface/secondary/seed/drizzle-flashcard-importer.ts` | `1facad2faadcdbb6d52e3d0646d0751ccbb9ec4ae58cde89dda1a92848c90134` |
| `scripts/smoke/smoke-vocabulary-groups.ts` | `22cc0da1f673a407cb999dca02e311f6fcd74cc0f1b516bd53facde74d15d968` |

## Batas rollout

Tidak ada seed kelompok produksi atau kurasi bank baru pada VOC-02. Contoh tetap
unpublished dan bukan kelompok editorial yang disetujui. VOC-03 mengerjakan kurasi,
review dan integrasi batch melalui jalur ini. Migration/app/seed production belum
berubah. Operasi menggunakan [runbook seed](../../../drizzle/README.md#vocabulary-mandiri-voc-02);
manifest lengkap yang sudah dipromosikan harus disertakan pada reseed berikutnya.
