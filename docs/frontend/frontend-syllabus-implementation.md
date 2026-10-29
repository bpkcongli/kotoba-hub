# Syllabus UI — IMP-13

## Cakupan dan kontrak

Implementasi mengikuti [architecture](../../ARCHITECTURE.md), [frontend patterns](frontend-foundation-patterns.md), [design system](../../DESIGN_SYSTEM.md), serta kontrak [syllabus](../api-contract/syllabus.md) dan [practice](../api-contract/practice.md).

- `/syllabus` menampilkan track published dan unit berurutan. `/syllabus/units/[unitSlug]` memuat daftar lesson dan skill. `/syllabus/lessons/[lessonSlug]` memuat tujuan, estimasi waktu, skill, dan materi baca.
- Semua route berada di layout `APP_READY` yang sudah memeriksa session pada server. Backend tetap mengotorisasi setiap request.
- Katalog sebelumnya hanya menyediakan `foundationUnitSlug`, sehingga tidak cukup untuk map seluruh unit. Query additive `includeUnits=true` kini menyertakan ringkasan unit published dan jumlah lesson published; default `false` mempertahankan response katalog onboarding yang ringan. Naratif dan OpenAPI diselaraskan bersama DTO/controller.
- Materi `PARAGRAPH`, `EXAMPLE_SENTENCE`, dan `GRAMMAR_STRUCTURE` dirender berurutan dengan sanitasi allowlist HTML. ID, urutan, contoh Jepang, bank quiz, dan provenance seed tetap canonical.
- Dua belas metadata yang tampil dari subtree seed siap import (tiga description unit dan sembilan learning objective) diterjemahkan ke English. Materi baca dan description skill pada subtree itu sudah English. Subtree lain masih menunggu kurasi; bukan seluruh N5/N4 yang sudah siap. Jalankan ulang seed syllabus untuk memperbarui metadata database yang sudah diimport.

## Reading dan handoff quiz

Reading state hanya state interaksi lokal. Membaca atau menekan aksi selesai membaca tidak membuat progress event dan tidak menandai lesson completed.

Lesson overview membaca metadata pemahaman melalui `POST /api/v1/practice/lesson-post-study/next`. Difficulty, understanding, dan review memakai response authoritative backend; UI tidak memilih soal dari bank atau menghitung kenaikan level sendiri. Completion hanya ditampilkan jika backend sudah melaporkan understanding minimal satu.

Route `/syllabus/lessons/[lessonSlug]/post-study` menjadi handoff nyata yang mengambil tepat satu pertanyaan `SHORT_FREE_RESPONSE` deterministik dari endpoint direct tersebut. Surface ini menampilkan prompt dan difficulty target. Input jawaban, submit, feedback, dan completion summary tetap cakupan `IMP-15`; selama belum tersedia, layar menjelaskan bahwa pengiriman jawaban belum tersedia. Flow ini tidak membuat random practice session.

Kontrak progress saat ini hanya memberi aggregate dan timeline, bukan snapshot per lesson untuk unit/map. Kedua layar itu tidak mengklaim status completion per lesson tanpa data. Penyelarasan indikator lintas layar tetap bagian `IMP-16`/`IMP-17`.

## State dan verifikasi

Domain syllabus menggunakan DTO/schema Zod, API service melalui adapter Axios asli, store MobX, child container Inversify, dan provider yang mengikuti identity session. Request lama dibatalkan atau ditolak setelah pergantian scope/slug. MSW mengintersep HTTP yang sama pada development dan component test, dengan reset handler/state terisolasi.

Tes terarah mencakup extension katalog yang kompatibel, map/unit navigation, materi rich HTML aman, state reading dan quiz required, handoff satu pertanyaan, failure/retry, authorization, dan lifecycle store. Lima belas tes FE memakai Axios asli dan MSW. `bun run check` dan `bun run build` lulus; seluruh suite berisi 605 tes pada 52 suite. Dry-run seed tetap menghasilkan satu track, tiga unit, sembilan lesson, 35 skill, 137 content block, dan 90 soal. Review independen tidak menyisakan temuan terbuka.

Verifikasi browser lokal menggunakan preview komponen asli dengan fixture/MSW pada viewport 375, 768, 1024, dan 1440 piksel; keempat layar tidak mengalami overflow horizontal atau error JavaScript. Pemeriksaan teks 200% pada 375 piksel menemukan heading panjang yang meluber; wrapping diperbaiki dan keempat layar lulus pemeriksaan ulang. Kontras teks utama/putih, teks pendukung/surface, dan teks inverse/navy masing-masing 15.30:1, 5.60:1, dan 16.39:1. Preview sementara dihapus sesudah pemeriksaan dan tidak menggantikan guard route produksi. OAuth nyata, persistence MySQL, submit quiz, dan E2E perjalanan penuh tetap di luar verifikasi task ini.
