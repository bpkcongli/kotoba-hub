# KotobaHub Responsive Layout Rules

## Status
- Dokumen ini menyelesaikan task `DS-04`.
- Scope task ini hanya dokumentasi; tidak ada output Figma tambahan untuk fase ini.
- Dokumen ini menjadi baseline responsive behavior sebelum masuk ke `DS-06` low-fidelity wireframe dan `IMP-11` app shell implementation.

## Dependencies
- [task-breakdown.md](../task-breakdown.md)
- [brand-identity-brief.md](./brand-identity-brief.md)
- [design-direction-board.md](./design-direction-board.md)
- [design-token-foundation.md](./design-token-foundation.md)
- [architecture-foundation.md](../architecture-foundation.md)
- [mvp-plan.md](../mvp-plan.md)

## Layout Goals
- Layout harus terasa seperti study workspace yang rapi, fokus, dan ringan dipakai tiap hari.
- Responsive behavior harus memprioritaskan kelancaran flow belajar inti di mobile tanpa membuat desktop terasa seperti versi mobile yang diperlebar.
- Navigation pattern harus membedakan area public, onboarding, dan app shell inti agar hierarchy penggunaan jelas.

## Breakpoint Model

| Range | Label | Default Behavior |
| --- | --- | --- |
| `0-767px` | `mobile` | single-column, bottom nav, stacked sections |
| `768-1023px` | `tablet` | mobile-first shell dengan ruang lebih besar, bottom nav tetap aktif |
| `1024-1279px` | `desktop` | sidebar + topbar hybrid, two-column opportunities mulai aktif |
| `1280px+` | `wide desktop` | desktop shell dengan optional secondary rail dan content max-width lebih longgar |

## Global Shell Rules

### 1. Public Shell
- Dipakai untuk landing dan halaman auth ringan.
- Header public tetap tipis dan fokus ke brand, CTA login, dan navigasi minimum.
- Layout public boleh lebih atmosferik daripada area aplikasi, tetapi konten utama tetap dibatasi agar copy dan CTA mudah dipindai.

### 2. Onboarding Shell
- Onboarding memakai shell khusus tanpa sidebar atau bottom nav.
- Fokus utama adalah wizard progression, progress stepper, dan form guidance.
- User harus tetap punya akses ke tindakan aman seperti `Back`, `Save draft later` bila nanti dibutuhkan, dan `Sign out`, tetapi tidak boleh terdistraksi oleh navigasi area belajar penuh.

### 3. App Shell
- Dipakai untuk `dashboard`, `syllabus`, `flashcards`, `practice`, `progress`, dan `settings`.
- Mobile/tablet menggunakan top app bar + bottom nav.
- Desktop/wide desktop menggunakan sidebar kiri persisten + topbar kontekstual.
- Area konten utama tetap menjadi fokus; navigasi tidak boleh mendominasi lebih dari yang diperlukan.

## Container And Spacing Rules

| Context | Mobile Padding | Tablet Padding | Desktop Padding | Max Width |
| --- | --- | --- | --- | --- |
| Public hero/content | `space.4` | `space.6` | `space.8` | `1200px` |
| Auth / onboarding | `space.4` | `space.6` | `space.8` | `720px` |
| App content default | `space.4` | `space.6` | `space.8` | mengikuti lebar area setelah sidebar |
| Reading-heavy content | `space.4` | `space.6` | `space.8` | `760px` |
| Learning session canvas | `space.4` | `space.6` | `space.8` | `960px` |

### Spacing Interpretation
- Gunakan `space.4` sebagai padding minimum layar mobile agar content tetap lega tanpa boros ruang.
- Gunakan `space.6` sampai `space.8` untuk section gap utama pada app shell.
- Halaman app reguler, termasuk dashboard/progress dan setup practice/flashcards, memakai seluruh lebar area setelah sidebar dengan padding di atas. Topbar memakai padding horizontal yang sama agar judul dan konten sejajar.
- Batas lebar khusus tetap berlaku untuk materi baca, auth/onboarding, dan sesi belajar aktif.

