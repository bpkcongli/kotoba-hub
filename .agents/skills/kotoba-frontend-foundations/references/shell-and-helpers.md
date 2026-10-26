# App shell dan helpers

Sebelum implementasi, baca [design system](../../../../DESIGN_SYSTEM.md), [responsive rules](../../../../docs/system-design/responsive-layout-rules.md), [IA](../../../../docs/system-design/information-architecture-and-page-inventory.md), serta skill UI/copy terkait. Path target mengikuti [baseline](../../../../docs/frontend-foundation-patterns.md).

## Layout components

| Component      | Tanggung jawab                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AppShell`     | Composition chrome dan satu main region; varian public/onboarding/app/focus                                             |
| `AppHeader`    | Brand atau judul kontekstual, breadcrumb opsional, slot aksi/account; focus mode memberi ruang exit dan indikator fitur |
| `AppSidebar`   | Primary nav desktop mulai `1024px`, Settings sekunder, active destination                                               |
| `AppBottomNav` | Lima primary destination pada mobile/tablet, ikon + label, safe-area inset                                              |
| `AppFooter`    | Konten footer yang dibutuhkan public/app; opsional dan tidak mengganggu canvas sesi                                     |

`AppShell` memenuhi kebutuhan composition wrapper `AppHOC`; jangan membuat dua pemilik chrome. Gunakan `children` dan slots, bukan HOC yang memanggil service, mengelola sesi belajar, atau memasang auth client sebagai satu-satunya guard. Public/auth, onboarding, dan protected app dapat memiliki server layout berbeda. Guard authenticated untuk onboarding tidak sama dengan gate `APP_READY` area belajar; hindari redirect loop parent layout.

Contoh kontrak props berikut menjadi panduan, bukan komponen runtime atau CSS final:

```ts
import type { ReactNode } from 'react';

export type AppShellProps = {
  children: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
} & (
  | { variant: 'public' | 'onboarding' | 'focus' }
  | { variant: 'app'; sidebar: ReactNode; bottomNav: ReactNode }
);

export interface AppHeaderProps {
  title: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  accountMenu?: ReactNode;
}

export interface AppNavigationItem {
  href: '/dashboard' | '/syllabus' | '/flashcards' | '/practice' | '/progress';
  label: string;
  icon: ReactNode;
}
```

Gunakan satu konfigurasi navigasi untuk sidebar/bottom nav. Active match harus menghormati batas segment route, sehingga `/practice/sessions/...` mengaktifkan Practice tanpa mencocokkan prefix path lain secara tidak sengaja. Settings tetap secondary, onboarding tidak menjadi primary nav. Destination yang belum diimplementasikan tidak ditampilkan seolah aktif tersedia.

Shell membutuhkan skip link ke `main`, landmark `header`/`nav`/`main`, label nav berbeda bila perlu, `aria-current="page"`, focus ring, dan target sentuh minimal `44px`. Hindari nested `<main>` pada feature. CSS breakpoint mengatur reflow; jangan membaca `window.innerWidth` pada render server atau mengganti markup awal secara berbeda antara SSR dan client.

Mobile/tablet `0–1023px` memakai topbar + bottom nav, desktop mulai `1024px` memakai sidebar `240–272px` + topbar. Bottom nav menghormati `env(safe-area-inset-bottom)` dan konten diberi ruang bawah agar CTA tidak tertutup. Satu scroll region utama diutamakan. Max width sesuai konteks: auth/onboarding `720px`, reading `760px`, session `960px`, app `1280px`.

Focus mode mengurangi chrome, menyediakan exit yang jelas, dan menempatkan feedback dekat jawaban. Slot menerima kontrol session milik fitur; shell tidak menghitung skor atau memanggil endpoint pause yang belum ada. Footer bukan tempat menampilkan versi build, detail DI, atau mock tooling kepada learner. Startup mock/error setup milik provider, bukan footer permanen.

Saat implementasi, periksa `375px`, `768px`, `1024px`, dan desktop lebar, teks Jepang/English panjang, keyboard/tab order, 200% text zoom, safe-area, focus return dialog, dan input saat keyboard layar aktif. Gunakan token proyek dan cek kontras sesuai skill UI.

## Helpers: aturan dan contoh

Fungsi shared murni menerima konfigurasi display eksplisit. Untuk SSR gunakan locale/timezone yang sama pada bootstrap client; bila timezone browser baru diketahui setelah mount, render placeholder yang sama pada server/initial client atau reformat setelah hydration. Relative time menerima `now` secara eksplisit, bukan `Date.now()` berbeda setiap render.

| Helper           | Input dan boundary                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `formatDate`     | Tanggal kalender `YYYY-MM-DD`, tidak bergeser zona waktu; format memakai bagian tanggal yang sudah divalidasi |
| `formatDateTime` | Timestamp ISO dengan offset/UTC; display timezone eksplisit                                                   |
| `formatNumber`   | Number finite; default locale English yang disepakati, `0` tetap `0`                                          |
| `formatPercent`  | Skor persen `0..100` atau rasio `0..1` harus dipilih eksplisit pada signature; jangan mengalikan dua kali     |
| `formatDuration` | Unit input dinyatakan, misalnya `durationMs`; jangan menampilkan ms sebagai detik                             |
| String helper    | Hanya kebutuhan presentasi/search yang nyata; aman Unicode dan tidak mengubah submission jawaban              |
| `formatCurrency` | Tambahkan bila ada kebutuhan produk; number + locale + ISO currency eksplisit                                 |

Contoh fungsi dapat ditempatkan di `shared/helpers/format-number.ts`; ini memformat skor persen yang sudah dihitung backend, bukan menghitungnya:

```ts
export function formatPercent(percent: number | null | undefined, locale = 'en-US'): string {
  if (percent == null || !Number.isFinite(percent) || percent < 0 || percent > 100) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(percent / 100);
}
```

Tanggal kalender harus divalidasi round-trip agar `2026-02-31` tidak diam-diam bergeser ke Maret; jangan parse tanggal tersebut sebagai instant UTC lalu mengubahnya ke timezone learner. Timestamp invalid/missing memakai fallback `—`; zero score tidak memakai fallback. Hindari parsing string number kosong menjadi `0` tanpa kontrak yang meminta coercion.

Gunakan enum-to-label map di domain untuk `APP_READY`, mastery, understanding, dan lesson status; helper shared tidak menerjemahkan semua enum secara otomatis. Pengubahan `snake_case` menjadi title case dapat menghilangkan makna domain. CSS line clamp lebih sesuai untuk tampilan ringkas daripada memotong string dengan `slice` yang memisahkan karakter Unicode. Helper tidak melakukan transliterasi, sanitasi ASCII, atau evaluasi jawaban Jepang.
