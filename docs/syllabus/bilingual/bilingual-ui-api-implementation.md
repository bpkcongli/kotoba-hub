# Internationalization UI dan API — BIL-07

Implementasi 18 November 2026 memakai `next-intl` 4.15.1 untuk pesan aplikasi
Inggris/Indonesia (470 key UI, 51 status API, 88 detail dan 12 template validasi),
ICU interpolation/plural, serta formatter. URL, ID katalog,
progress, dan kunci idempotensi tetap canonical. Tidak ada migration atau seed
baru pada tahap ini; rollout production tetap BIL-08.

## Library dan SSR

Pola [provider dengan locale eksplisit](https://next-intl.dev/docs/usage/configuration)
memakai `NextIntlClientProvider` di dalam `FrontendContainerProvider` existing.
`UiLocaleProvider` mengamati `LocaleStore.preferences.uiLocale`; store server dan
client dibuat dari bootstrap serializable yang sama. Root layout menulis
`html.lang`, kemudian effect menyelaraskannya setelah pilihan bahasa berubah.
Metadata page dan layout memakai bootstrap yang sama melalui React `cache`
per render/request.

Tidak menambah segment `[locale]` atau middleware. Bootstrap akun memakai
preferensi `users`; sebelum login memakai cookie `kotobahub-ui-locale` dengan
allowlist `en/id`, lalu default `en`. Pilihan browser/locale tidak menentukan
zona waktu. Provider dan formatter waktu progress memakai UTC secara eksplisit,
sesuai tampilan existing; timestamp invalid/missing mempunyai fallback aman.

Render client memakai provider eksplisit, sedangkan helper metadata/API memakai
`createTranslator`; tidak menggunakan API `next-intl/server` atau plugin request
configuration. [Core translator](https://next-intl.dev/docs/environments/core-library)
menerima locale/messages secara eksplisit dan tidak memerlukan state locale
global.

Katalog kedua bahasa dimuat bersama supaya render awal tidak menunggu request
kamus. Baseline Inggris menjadi fallback per leaf dengan merge rekursif saat
menyusun katalog Indonesia;
parity test tetap memeriksa katalog mentah sehingga key Indonesia yang hilang
menggagalkan verifikasi.

## Pemilik pesan

| Jenis teks | Pemilik dan jalur render |
| --- | --- |
| Shell, landing, login/onboarding, syllabus, flashcard/practice, progress, label/aria, empty/loading/error, metadata | `src/shared/i18n/messages/{en,id}.json`; React memakai `useUiTranslations()`, helper murni memakai `uiTranslator(locale)` |
| Enum presentasi frontend | Map `*_MESSAGE_KEYS` pada helper domain, kemudian diterjemahkan saat render; enum request/data tetap sama |
| Validasi form onboarding lokal | Key `ONBOARDING:ASSESSMENT_FORM.<FIELD>.VALIDATION_MESSAGE` pada schema FE; komponen menerjemahkan key. Pesan validasi API tetap diteruskan sebagai teks dari BE |
| Kegagalan client seperti network/timeout/contract | `errorMessage` menerjemahkan berdasarkan kind stabil, mempertahankan code/trace/detail di `StoreError` |
| `status.message` dan `errorDetails.message` API | `backend/shared/interface/primary/rest/messages`; adapter presentasi menerjemahkan code serta key/parameter validasi. FE tidak menerjemahkan ulang teks API |
| Materi, metadata katalog, judul deck, prompt/opsi, dan feedback tersimpan | Seed/DB atau snapshot pemilik aktivitas. Tidak masuk kamus UI dan tidak diterjemahkan dengan pencocokan teks aplikasi |

Registry `detail-keys.json` menjadi adapter untuk pesan detail English existing ke
key aplikasi yang stabil. Validasi Zod umum memakai key dan parameter untuk
batas angka/panjang, tipe, format, dan opsi; issue Indonesia yang belum dikenal
menggunakan pesan validasi generik. Field, enum dan nilai teknis tetap canonical.
English detail existing dipertahankan untuk kompatibilitas.

Key frontend memakai `<CONTEXT>:<FEATURE>.<ELEMENT>.<PROPERTY>` dengan object
bertingkat dan tujuh domain: `AUTH`, `ONBOARDING`, `SYLLABUS`, `FLASHCARDS`,
`PRACTICE`, `PROGRESS`, `SHARED`. Adapter shared mengganti separator namespace
menjadi path native `next-intl`; `UiMessageKey` diturunkan dari katalog untuk
mengecek consumer, enum map dan metadata saat compile. Empat leaf tambahan
memisahkan konteks focus assessment serta status bucket kartu tanpa mengubah
wording. Lihat [panduan key frontend](../../frontend/i18n-message-keys.md).
Katalog/adapter backend tetap menggunakan struktur sebelumnya.

## Pemilih bahasa dan sesi

Pemilih **Interface language / Bahasa antarmuka** tersedia pada header public,
app, onboarding, dan focus session. Pengunjung menyimpan pilihan di cookie
`Path=/; SameSite=Lax; Max-Age=31536000`, dengan `Secure` pada HTTPS. Pengguna
yang login mengirim PATCH hanya `{uiLocale}` melalui service/adapter Axios yang
sama; bahasa materi dipertahankan dari response authoritative. Preferensi akun
selalu menang atas cookie pada bootstrap setelah login.

Kontrol dinonaktifkan selama penyimpanan/refresh. Kegagalan mempertahankan
bahasa sebelumnya dan menampilkan pesan retry. Hydrate/dispose membatalkan
request dan menolak hasil terlambat, termasuk penulisan cookie. Setelah sukses,
`router.refresh()` memperbarui metadata/SSR. Provider fitur tidak diberi key dari
`uiLocale`, sehingga pergantian bahasa UI tidak membuang input atau jawaban
pending. [Refresh App Router](https://nextjs.org/docs/app/api-reference/functions/use-router)
menggabungkan payload server sambil mempertahankan state client yang tidak
terpengaruh.

Pemilih **Content language / Bahasa materi** tetap terpisah dan mengikuti gate
cutover BIL-03. Bahasa instruksi dan feedback pada panel soal practice/direct quiz
menggunakan translator dengan locale snapshot BIL-06/BIL-03; pergantian UI tidak
mengubah bahasa, prompt, kunci, maupun feedback sesi existing. Teks Jepang
mempertahankan `lang=ja`; teks bantuan/konten memakai resolved locale, sedangkan
label aplikasi di dalam container materi memakai locale UI tersendiri.

## Presentasi API

Seluruh exported handler REST v1 dibungkus `withLocalizedResponse` dari
`src/app/api/with-localized-response.ts`. Handler mengembalikan Response langsung;
wrapper meneruskan hasilnya ke `presentResponse` satu kali setelah handler selesai,
termasuk cabang early return. Tipe request (`Request`/`NextRequest`) dan context
parameter dinamis diteruskan utuh. Exception handler tetap diteruskan ke Next.js.

Komposisi request berada pada adapter App Router; penerjemahan envelope murni
berada di adapter REST shared. Wrapper bukan middleware/proxy Next.js dan tidak
memindahkan guard autentikasi/origin. Domain/use case, log operasional dan
persistence tidak membaca locale UI.

```ts
export const GET = withLocalizedResponse((request: Request) =>
  syllabusController.listTracks(request),
);
```

Resolusi pesan: header eksplisit valid **`X-UI-Locale: en|id`** → preferensi akun
→ cookie pengunjung tervalidasi → `en`. Header yang unsupported diabaikan,
bukan mengubah validasi payload aktivitas. Axios membaca header dari locale store
container saat setiap request, sehingga tidak ada mutable locale global atau
header lama yang tertinggal.

Response `401` dan penolakan origin tidak melakukan lookup session/preferensi
lagi: pesan memakai header valid atau cookie/default. Controller tetap memeriksa
origin sebelum session. Kegagalan lookup locale lain dicatat sebagai log
operasional dan memakai English, tanpa menutupi status hasil controller.

Adapter hanya mengubah dua field pesan. HTTP status, application code, field,
trace ID, data, pagination, cookie, feedback snapshot dan receipt tidak ditulis
ulang. Redirect OAuth diteruskan utuh. Envelope JSON memakai
`Cache-Control: private, no-store` dan `Content-Language` untuk bahasa pesan;
header ini tidak mengganti locale konten di dalam data. Teks error API yang sudah
diterima tetap merupakan pesan dari request tersebut sampai retry/request baru.

## Verifikasi

Lulus pada 18 November 2026: `bun run lint`, `bun run typecheck`,
`bun run format:check`, `bun run test:ci` (68 suite/766 tes),
`bun run test:release` (4 suite offline), dan `bun run build`. Install memakai
`bun install --frozen-lockfile --ignore-scripts` tidak mengubah lockfile.
`python3 scripts/syllabus/validate_bilingual_contracts.py` serta pemeriksaan
shared locale definitions/path parameters/internal refs pada seluruh 8 dokumen
OpenAPI lulus. Definisi header disalin dari base pada tiap dokumen agar kontrak
OpenAPI tetap self-contained sesuai validator existing.

- Tes katalog memeriksa kesamaan key mentah dan rendering semua pesan ICU kedua
  bahasa. Tes API mencakup semua code, parameter validasi, precedence/fallback,
  guard origin, serta preservasi data/metadata/trace/cookie dan redirect.
- Tes komponen memakai provider dan service asli dengan MSW: SSR/hydration tanpa
  recoverable error, cookie pengunjung tanpa write akun, PATCH partial dengan
  contentLocale tetap, kegagalan save, penolakan hasil write terlambat, header
  locale per request, dan input pending yang tidak di-remount.
- Tes aktivitas existing tetap memeriksa instruksi/feedback snapshot, input Jepang,
  retry/idempotensi, dan isolasi feature store.
- Build production lulus. Chrome lokal memeriksa landing EN→ID, refresh metadata,
  HTML server `lang=id`, login ID, desktop 1024/1280px, tablet 768px dan mobile 375px, serta font
  200% pada login; tidak ada overflow horizontal atau exception browser pada
  skenario tersebut, termasuk halaman 404 Indonesia. Tab keyboard mencapai select
  dengan focus ring terlihat dan tinggi 44px. API live lokal mengembalikan 401
  Indonesia dengan code tetap dan header private/no-store. Warna teks kontrol memakai token existing; teks pada kartu
  memiliki rasio 15,30:1 dan batas select memakai `muted-foreground`.

Browser smoke mencakup public/login tanpa OAuth. Flow protected diuji dengan MSW,
bukan akun Google/AI/database production. Verifikasi operasional menyeluruh,
kurasi konten tambahan, serta backup/rollout tetap mengikuti BIL-08 dan task
konten masing-masing.

Refactor `withLocalizedResponse` diverifikasi terpisah dengan 8 suite/148 tes
unit API terkait, typecheck (termasuk generated route types Next.js), lint,
format kode yang diubah, dan `git diff --check`. Tes tambahan mencakup penerusan
request/body/context, early return 401/origin, exception sinkron/asinkron, serta
cabang callback OAuth dengan preservasi redirect dan seluruh cookie.

Pengelompokan key frontend diverifikasi dengan 68 suite/780 tes Jest, typecheck,
lint, format dan `git diff --check`. Semua 466 pesan awal pada setiap bahasa
dipertahankan persis, termasuk placeholder; katalog kini berisi 470 leaf pada
tujuh domain setelah pemisahan empat konteks. Tes katalog memeriksa semua leaf,
placeholder/ICU, namespace, fallback rekursif dan descriptor validasi. Refactor
frontend ini tidak mengubah kode atau katalog pesan backend.

Build production lulus melalui
`node node_modules/next/dist/bin/next build --webpack`, termasuk pemeriksaan
TypeScript dan generation 27 halaman. Build Turbopack pada environment verifikasi
terhalang izin bind port lokal; konfigurasi/script build repository tetap.