## Navigation Pattern Rules

### Mobile And Tablet Bottom Nav
- Bottom nav adalah pola utama untuk `0-1023px`.
- Bottom nav hanya menampung destination frekuensi tinggi:
  - `Dashboard`
  - `Syllabus`
  - `Flashcards`
  - `Practice`
  - `Progress`
- `Settings` tidak masuk bottom nav utama agar jumlah item tetap ringkas; aksesnya lewat avatar/profile entry di top app bar atau quick menu.
- Bottom nav harus menghormati safe-area inset perangkat modern.
- Ikon + label wajib tampil bersamaan; jangan icon-only.
- State aktif harus sangat jelas memakai kombinasi color, weight, dan indicator ringan.

### Desktop Sidebar + Topbar Hybrid
- Sidebar kiri persisten aktif mulai `1024px`.
- Sidebar memuat destination utama:
  - `Dashboard`
  - `Syllabus`
  - `Flashcards`
  - `Practice`
  - `Progress`
- Entry `Settings` diletakkan di bagian bawah sidebar bersama account/profile affordance karena sifatnya low-frequency.
- Topbar kontekstual memuat:
  - page title
  - breadcrumb opsional
  - contextual actions
  - quick profile/streak/status summary bila relevan
- Sidebar tidak perlu terlalu lebar; target awal `240-272px` cukup untuk label penuh dan state aktif.

## Page-Level Layout Templates

### Landing Page
- Mobile: hero, value proposition, feature highlights, dan CTA ditumpuk vertikal.
- Desktop: hero boleh memakai split layout dua kolom, tetapi CTA primer harus tetap berada di fold awal.
- Section grid marketing tidak boleh lebih dari tiga kolom di wide desktop.

### Auth Page
- Form area harus tetap sempit dan terpusat.
- Mobile menggunakan single card/full-width section.
- Desktop cukup memakai centered auth panel; tidak perlu multi-panel kompleks pada MVP.

### Onboarding Wizard
- Selalu fokus ke satu flow utama per layar.
- Mobile/tablet memakai single-column step flow.
- Desktop boleh memakai dua zona:
  - kolom utama untuk pertanyaan/form
  - kolom pendamping untuk helper text, summary, atau recommendation preview
- Progress stepper harus selalu terlihat pada awal halaman.
- Review/confirmation state tetap memakai struktur yang sama agar orientasi user tidak berubah drastis.

### Dashboard
- Mobile menumpuk section berdasarkan prioritas:
  - next recommended action
  - today progress
  - weak skills / review due
  - recent activity
- Desktop boleh memakai grid `main content + support rail`.
- Jangan memakai lebih dari dua tingkat hierarchy card dalam satu viewport agar dashboard tidak terasa seperti enterprise analytics tool.

### Syllabus
- Syllabus map mobile harus scroll vertikal dengan grouping per track/unit.
- Desktop boleh menampilkan panel ganda:
  - peta/unit list di area utama
  - detail singkat atau progress context di panel samping
- Unit detail dan lesson overview harus menjaga readability; materi tidak boleh tersebar terlalu lebar.

### Flashcards
- Session screen adalah focus mode.
- Mobile harus meminimalkan chrome: topbar tipis, progress indicator, card canvas, answer action area sticky jika perlu.
- Desktop tetap fokus ke satu card utama; ruang ekstra dipakai untuk metadata ringan atau session summary kecil, bukan panel distraktif.
- Hasil feedback harus muncul dekat area jawaban, bukan sebagai toast jauh dari konteks.

### Practice
- Practice session mengikuti prinsip focus mode yang mirip dengan flashcards.
- Question prompt, answer input, dan feedback stack harus tetap berada di satu sumbu visual utama.
- Pada desktop, sidebar tambahan hanya boleh dipakai untuk question index, timer, atau session summary ringkas.
- Jangan membuat layout tiga kolom untuk practice MVP.

### Progress
- Mobile: overview cards, trend summary, mastery sections, dan timeline disusun vertikal.
- Desktop: boleh memakai kombinasi hero metric row + analytics section dua kolom.
- Grafik atau progress group yang padat harus dibatasi dan diberi whitespace cukup agar tetap terasa instructional.

