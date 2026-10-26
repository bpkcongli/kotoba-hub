# Integrasi OpenAI — IMP-08

## Scope dan keputusan

`IMP-08` menyediakan fondasi AI backend pada context `shared`: kontrak empat operasi,
prompt lokal berversi, validasi schema dan referensi katalog, adapter OpenAI Responses,
retry terbatas, serta observability request/attempt. Endpoint random practice dan
assessment yang memakai fondasi ini dikerjakan pada `IMP-09` dan `IMP-10`.

Baseline tetap [MVP plan](./mvp-plan.md), [arsitektur](../ARCHITECTURE.md),
[ERD AI](./erd/ai-support-and-observability.md), [kontrak practice](./api-contract/practice.md),
dan [kontrak personalization](./api-contract/user-profile-and-personalization.md).
Dokumen eksperimen di `docs/drafts/` belum mengganti baseline MVP: context berasal dari
data user yang diotorisasi dan katalog resmi; integrasi ini tidak menambahkan RAG umum.

Default model diperbarui pada **26 Oktober 2026** mengikuti pengganti resmi:

| Operasi | Default model |
| --- | --- |
| Generate practice, grade `FREE_RESPONSE`, study recommendation | `gpt-5.6-terra` |
| Placement summary / normalisasi catatan onboarding | `gpt-5.6-luna` |

