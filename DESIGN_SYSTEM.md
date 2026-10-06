# KotobaHub Design System

## Status dan sumber keputusan

- Status: **handoff implementasi UI** untuk `IMP-11`–`IMP-16`, diringkas dari `DS-01`–`DS-08` yang sudah ditandai selesai di [task breakdown](docs/task-breakdown.md).
- Ini adalah spesifikasi ringkas untuk implementasi. Nilai token terinci berasal dari [design token foundation](docs/system-design/design-token-foundation.md); perilaku responsive dari [responsive rules](docs/system-design/responsive-layout-rules.md); struktur layar dari [IA](docs/system-design/information-architecture-and-page-inventory.md), [wireframes](docs/system-design/low-fidelity-wireframes-core-flows.md), dan [high-fidelity handoff](docs/system-design/high-fidelity-system-design.md).
- File Figma `KotobaHub`, page `All Features`, dirujuk oleh [high-fidelity handoff](docs/system-design/high-fidelity-system-design.md) sebagai artefak visual pendamping. Saat detail Figma dan dokumen repo berbeda, scope serta perilaku screen mengikuti dokumen repo.
- Bahasa UI: **English**. Gunakan font Jepang pada teks materi, prompt, dan contoh beraksara Jepang. Istilah domain/enum internal tidak ditampilkan mentah sebagai copy UI.

## 1. Prinsip visual

KotobaHub harus terasa seperti **study workspace** yang rapi, cerdas, ramah, dan mendorong langkah belajar berikutnya. Empat pilar dari [design direction board](docs/system-design/design-direction-board.md) adalah *calm discipline*, *youthful momentum*, *smart guidance*, dan *modern Japanese academic mood*.

- Gunakan hierarchy, whitespace, label, dan progress cue untuk membantu learner memahami tugas saat ini dan langkah selanjutnya.
- Pertahankan surface belajar terang dan tenang. Pakai navy sebagai anchor, slate blue sebagai dukungan, coral secara hemat untuk momentum dan CTA penting.
- Landing boleh lebih atmosferik; app belajar tetap fungsional. Hindari anime literal, dekorasi stereotip, neon, glassmorphism berat, card grid padat, dan gaya dashboard enterprise.
- Flashcard dan practice session adalah **focus mode** dengan satu prompt utama dan feedback dekat input/jawaban.

## 2. Fondasi token

Token berikut adalah nilai awal light mode dari [DS-03](docs/system-design/design-token-foundation.md). Kode boleh memetakan nama ke CSS custom properties atau Tailwind theme, tetapi komponen memakai **semantic role**, bukan hex tersebar.

### 2.1 Warna

| Role | Nilai | Pemakaian |
| --- | --- | --- |
| `brand.primary` | `#1D1D36` | brand, sidebar/strong surface, CTA primer |
| `brand.secondary` | `#6F7FA6` | info pendukung, filter, visual data |
| `brand.accent` | `#FF7A59` | CTA momentum, active progress, focus cue |
| `bg.canvas` / `bg.subtle` | `#F7F8FC` / `#EFF2F8` | kanvas aplikasi / section tint |
| `surface.default` / `surface.elevated` / `surface.strong` | `#FFFFFF` / `#FBFCFE` / `#232743` | panel / floating panel / inverse panel |
| `border.subtle` / `border.default` / `border.strong` | `#E2E6F0` / `#CDD4E4` / `#A7B2C8` | divider / control / selected support |
| `text.primary` / `text.secondary` / `text.muted` | `#1F2340` / `#54607C` / `#7A86A3` | body / pendukung / metadata |
| `text.inverse` / `text.accent` | `#FFFFFF` / `#D95F41` | teks pada dark surface / penekanan inline |
| `state.success` / `state.success-bg` | `#4E8B6F` / `#E8F4ED` | jawaban benar, mastery naik, selesai |
| `state.warning` / `state.warning-bg` | `#D89A3D` / `#FFF5E6` | weak skill, due review, pending |
| `state.error` / `state.error-bg` | `#C95A5A` / `#FBECEC` | jawaban salah, error, destructive |
| `state.info` / `state.info-bg` | `#4D78C9` / `#ECF2FF` | konteks dan bantuan nonkritis |