### Settings
- Mobile: daftar setting bertingkat sederhana dengan section stack.
- Desktop: list navigation ringan di kiri dan form/detail di kanan boleh dipakai jika item setting mulai lebih dari satu kelompok.
- Karena MVP settings masih ringan, jangan desain shell settings seperti admin panel.

## Content Density Rules
- Mobile selalu memprioritaskan satu primary action per section.
- Tablet tetap mengikuti content priority mobile, bukan memaksakan dashboard desktop mini.
- Desktop boleh menaikkan density secukupnya, tetapi tetap menjaga ritme visual ala study planner.
- Card-grid default:
  - mobile: `1` kolom
  - tablet: `1-2` kolom sesuai konten
  - desktop: `2` kolom dominan
  - wide desktop: maksimum `3` kolom untuk kartu kecil, bukan untuk konten belajar panjang

## Sticky Behavior Rules
- Top app bar mobile boleh sticky untuk menjaga akses cepat ke judul, progress, atau exit action.
- Bottom nav mobile selalu sticky.
- Desktop sidebar selalu sticky di viewport utama.
- Hanya satu area scroll utama per page yang diutamakan; hindari nested scrolling kecuali pada panel terbatas seperti drawer atau sheet.

## Overlay And Secondary Surface Rules
- Gunakan `sheet` atau `drawer` untuk mobile secondary actions seperti filter, quick progress detail, atau deck picker tambahan.
- Gunakan `popover` atau `dropdown` untuk aksi ringan pada desktop.
- Modal penuh hanya dipakai untuk konfirmasi penting atau interruption yang memang tidak cocok sebagai inline panel.
- Learning flow inti sebaiknya mengutamakan inline feedback daripada modal blocking.

## Responsive Typography And Interaction Rules
- `type.display` dan `type.h1` hanya dipakai besar pada landing dan major heading desktop.
- Untuk mobile app pages, default hierarchy dimulai dari `type.h2` atau `type.h3` agar viewport tidak cepat penuh.
- Target tap minimum adalah `44px`.
- Focus ring dan interactive state wajib konsisten lintas breakpoint; responsif tidak boleh menurunkan aksesibilitas.

## Navigation Visibility Rules By Area

| Area | Mobile / Tablet | Desktop / Wide Desktop |
| --- | --- | --- |
| Landing | public top header | public top header |
| Auth | minimal header atau none | minimal header atau none |
| Onboarding | top step header only | top step header only |
| Dashboard | topbar + bottom nav | sidebar + topbar |
| Syllabus | topbar + bottom nav | sidebar + topbar |
| Flashcard session | slim topbar, bottom nav bisa disembunyikan saat focus mode | sidebar collapsed context + topbar, atau content-focus shell |
| Practice session | slim topbar, bottom nav bisa disembunyikan saat focus mode | sidebar collapsed context + topbar, atau content-focus shell |
| Progress | topbar + bottom nav | sidebar + topbar |
| Settings | topbar + profile entry path | sidebar + topbar |

## Focus Mode Rule For Learning Sessions
- `Flashcards` dan `Practice` boleh memakai varian shell khusus saat session aktif.
- Pada mobile, bottom nav boleh disembunyikan selama session berjalan untuk mengurangi accidental navigation.
- Pada desktop, sidebar boleh tetap ada dalam state lebih tenang atau collapsed, selama jalur keluar session tetap jelas.
- Exit, pause, dan progress state session harus selalu dapat diakses tanpa membuka menu tersembunyi yang sulit ditemukan.

## Handoff To Next Tasks
- `DS-05` harus memakai aturan shell dan navigasi ini saat mendefinisikan information architecture dan page inventory.
- `DS-06` harus menurunkan dokumen ini ke wireframe low-fidelity per flow inti.
- `IMP-11` harus mengimplementasikan app shell dengan prioritas:
  - mobile bottom nav
  - desktop sidebar/topbar hybrid
  - focus mode untuk flashcard dan practice session