`gpt-5-mini` dan `gpt-5-nano` pada rencana awal sudah deprecated, dengan penghentian
pada 11 Desember 2026. Lihat [jadwal resmi](https://developers.openai.com/api/docs/deprecations).
Model adalah konfigurasi, bukan bagian kontrak domain; akses nyata tetap bergantung
pada project API pengguna.

## Yang perlu disiapkan oleh pemilik project

1. **Akun dan project OpenAI Platform.** Pisahkan project development dan production
   agar key, izin, serta penggunaan dapat dikelola sendiri. Aplikasi ini menggunakan
   API key server; biaya API terpisah dari langganan ChatGPT Plus. Lihat
   [OpenAI Docs tentang penagihan](https://learn.chatgpt.com/docs/pricing) dan
   [panduan API](https://developers.openai.com/api/docs/quickstart).
2. **Billing/kredit API aktif dan akses model.** Pastikan model yang dipilih tersedia
   untuk project tersebut. Periksa usage limits dan notifikasi pengeluaran pada
   dashboard. Tetapkan anggaran awal sesuai kebutuhan; jangan menganggap estimasi
   biaya pada log aplikasi sebagai pembatas tagihan otomatis.
3. **API key milik project untuk server.** Buat key dengan izin yang diperlukan untuk
   Responses API. Simpan dalam `.env` yang diabaikan Git untuk lokal dan secret
   environment pada deployment. Jangan memakai prefix `NEXT_PUBLIC_`, mengirim key
   ke browser, atau memasukkannya ke prompt/log. Lihat
   [autentikasi API resmi](https://developers.openai.com/api/reference/overview).
4. **Backend dan MySQL siap.** `DATABASE_URL` harus valid dan migration observability
   sudah diterapkan. Tidak diperlukan vector database untuk baseline ini.
5. **Akses HTTPS keluar ke `api.openai.com`.** Adapter menggunakan endpoint Responses
   resmi; konfigurasi reverse proxy aplikasi tidak menggantikan akses keluar ini.
6. **Contoh evaluasi bahasa Jepang.** Siapkan pasangan prompt/jawaban N5–N4 yang
   mewakili jawaban benar, salah, alternatif yang valid, kana/kanji, serta catatan
   onboarding ambigu. Uji relevance, kesesuaian difficulty, grading, dan feedback
   sebelum flow learner diaktifkan. Schema valid tidak menjamin konten benar.

## Environment

Tambahkan nilai berikut ke `.env` lokal yang sudah ada; jangan menimpa konfigurasi
database/auth yang telah diisi. `.env.example` menyediakan template tanpa secret.

```dotenv
AI_PROVIDER=OPENAI
OPENAI_API_KEY=isi-key-project-di-file-lokal
OPENAI_GENERATION_MODEL=gpt-5.6-terra
OPENAI_NORMALIZATION_MODEL=gpt-5.6-luna
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=1
AI_RETRY_DELAY_MS=250
AI_MAX_OUTPUT_TOKENS=8192
AI_MAX_INPUT_CHARS=40000
```

| Variable | Aturan |
| --- | --- |
| `AI_PROVIDER` | Adapter terpasang: `OPENAI`. Provider lain diinjeksikan melalui port saat implementasinya tersedia. |
| `OPENAI_API_KEY` | Server only. Boleh kosong untuk pengembangan fitur lain; operasi AI gagal jelas saat key belum tersedia. |
| `OPENAI_GENERATION_MODEL` | Model generation/grading/recommendation; identifier maksimum 100 karakter. |
| `OPENAI_NORMALIZATION_MODEL` | Model placement summary/normalisasi ringan; identifier maksimum 100 karakter. |
| `AI_TIMEOUT_MS` | Deadline satu attempt, 100–120000 ms; default 30000. |
| `AI_MAX_RETRIES` | 0–2 retry setelah attempt pertama; default 1, jadi maksimum 2 attempt. |
| `AI_RETRY_DELAY_MS` | Jeda dasar retry 0–5000 ms; default 250. |
| `AI_MAX_OUTPUT_TOKENS` | Batas output tiap attempt, 256–16384; default 8192. |
| `AI_MAX_INPUT_CHARS` | Batas context/input serialized, 1000–100000 karakter; default 40000. Bukan penghitungan token. |

Restart proses setelah mengubah environment. `compose.yaml` meneruskan setting
tersebut ke runtime app; secret tidak dimasukkan ke image pada build.
Konfigurasi AI dibaca saat service diminta, sehingga key OpenAI tidak menjadi
syarat startup fitur auth, syllabus, progress, atau flashcard.

## Menyiapkan database dan verifikasi

1. Tinjau SQL migration AI baru di `drizzle/`, kemudian terapkan ke database tujuan:

   ```sh
   bun run db:migrate
   ```

   Perintah ini mengubah database pada `DATABASE_URL`; gunakan target yang memang
   hendak dimigrasi. Startup aplikasi tidak menerapkan migration otomatis.

2. Jalankan pengujian tanpa API key atau biaya OpenAI:

   ```sh
   bun run test:ci -- tests/unit/ai
   bun run lint
   bun run typecheck
   ```

3. Untuk verifikasi persistence, siapkan database MySQL **kosong dan terpisah** yang
   namanya berakhiran `_test`. Set `AI_TEST_DATABASE_URL` ke database tersebut,
   berbeda dari `DATABASE_URL`, lalu jalankan:

   ```sh
   bun run test:ai --allow-test-db-write
   ```

   Smoke ini memakai provider test double dan menulis hanya ke database test.
   Tidak memerlukan API key, tidak memanggil OpenAI, dan tidak menerapkan migration
   ke database aplikasi biasa. Lihat [workflow database](../drizzle/README.md).

4. Setelah key/billing tersedia dan sebelum rollout `IMP-09`/`IMP-10`, jalankan
   evaluasi kecil melalui service dengan context katalog yang sah. Request live
   akan memakai kredit API; pengujian unit/smoke di atas belum membuktikan akses
   akun, kualitas bahasa Jepang, atau latency provider nyata.

## Batas integrasi dan observability

- Consumer bertanggung jawab menjalankan authorization dan membangun context dari
  data user yang sesuai. Shared AI tidak membaca tabel milik context lain dan
  tidak menetapkan profile/mastery secara langsung.
- `generatePracticeSession`, `gradePracticeAnswer`, `summarizePlacement`, dan
  `generateStudyRecommendation` adalah kontrak aplikasi. Payload provider terpisah
  dari DTO publik; consumer tetap memvalidasi dan memetakan hasil ke kontrak HTTP.
- AI grading hanya untuk `FREE_RESPONSE`. Flashcard, `SHORT_FREE_RESPONSE`,
  `SLOT_FILL`, `ARRANGE_TOKEN`, serta post-study quiz tetap dinilai deterministik.
  Bank soal post-study quiz tetap milik `syllabus`; normalisasi onboarding hanya
  menghasilkan draft yang memerlukan konfirmasi learner.
- Log menyimpan metadata request/attempt, model, latency, usage, estimasi biaya,
  status parse, retry, dan failure code yang aman. Prompt, catatan bebas, jawaban
  learner, dan raw error provider tidak diperlukan untuk log default ini.
- Estimasi biaya menggunakan usage yang dikembalikan provider dan rate model
  yang diketahui. Model yang belum memiliki rate menghasilkan estimasi `null`;
  tagihan pada OpenAI Platform tetap acuan akhir. Perubahan model/harga perlu
  memperbarui rate dan evaluasi. Retry dapat menambah biaya.
- Batas karakter, output, dan retry mengendalikan beban tiap request, bukan kuota
  harian per user atau batas pengeluaran bulanan. Rate limiting per user dan kuota
  aplikasi perlu dirangkai pada flow consumer sebelum dibuka ke banyak learner.
- Adapter memakai `store: false` untuk respons. Setting tersebut tidak sama dengan
  Zero Data Retention; kebijakan penyimpanan provider tetap mengikuti
  [data controls OpenAI](https://developers.openai.com/api/docs/guides/your-data).

## Referensi API yang diperiksa

- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): schema JSON ketat dan penanganan refusal/incomplete response.
- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) dan [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna): model, dukungan, dan harga teks standar yang dipakai untuk estimasi awal.
- [Production best practices](https://developers.openai.com/api/docs/guides/production-best-practices): pemisahan environment, key, monitoring, dan pengelolaan penggunaan.

Verifikasi sumber: 26 Oktober 2026. Periksa ulang akses model, harga, dan kebijakan
provider ketika mengaktifkan integrasi live.

## Hasil verifikasi IMP-08

Verifikasi implementasi selesai pada 26 Oktober 2026:

- `bun run check`: lint, typecheck, format, dan **356 tes pada 32 suite** lulus, termasuk **92 tes AI**.
- Smoke MySQL 8.4 pada instance sementara dan database `_test` terpisah lulus: migration, penyimpanan request/attempt, retry, usage/biaya kumulatif, refusal, penolakan request key duplikat, dan privasi payload. Provider memakai test double; database aplikasi tidak diubah. Instance sementara sudah dihentikan.
- Temuan review tentang token bahasa Jepang yang lolos pada soal `JA_TO_EN` sudah diperbaiki dan dilindungi tes regresi.

`IMP-08` selesai sebagai fondasi backend. Integrasi endpoint consumer tetap milik
`IMP-09`/`IMP-10`. Pemanggilan model live belum diuji; siapkan akun, billing, key,
akses model, dan evaluasi seperti langkah di atas sebelum mengaktifkannya.