Untuk semantic control interaktif, gunakan varian `hover` dan `active` yang sudah ditetapkan di [token foundation](docs/system-design/design-token-foundation.md), bukan turunan bebas per screen. Warna status selalu dipasangkan dengan label/ikon atau teks penjelas; arti status tidak boleh bergantung pada warna saja. Validasi kontras kombinasi foreground/background nyata pada saat implementasi komponen.

### 2.2 Tipografi

- Font utama: **Plus Jakarta Sans**. Font konten Jepang: **Noto Sans JP** dengan fallback yang mendukung glyph Jepang.
- Weight: regular `400`, medium `500`, semibold `600`, bold `700`. Bold dipakai hemat untuk headline dan metrik penting.

| Token | Size / line height | Kegunaan |
| --- | --- | --- |
| `type.display` | `40 / 48px` | landing hero, major score |
| `type.h1` | `32 / 40px` | page heading utama |
| `type.h2` | `24 / 32px` | section heading |
| `type.h3` | `20 / 28px` | card/step title |
| `type.body-lg` | `18 / 28px` | pengantar penting |
| `type.body` | `16 / 24px` | body default |
| `type.body-sm` | `14 / 20px` | helper dan secondary copy |
| `type.label` | `13 / 18px` | field/badge label |
| `type.caption` | `12 / 16px` | metadata |

Halaman aplikasi mobile memulai hierarchy dari `h2` atau `h3` jika `h1` memenuhi viewport secara berlebihan. Teks Jepang pada flashcard dan question perlu ruang serta ukuran yang cukup untuk dibaca, mengikuti tujuan masing masing komponen.

### 2.3 Spacing, radius, elevation

| Skala | Nilai |
| --- | --- |
| `space.1/2/3/4` | `4/8/12/16px` |
| `space.5/6/8` | `20/24/32px` |
| `space.10/12/16` | `40/48/64px` |
| `radius.sm/md/lg/xl/full` | `8/12/16/24/999px` |
| `shadow.sm` | `0 1px 2px rgba(20, 27, 45, 0.08)` |
| `shadow.md` | `0 8px 24px rgba(29, 35, 64, 0.08)` |
| `shadow.lg` | `0 16px 40px rgba(29, 35, 64, 0.12)` |

Pakai `radius.md` untuk card dan button default. Dahulukan perbedaan surface dan border; shadow hanya menegaskan layer tertentu. Internal control umumnya memakai `space.2`–`space.4`, card/section kecil `space.5`–`space.8`, section besar `space.10` ke atas.

### 2.4 Focus dan motion

