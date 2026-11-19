# Skill vocabulary mandiri — VOC-02

Kontrak ini memperluas baseline [panduan authoring](vocabulary-authoring-guide.md),
[ERD syllabus](../../erd/syllabus-domain.md), [ERD aktivitas](../../erd/learning-activity.md)
dan [kontrak seed vocabulary](vocabulary-flashcard-seeder-schema.md).

## Ownership dan eligibility

`skills.owner_type` mempunyai dua nilai: `LESSON` (default existing) dan
`FLASHCARD_VOCABULARY_GROUP`. Owner lesson tetap mempunyai `lesson_id`, tanpa
`group_track_id`. Owner kelompok mempunyai `lesson_id = null` dan
`group_track_id` yang mereferensikan track; tidak mempunyai unit atau lesson dummy.
Kelompok hanya bertipe `VOCABULARY`, mendukung flashcards, dan kedua capability
practice bernilai false. Publikasi kelompok serta terjemahan Inggris current
menentukan eligibility aktivitasnya, terpisah dari visibility lesson. Track wajib
published. Lesson unpublished tetap tidak eligible melalui jalur lesson.

Katalog navigasi/onboarding/quiz tetap memakai subtree lesson. Facade aktivitas
menambahkan kelompok mandiri hanya untuk flashcards/progress. Practice dan
personalization yang memakai katalog lesson tidak memasukkan kelompok tersebut.
Kelompok tidak menghasilkan completion lesson atau snapshot understanding.

## Seed v2 dan membership

[JSON Schema](../schema/standalone-vocabulary-groups.v2.schema.json) dan
[contoh unpublished](../examples/standalone-vocabulary-groups.v2.json) tersedia.
Manifest terpisah `schemaVersion: 2.0.0`, `kind: STANDALONE_VOCABULARY_GROUPS`
memuat `groups`; importer tidak membaca draft VOC-01. Setiap group mempunyai ID,
code, slug, trackSlug, curriculumLevel, sortOrder, contentRevision, isPublished,
sourceRefs, localizations en/id dan daftar `items: [{itemId, pendingSkillCode}]`.
Setiap localization mempunyai title, description nullable, sourceRevision,
translationRevision, isPublished dan sourceRefs. Inggris harus current dan wajib
published untuk group published; Indonesia boleh draft/stale (sourceRevision tidak
melebihi contentRevision) dan memakai fallback Inggris. Paket arti item tetap milik flashcards
sesuai BIL-05, bukan konten leksikal tunggal pada skill kelompok.

Item ID, code, slug, track, level dan membership kelompok immutable setelah import.
Setiap item hanya boleh mempunyai satu owner. Anggota wajib merupakan ID vocabulary
pending dari artifact canonical; pendingSkillCode harus cocok dengan baseline.
Perubahan membership memerlukan kelompok baru dan desain migrasi terpisah agar
mastery existing tidak memakai denominator berbeda. Revisi konten/translation
mengikuti guard monotonic dan perubahan payload wajib menaikkan revisi. Perubahan
paket Inggris memerlukan contentRevision serta translationRevision baru; revisi
sumber/terjemahan yang sudah tersimpan tidak boleh mundur.

## Promosi dan preservasi

Import skill kelompok terlebih dahulu melalui command khusus dengan manifest
reviewed. Seed flashcard memakai manifest yang sama secara eksplisit untuk promosi;
plan menyimpan manifest identitas `itemId -> null -> skillId`. Importer menerima
hanya transisi pending ke owner kelompok yang valid dan cocok dengan katalog,
atau replay ke owner yang sama. Remap, demotion, item baru yang berpura-pura pending,
dan perubahan tipe item ditolak. Menjalankan seed lama sesudah promosi ditolak,
bukan mengembalikan attribution menjadi null.

Promosi memakai ID pending existing, tanpa menjalankan ulang generator untuk
mengubah ID berdasarkan skill code. Importer tidak mengubah state user+item,
membership custom deck, turn/session/answer snapshots, event atau mastery lama.
Sesi yang sudah dibuat tetap memakai skillId/skillCode dalam turn snapshot: turn
pending lama tetap tidak membuat event resmi walaupun dijawab setelah promosi.
Sesi baru menggunakan owner kelompok. Retry hasil lama tetap identik; tidak ada
backfill attribution pada event lama.

## Progress dan mastery

Event kelompok memiliki trackId, `lessonId = unitId = null`; timeline API memakai
`lessonSlug` dan `unitSlug` nullable. UI hanya memberi link lesson ketika slug ada.
Validasi progress menerima event FLASHCARD dengan `gradingMetadata.flashcardItemId`
anggota kelompok, dan menolak practice/post-study serta item di luar membership.
Replay event existing memakai attribution yang tersimpan, termasuk saat katalog
kemudian berubah publikasinya.

Skill lesson mempertahankan formula baseline maksimal 20 attempt terakhir. Untuk
kelompok, hitung accuracy/recency/confidence dengan formula baseline pada maksimal
20 event terbaru **per item**, lalu rata-ratakan komponen dan mastery secara merata
atas seluruh anggota. Item yang belum pernah dijawab bernilai nol. Jadi mengulang
satu kata tidak menggantikan bukti untuk anggota lain. Event tanpa identitas item
atau dengan item asing tidak menjadi evidence kelompok. `attemptsWindowSize` dan
`correctAttemptsCount` tetap statistik maksimal 20 event terbaru kelompok untuk
kompatibilitas snapshot existing; bukan jumlah seluruh evidence per item.

Threshold state tetap 50/80/90 dan confidence default 0.5. Band STRETCH memerlukan
cakupan seluruh anggota serta dua sesi berbeda dengan skor kelompok minimal 80;
aturan REMEDIAL memakai dua sesi dengan skor maksimal 50. Evidence band dihitung
atas skor kelompok, bukan skor kata tunggal. State Leitner tetap terpisah per item.

## Operasi dan acceptance

Migration harus dijalankan sebelum app baru. Import kelompok dan promosi dapat
diulang; kegagalan seed flashcard tidak mengubah snapshots sesi atau state user.
Tidak ada kurasi atau publikasi batch vocabulary produksi pada VOC-02; itu VOC-03.
Verifikasi mencakup eligibility, null attribution, coverage, membership/identity
conflict, preservasi retry/sesi, migration dan importer pada MySQL uji terisolasi.
