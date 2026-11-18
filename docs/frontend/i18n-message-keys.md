# Key pesan frontend

Katalog UI KotobaHub memakai semantic key dengan format:

```text
<CONTEXT>:<FEATURE>.<ELEMENT>.<PROPERTY>[.<DETAIL>...]

ONBOARDING:ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL
PRACTICE:PRACTICE_HUB.START_PRACTICE_BUTTON.LOADING_LABEL
```

Semua segmen memakai `UPPER_SNAKE_CASE`. Key menjelaskan tanggung jawab elemen,
bukan menyalin kalimat terjemahan. Perubahan wording tidak memerlukan perubahan
key. Gunakan properti seperti `TITLE`, `DESCRIPTION`, `LABEL`, `LOADING_LABEL`,
`PLACEHOLDER`, `HELP_TEXT`, `ARIA_LABEL`, dan `VALIDATION_MESSAGE` sesuai tujuan.

## Struktur dan pemilik

Kedua file `src/shared/i18n/messages/{en,id}.json` memiliki struktur bertingkat
yang sama: domain → fitur → elemen → properti. Leaf selalu string, termasuk
pesan ICU. Contohnya:

```json
{
  "ONBOARDING": {
    "ONBOARDING_SCREEN": {
      "CONTINUE_ONBOARDING_BUTTON": {
        "LABEL": "Continue onboarding"
      }
    }
  }
}
```

| Domain | Pemilik pesan |
| --- | --- |
| `AUTH` | Login, handoff autentikasi, dan pemeriksaan session pada workspace onboarding |
| `ONBOARDING` | Form assessment, review, konfirmasi, dan validasi lokal |
| `SYLLABUS` | Map, unit/lesson detail, materi, serta kontrol bahasa konten |
| `FLASHCARDS` | Deck/setup, session, summary, feedback, dan status bucket kartu |
| `PRACTICE` | Setup/session random practice, lesson post-study quiz, input dan feedback jawaban |
| `PROGRESS` | Dashboard, overview, history, pagination, dan status understanding |
| `SHARED` | Shell/navigasi, landing, bahasa/script, aksi/status umum, client error dan metadata situs |

Pesan yang sama secara teks belum tentu memiliki arti yang sama. Misalnya,
`ONBOARDING:FOCUS_OPTIONS.READING.LABEL` dan
`SHARED:LEARNING_STATUS.READING.LABEL` memiliki ownership terpisah. Gunakan
`SHARED` hanya ketika makna dan tanggung jawabnya memang lintas fitur. Consumer
boleh memakai key milik fitur lain untuk aksi yang menuju fitur tersebut.

## API React dan helper

React memakai hook shared melalui barrel frontend:

```tsx
import { useUiTranslations } from '@/frontend/shared/hooks';

const t = useUiTranslations();

return <button>{t('ONBOARDING:ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL')}</button>;
```

Helper murni dan metadata server tetap memakai translator dengan locale eksplisit:

```ts
import { uiTranslator, type UiMessageKey } from '@/shared/i18n';

const titleKey: UiMessageKey = 'PRACTICE:PRACTICE_SESSION.PAGE.TITLE';
const title = uiTranslator('id')(titleKey);
```

`UiMessageKey` diturunkan dari katalog Inggris pada compile time; tidak memuat
salinan runtime registry key. Map enum/navigasi yang menyimpan key harus memakai
`UiMessageKey`, `satisfies`, atau literal `as const` agar typo terdeteksi.
`pageMetadata` juga menerima tipe key tersebut.

Hook dan helper memakai adapter yang sama di `src/shared/i18n/translation.ts`.
Adapter hanya mengganti separator `:` pertama menjadi `.` sebelum memanggil
`next-intl`; namespace domain adalah object tingkat pertama pada katalog.
Interpolasi, pluralisasi, escaping teks React, dan formatting tetap ditangani
library. Tidak ada engine template tambahan atau alias key flat lama.
[Nested messages next-intl](https://next-intl.dev/docs/usage/translations#structuring-messages)
menggunakan titik untuk lookup object bertingkat.

Provider tetap berada di bawah container frontend, memakai locale bootstrap dan
katalog yang sama untuk SSR/hydration. Hook translation tidak mengakses backend
atau memulai fetch. Helper server tidak memakai instance locale mutable global.
Perubahan UI locale tetap mempertahankan scope store/input dan snapshot aktivitas.

## Fallback, validasi, dan batas konten

English tetap default dan fallback per leaf; kamus Indonesia digabung secara
rekursif dengan baseline Inggris tanpa memutasi salah satunya. Sibling Indonesia
yang tersedia tetap dipakai jika satu leaf hilang. Kelengkapan katalog mentah
`en/id` tetap wajib pada tes, sehingga fallback tidak menyembunyikan kekurangan
terjemahan saat pengembangan.

Schema onboarding lokal menyimpan key
`ONBOARDING:ASSESSMENT_FORM.<FIELD>.VALIDATION_MESSAGE`, lalu UI menerjemahkannya
saat render. `validationMessage` hanya menerima descriptor dari kelompok tersebut
yang tersedia; pesan API tetap diteruskan sebagai teks. `errorMessage` mempertahankan
jalur numeric application code dari backend dan hanya menerjemahkan kind error
client yang dikenal.

Judul materi/deck, prompt/opsi Jepang, explanation/feedback snapshot, enum request,
ID, dan nilai jawaban tetap data fitur. Key UI tidak menjadi field API, cache key
aktivitas, ataupun kunci idempotensi. Struktur katalog dan localizer backend tidak
diubah oleh pengelompokan frontend ini.

## Menambah atau mengubah pesan

1. Pilih pemilik domain, fitur, elemen, dan properti berdasarkan tanggung jawab UI.
2. Tambahkan leaf string pada posisi yang sama di katalog Inggris dan Indonesia.
3. Gunakan placeholder ICU bernama dengan nama yang sama pada kedua bahasa;
   kalimat dinamis memakai interpolasi/plural library, bukan gabungan key baru.
4. Gunakan fully qualified key pada hook/helper, termasuk map enum, validasi dan
   metadata. Jangan memanggil `useTranslations` langsung dari consumer aplikasi.
5. Jalankan tes katalog, typecheck, serta tes komponen terkait bila flow berubah.

`tests/unit/i18n/messages.test.ts` memeriksa bentuk/nama key, kelengkapan kedua
bahasa, placeholder, rendering semua pesan ICU, separator key, isolasi translator,
fallback nested, dan descriptor validasi. Tes komponen tetap memeriksa pergantian
bahasa, SSR/hydration, partial preference update dan input/retry aktivitas.
