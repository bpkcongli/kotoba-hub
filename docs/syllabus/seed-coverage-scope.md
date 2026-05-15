# JLPT Seed Coverage Scope

## Scope
- Dokumen ini menyelesaikan task `SYL-02`.
- Fokusnya adalah mengunci batas coverage seed awal untuk syllabus KotobaHub: mana level yang harus punya detail penuh pada MVP awal, mana level yang cukup hadir sebagai skeleton agar schema dan routing tetap extensible.
- Dokumen ini tidak menetapkan daftar unit final, lesson final, atau inventory skill final per level; area tersebut tetap menjadi scope `SYL-04` sampai `SYL-06`.

## Final Decision
- Seed awal wajib memberi coverage detail untuk `N5` dan `N4`.
- Seed awal wajib menyiapkan skeleton extensible untuk `N3` dan `N2`.
- `N5` dan `N4` adalah baseline track yang boleh dipublish pada MVP awal.
- `N3` dan `N2` harus sudah memakai slug, taxonomy, dan file shape final, tetapi tetap `isPublished = false` sampai kontennya benar-benar siap.
- `N1` berada di luar baseline ladder product saat ini dan tidak perlu disiapkan pada seed awal.

## Coverage Tier Definitions

### 1. Detailed Coverage
Level dengan status `detailed coverage` harus siap menjadi syllabus product yang benar-benar bisa dipakai oleh flow MVP.

Minimal outcome yang dimaksud:
- track, unit, lesson, dan skill sudah diisi penuh sesuai struktur resmi `track -> unit -> lesson -> skill`
- `curriculumLevel`, `skillType`, support flags, dan `prerequisiteSkillCodes` sudah dikurasi di layer product
- setiap skill sudah punya `sourceRefs`, `curriculumSignals`, dan `content` yang cukup untuk import seed dan downstream usage
- struktur tersebut cukup matang untuk mendukung read-only syllabus, progress attribution, personalization targeting, dan pengembangan flashcard/practice berikutnya

### 2. Skeleton Coverage
Level dengan status `skeleton coverage` hanya perlu hadir sebagai kerangka yang stabil untuk ekspansi berikutnya.

Minimal outcome yang dimaksud:
- file track sudah ada
- slug, title, `curriculumLevel`, `sortOrder`, dan `isPublished` sudah final
- bentuk file dan key schema sama dengan track published agar importer, route, dan query shape tidak perlu berubah nanti
- `units` boleh masih kosong pada seed awal
- bila nanti unit/lesson placeholder ditambahkan lebih awal, seluruh turunannya tetap harus `isPublished = false`

## Coverage Matrix

| Level | Track file wajib ada | Publish status awal | Kedalaman struktur minimum | Ekspektasi seed awal |
| --- | --- | --- | --- | --- |
| `N5` | yes | `true` | full tree sampai `skill` | coverage detail penuh |
| `N4` | yes | `true` | full tree sampai `skill` | coverage detail penuh |
| `N3` | yes | `false` | track shell | skeleton extensible |
| `N2` | yes | `false` | track shell | skeleton extensible |

## Content-Type Scope For Detailed Levels

### Mandatory For `N5` And `N4`
- `KANA`
  - `N5` wajib mencakup fondasi kana secara penuh karena menjadi pintu masuk learner baru.
  - `N4` tidak wajib memperkenalkan inventory kana besar baru; bila ada, posisinya lebih sebagai review, fluency, atau bridge support.
- `KANJI`
  - wajib punya coverage seed detail untuk item `N5` dan `N4` yang dipilih syllabus internal
  - lexical source utama tetap `KANJIDIC2`, dengan JLPT overlay diperlakukan sebagai signal
- `VOCABULARY`
  - wajib punya coverage seed detail untuk item `N5` dan `N4` yang dipilih syllabus internal
  - lexical source utama tetap `JMdict`, dengan JLPT overlay diperlakukan sebagai signal
- `GRAMMAR`
  - wajib punya coverage seed detail untuk grammar `N5` dan `N4`
  - baseline canonical inventory mengikuti deck JLPT Bunpro yang sudah ditetapkan di dokumen source-of-truth
  - pada review saat ini, referensi awalnya adalah `130` grammar items untuk `N5` dan `179` grammar items untuk `N4`; angka ini dipakai sebagai coverage target referensial, bukan keharusan memetakan satu deck menjadi satu lesson

