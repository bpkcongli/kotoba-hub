# API Bilingual — BIL-01

Status: kontrak final untuk **BIL-03**, belum tersedia pada runtime v1. Schema executable: [openapi.bilingual.yaml](./openapi.bilingual.yaml). Aturan data, revisi, publikasi, dan transisi: [kontrak konten bilingual](../syllabus/bilingual-content-contract.md).

## Pemilihan representasi

| Request                                                                          | Response                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Syllabus tanpa `contentFormat`                                                   | Kontrak [syllabus v1](./openapi.syllabus.yaml), proyeksi Inggris; preferensi user tidak mengubah shape/bahasa |
| Syllabus `contentFormat=localized`                                               | Kontrak target bilingual; `contentLocale=en/id` opsional, lalu preferensi, lalu `en`                          |
| Direct quiz body tanpa `contentFormat`                                           | Kontrak [practice v1](./openapi.practice.yaml)                                                                |
| Direct quiz body `contentFormat=localized`                                       | Kontrak target delivery/answer di bawah                                                                       |
| Locale dikirim tanpa opt-in localized, format/locale invalid atau query berulang | `422`; tidak mengabaikan input atau downgrade diam-diam                                                       |

Contoh: `GET /api/v1/syllabus/lessons/copula-affirmative-and-questions?contentFormat=localized&contentLocale=id`.

- Syllabus tetap memiliki tiga endpoint GET yang sama, pagination `offset/limit`, include flags, urutan, serta guard. List memerlukan session valid; unit/lesson memerlukan `APP_READY`. Katalog localized hanya mencakup subtree v2 yang lolos semua gate; N4/draft tidak dipublikasikan oleh keberadaan terjemahan saja.
- Object track/unit/lesson/skill/block yang membawa teks menyertakan `localization`: `requestedLocale`, `resolvedLocale`, `isFallback`, `contentRevision`, `translationRevision`. Field `englishTranslation` pada example diganti `translation` **hanya pada representasi localized**; tipe block dan field canonical lainnya tetap.
- Inggris adalah baseline wajib/current. Resolver mengambil paket requested yang published/current atau paket Inggris utuh; tidak mengirim map `localizations`, draft/stale, source metadata internal, maupun kunci soal. Tidak melakukan fallback per field/null.
- Contoh: requested `id`, Indonesia stale, Inggris current → `requestedLocale=id`, `resolvedLocale=en`, `isFallback=true`. Jika Inggris wajib tidak layak, subtree ditahan dari katalog; resource tidak tersedia memakai 404 existing, kegagalan invariant yang lolos gate menjadi 500 existing dan log internal.
- Response tetap memakai envelope/code domain existing. Request-specific cache harus membedakan identity, format, requested locale, resolved locale/revisi; API authenticated tetap private/no-store. Query locale tidak menjadi pengganti authorization dan tidak mengubah timezone.

## Preferensi

GET/PATCH `/api/v1/user-profile/preferences` dimiliki `users`, session valid cukup termasuk `ONBOARDING_REQUIRED`. GET tidak menulis; tanpa row mengembalikan default berikut:

```json
{
  "status": { "traceId": "uuid", "code": 120002000, "message": "Success!", "errorDetails": [] },
  "data": { "contentLocale": "en", "uiLocale": "en" }
}
```

PATCH menerima object partial nonkosong, misalnya `{"contentLocale":"id"}`; field yang tidak dikirim dipertahankan atau memakai default ketika row belum ada. Hanya dua field `contentLocale`/`uiLocale`, nilai `en/id`, null/unknown ditolak. Same-origin diperiksa sebelum session. Update preferensi tidak membuat profil learner atau mengonfirmasi onboarding. Tidak menambahkan preferensi ke payload assessment/confirmation.

UI sebelum login memakai cookie `kotobahub-ui-locale` tervalidasi. Setelah login, stored preference/default menjadi sumber bootstrap; cookie tidak diam-diam menimpa preferensi akun. Pengiriman locale eksplisit untuk membaca materi tidak menyimpan preferensi; penyimpanan tetap PATCH.

## Delivery post-study quiz

1. POST `/practice/lesson-post-study/next` dengan `{lessonSlug,contentFormat:"localized",contentLocale?:"id"}`. Server tetap memilih soal canonical difficulty `min(current+1,10)`, lalu menyimpan snapshot server dan mengembalikan `deliveryId`, `expiresAt` (24 jam), serta question dengan `localization`. Prompt Jepang mempertahankan schema versi 1 dan menambahkan paket `placeholder`/`hintTexts` terlokalisasi; tidak mengirim explanation atau kunci sebelum grading.
2. POST `/practice/lesson-post-study/answer` dengan `{lessonSlug,questionId,deliveryId,contentFormat:"localized",userAnswer,responseTimeMs?}` dan header **`Idempotency-Key` wajib**. Tidak menerima `contentLocale`; server memakai locale/kunci/explanation snapshot delivery. Same-origin dan `APP_READY` tetap berlaku.
3. Verifikasi owner, lesson/question, expiry dan target authoritative; grade deterministik snapshot dan konsumsi delivery satu kali. Result menambahkan `deliveryId` serta `localization` dan menggunakan feedback snapshot. Pergantian preference/reseed tidak menulis ulang delivery atau receipt.
4. Key/payload sama mengembalikan receipt sebelum mengecek expiry/target baru; beda payload atau delivery sudah dikonsumsi oleh key lain ditolak. Progress event tetap satu. Delivery ini bukan practice session; penerapan transaksi/recovery mempertahankan aturan engine existing.

## Error yang dipakai

| Operasi           | HTTP / code       | Kondisi                                                                                    |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| Syllabus          | `422 / 142204001` | Format, locale, duplikasi query atau kombinasi parameter invalid                           |
| Preferences       | `401 / 140102001` | Session invalid                                                                            |
| PATCH preferences | `403 / 140302001` | Same-origin gagal                                                                          |
| PATCH preferences | `422 / 142202001` | Payload/locale invalid                                                                     |
| Direct quiz       | `422 / 142206001` | Body, locale/format, delivery ID atau Idempotency-Key invalid/missing                      |
| Direct quiz       | `422 / 142206002` | Delivery expired/consumed, stale target, binding lesson/question atau idempotency conflict |
| Direct quiz       | `404 / 140406002` | Delivery tidak ditemukan atau milik user lain; tidak membocorkan ownership                 |

Guard/error lain mengikuti kontrak fitur existing, termasuk auth, onboarding, same-origin practice dan resource tidak ditemukan. Key/code, trace ID, field validation dan enum tidak diterjemahkan. Pemilihan pesan API melalui `uiLocale` dan kamus aplikasi dikerjakan `BIL-07`; schema error envelope tetap sama.

## Batas perluasan

Kontrak ini memfinalkan syllabus, preferensi, dan handoff quiz untuk `BIL-03`. Schema flashcard dan pasangan random practice AI akan difinalkan `BIL-05/BIL-06`; request lama tetap mengunci `ENGLISH` atau pasangan `EN/JA` sampai tahap tersebut. Setiap aktivitas bilingual wajib menyimpan locale, revisi, opsi/kunci, dan hasil pada snapshot milik context aktivitas; perubahan preference berlaku untuk sesi baru.