| Token | Nilai |
| --- | --- |
| `focus.ring.color` / `outer` | `#FF7A59` / `rgba(255, 122, 89, 0.22)` |
| `focus.ring.width` / `offset` | `2px` / `2px` |
| `motion.fast/base/slow/emphasis` | `120/180/240/320ms` |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease.enter` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `ease.exit` | `cubic-bezier(0.4, 0, 1, 1)` |

Semua kontrol keyboard perlu `focus-visible` yang jelas. Motion menjelaskan perpindahan state dan update progress; hindari loop dekoratif dan bounce. Implementasi perlu menghormati preferensi reduced motion.

## 3. Responsive layout dan navigasi

| Lebar viewport | Shell | Layout utama |
| --- | --- | --- |
| `0–767px` mobile | topbar + bottom nav pada app reguler | satu kolom, section bertumpuk |
| `768–1023px` tablet | topbar + bottom nav | mobile-first, ruang lebih lega |
| `1024–1279px` desktop | sidebar kiri + contextual topbar | dua kolom bila mendukung konten |
| `1280px+` wide | sidebar + topbar, support rail opsional | content max-width tetap dibatasi |

- Bottom nav dan sidebar memuat **Dashboard, Syllabus, Flashcards, Practice, Progress**. Bottom nav memakai ikon **dan** label, active indicator jelas, serta safe-area inset. Settings dan sign out berada di profile/account affordance; Settings juga ada di bawah sidebar desktop.
- Onboarding memakai shell khusus tanpa navigasi area belajar. Public landing dan login memakai header ringan sendiri.
- Saat sesi flashcard/practice aktif, mobile boleh menyembunyikan bottom nav; exit/pause/progress tetap terlihat. Desktop boleh menenangkan atau collapse sidebar.
- Target sentuh minimum `44px`. Sticky nav tidak boleh menutupi action bar atau input, termasuk saat keyboard mobile terbuka.

| Container | Max width | Padding mobile / tablet / desktop |
| --- | --- | --- |
| Public | `1200px` | `16 / 24 / 32px` |
| Auth dan onboarding | `720px` | `16 / 24 / 32px` |
| App default | `1280px` | `16 / 24 / 32px` |
| Materi baca | `760px` | `16 / 24 / 32px` |
| Learning session | `960px` | `16 / 24 / 32px` |

Satu area scroll utama per halaman adalah default. Gunakan sheet/drawer untuk secondary action mobile, popover/dropdown ringan pada desktop, dan modal untuk konfirmasi yang benar benar perlu memutus flow. Detailnya mengikuti [responsive rules](docs/system-design/responsive-layout-rules.md).

## 4. Komponen dan ownership

Basis komponen adalah `shadcn/ui` yang diberi token KotobaHub. Gunakan wrapper untuk pola reusable, serta komposisi feature untuk state bisnis. Penempatan mengikuti [component inventory](docs/system-design/shadcn-component-inventory.md) dan [ARCHITECTURE.md](ARCHITECTURE.md).

| Tingkat | Komponen inti | Lokasi yang disarankan |
| --- | --- | --- |
| Primitive bertema | `Button`, `Card`, `Badge`, `Input`, `Textarea`, `Label`, `Select`, `Progress`, `Skeleton`, `Avatar`, `Tooltip` | `src/frontend/shared/components/atoms` atau shared component yang sesuai |
| Wrapper shared | `AppTextField`, `AppSelectField`, `StatusPill`, `MetricCard`, `ActionCard`, `InlineNotice`, `BottomSheet`, `ChartPanel` | `src/frontend/shared/components/molecules` / `organisms` |
| Shell | `PublicHeader`, `AppSidebar`, `MobileBottomNav`, `ContextTopbar`, `FocusModeShell`, loading/empty/error panels | `src/frontend/shared/components/layouts` dan shared compositions |
| Feature | `OnboardingStepper`, `UnitLaneCard`, `FlashcardCanvas`, `PracticeQuestionPanel`, `WeakSkillActionPanel`, dan peer components | `src/frontend/<feature>/components` |

P0 untuk `IMP-11`: button/card/badge/progress, app sidebar, bottom nav, contextual topbar, focus shell, loading dan empty state. P0 komponen per fitur tetap mengikuti daftar di [component inventory](docs/system-design/shadcn-component-inventory.md). Business rule atau repository backend tidak ditempatkan di komponen. Feature UI memakai store MobX dari `services/internal` melalui provider/container Inversify dan hook domain; komponen client yang membaca observable memakai `observer`. Lifetime store dan hydration mengikuti [ARCHITECTURE.md](ARCHITECTURE.md).

### 4.1 Pola state lintas fitur

| State | Perlakuan UI |
| --- | --- |
| Loading | Skeleton mengikuti bentuk final panel/screen; hindari layout yang meloncat. |
| Empty | Jelaskan kondisi dan sediakan next action yang relevan, misalnya pilih deck atau mulai lesson. |
| Error | Teks singkat dan actionable, retry dekat konteks kegagalan. Jangan hanya toast sementara untuk kegagalan submit. |
| Success/correct | Feedback inline dekat input, tampilkan perubahan progress bila ada. |
| Incorrect | Tunjukkan jawaban/penjelasan yang diperbolehkan dan jalur coba/review berikutnya tanpa menghapus konteks soal. |
| Optimistic progress | Tampilkan state sementara yang dapat direkonsiliasi dengan response dan revalidation; nilai final mengikuti backend. |

## 5. Pattern per flow

### Public dan onboarding

- Landing: hero dan value proposition jelas, CTA utama di bagian awal; desktop boleh split layout, grid marketing maksimal tiga kolom.
- Login: panel terpusat dan CTA tunggal **Continue with Google**.
- Onboarding: stepper di awal, form satu alur, helper text dan validation yang mudah dilihat. `DraftProfilePreview` harus terlihat editable; AI suggestion tidak dinyatakan final sebelum user confirm.

### Syllabus dan lesson

- Mobile: track selector, continue-learning card, dan unit stack vertikal. Desktop: peta/unit list serta support panel selected unit.
- `UnitLaneCard` memuat title, progress, ringkasan lesson, dan CTA. Status lesson selalu diberi teks: **Not started**, **Reading**, **Quiz required**, **Completed**.
- Lesson overview menampilkan `contentBlocks` sebagai surface baca utama dalam urutan resmi. CTA **Start post-study quiz** muncul sebagai langkah wajib sesudah materi. Tampilkan understanding `0–10` dan skill context.
- Post-study quiz menampilkan tepat satu soal dari bank lesson, difficulty target, input singkat, feedback, delta understanding, completion confirmation saat `0 -> 1`, dan review CTA. Jangan menampilkan quiz ini sebagai random practice session.

### Flashcards

- Setup memilih deck dan script pair sebelum start. Tampilkan konfigurasi terkunci pada sesi aktif; perubahan mode memakai jalur end/restart yang jelas.
- `FlashcardCanvas` tetap dominan. Opsi jawaban punya target besar serta state selected/correct/incorrect/disabled yang jelas.
- Feedback inline dekat opsi. Untuk kana cukup ringkas; untuk kanji boleh diperluas dengan meaning, onyomi, kunyomi, dan contoh.

### Practice

- Prompt, jawaban, dan feedback berada pada satu sumbu utama. Desktop support rail hanya untuk nomor soal, timer, atau ringkasan kecil.
- Dukung `SHORT_FREE_RESPONSE` sebagai fallback, `SLOT_FILL` dengan tepat empat opsi Jepang, `ARRANGE_TOKEN` dengan answer lane dan token bank, serta `FREE_RESPONSE` dengan textarea dan informasi AI grading.
- Pada input yang didukung kontrak, romaji diubah ke kana sebelum submit; user melihat bentuk final yang dikirim. Feedback tetap inline, memuat score/penjelasan singkat, skill attribution, dan next action.

### Progress dan settings

- Progress memprioritaskan overview, lesson completion/understanding, weak-skill action, tren, dan recent activity. Grafik diberi label serta empty state yang jelas; tampil seperti ringkasan belajar, bukan panel analitik padat.
- Settings adalah area pendukung sederhana untuk profil dan preferensi; tidak memerlukan shell admin tersendiri.

Rincian hierarchy per layar ada pada [low-fidelity wireframes](docs/system-design/low-fidelity-wireframes-core-flows.md) dan [high-fidelity handoff](docs/system-design/high-fidelity-system-design.md).

## 6. Copy, aksesibilitas, dan verifikasi UI

- Gunakan copy English yang ringkas dan mengarahkan aksi: *Continue learning*, *Start post-study quiz*, *Try again*, *Review lesson*. Nama field dan state harus konsisten di seluruh route.
- Tampilkan level JLPT, difficulty, mastery, dan understanding dengan label penjelas. Jangan menyamakan **lesson completed** dengan **skill mastered**.
- Sediakan label form, error message yang terkait field, urutan tab logis, focus yang terlihat, dan feedback yang diumumkan secara semantik kepada assistive technology. Jangan mengandalkan warna atau animasi saja.
- Periksa kontras kombinasi warna yang benar benar dipakai, target sentuh `44px`, safe area bottom nav, keyboard behavior, dan reduced motion pada komponen nyata.
- Gunakan state yang sama pada mobile dan desktop walau komposisi layout berbeda. Komponen session perlu dicek pada state setup, active, submitted, error, completed, dan summary.

## 7. Handoff untuk implementasi

1. `IMP-11`: turunkan token ke CSS/Tailwind, buat primitive dan wrapper P0, lalu shell public/onboarding/app/focus.
2. `IMP-12`–`IMP-16`: implement flow sesuai pattern di atas dan kontrak backend tiap fitur. Backend/database tiap fitur harus siap lebih dulu sesuai [task breakdown](docs/task-breakdown.md).
3. `IMP-17`: validasi lintas flow, terutama status lesson, quiz wajib, script pair terkunci, progress write-through, dan rekomendasi yang berubah mengikuti snapshot terbaru.
4. Saat konten seed ditampilkan, tinjau copy Indonesia yang masih ada pada [published syllabus seed](content/syllabus/manifest.json) agar antarmuka English tidak bercampur bahasa secara tidak sengaja. Gap bank quiz dan status `SYL-07` dicatat di [PRD.md](PRD.md).