### Selective / Non-Blocking For `N5` And `N4`
- `READING`
  - boleh mulai hadir pada `N5` atau `N4` bila memang dibutuhkan untuk learner journey
  - tidak menjadi blocker seed awal bila inventaris `READING` belum selengkap `KANJI`, `VOCABULARY`, atau `GRAMMAR`
  - alasan utamanya: source-of-truth saat ini lebih kuat untuk lexical/grammar item dibanding bank reading terstruktur
- `example sentences`
  - diperlakukan sebagai support metadata pada skill
  - kualitas dan coverage sentence tidak perlu 100% lengkap untuk menutup `SYL-02`
- `frequency metadata`
  - diperlakukan opsional
  - tidak boleh menjadi syarat gating detail coverage

## Structural Rules For Skeleton Levels
- `jlpt-n3-bridge` dan `jlpt-n2-advanced` harus sudah hadir di seed layout yang sama dengan track published.
- Kedua track ini harus memakai slug final sejak awal agar tidak perlu rename saat coverage diperluas.
- `isPublished` untuk `N3` dan `N2` harus tetap `false` sampai unit, lesson, dan skill detailnya benar-benar siap.
- Client dan API read model pada MVP awal boleh mengabaikan `N3` dan `N2` bila hanya membaca data published.
- Skeleton `N3` dan `N2` tidak mewajibkan unit list final pada tahap `SYL-02`; pengisian unit tetap menjadi scope `SYL-04`.

## Publish And Visibility Rules
- Hanya `N5` dan `N4` yang dianggap published syllabus catalog pada seed awal.
- Child entity tidak boleh `isPublished = true` bila parent track atau parent unit-nya masih `false`.
- Jika nanti dibutuhkan locked teaser untuk `N3` atau `N2`, tampilannya harus berasal dari layer product/UI, bukan dengan mengubah aturan data bahwa track tersebut sudah published.
- Onboarding, recommendation awal, dan public syllabus read model harus menganggap published catalog awal hanya terdiri dari level yang benar-benar siap dipelajari.

## Implications For Follow-up Tasks

### For `SYL-03`
- Schema seed harus mendukung empat file track resmi: `jlpt-n5-foundation`, `jlpt-n4-expansion`, `jlpt-n3-bridge`, dan `jlpt-n2-advanced`.
- `N3` dan `N2` harus valid secara schema meskipun `units` masih kosong.
- Field `isPublished` menjadi mekanisme resmi untuk membedakan detail coverage vs skeleton.

### For `SYL-04`
- Prioritas sequencing unit adalah menyelesaikan `N5` lebih dulu, lalu `N4`.
- `N3` dan `N2` pada tahap awal cukup dipertahankan sebagai track shell; unit list detailnya tidak wajib menghambat delivery seed MVP.

### For `SYL-05` And `SYL-06`
- Inventaris lesson, skill, prerequisite, dan support flags wajib exhaustively diturunkan untuk `N5` dan `N4`.
- `N3` dan `N2` boleh tetap kosong atau sangat minimal sampai ekspansi fase berikutnya dimulai.

## Acceptance Criteria For `SYL-02`
- Coverage scope resmi membedakan dengan jelas `N5/N4` sebagai detailed levels dan `N3/N2` sebagai skeleton levels.
- Aturan publish status awal sudah eksplisit dan konsisten dengan ERD serta API contract syllabus.
- Batas mandatory vs optional content types untuk seed awal sudah jelas.
- Follow-up task tidak perlu menebak lagi apakah `N3/N2` harus ikut didetailkan pada MVP awal.

## Alignment Notes
- Keputusan ini konsisten dengan MVP plan yang menargetkan course map `N5 -> N2`, tetapi memusatkan kepadatan seed awal pada `N5 -> N4`.
- Keputusan ini juga konsisten dengan ERD `syllabus` dan API contract yang memakai `is_published` sebagai gate visibility catalog.
- Bila nanti ada kebutuhan bisnis agar `N3` atau `N2` ikut tampil lebih awal, perubahan tersebut harus dianggap perubahan scope syllabus, bukan penafsiran ulang dari dokumen ini.
