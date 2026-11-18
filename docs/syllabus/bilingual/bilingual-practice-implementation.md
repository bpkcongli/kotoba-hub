# Random practice dan AI bilingual — BIL-06

## Kontrak runtime

Random practice mendukung bahasa bantuan `en`/`id`; bahasa Jepang tetap bahasa
belajar. Empat tipe soal dan ownership grading tetap mengikuti
[practice engine](../../practice-engine.md). Bank post-study lesson tetap kurasi
syllabus dan memakai delivery/receipt BIL-03, terpisah dari generasi AI.

`POST /api/v1/practice/sessions/generate` menerima salah satu bentuk berikut:

- Legacy: `{ "questionCount": 5 }` atau body kosong; bahasa Inggris.
- Localized: `{ "questionCount": 5, "contentFormat": "localized", "contentLocale": "id" }`.
  `contentLocale` opsional; resolusi: pilihan eksplisit → preferensi tersimpan → `en`.
  Locale tanpa `contentFormat` ditolak. Locale di luar `en`/`id` ditolak sebelum AI.

Sesi localized mengembalikan `language`:

```json
{ "instructionLocale": "id", "feedbackLocale": "id", "translationLocale": "id" }
```

Endpoint publik memakai satu content locale untuk ketiga peran tersebut. Shared AI
menerima ketiganya secara eksplisit dan terpisah agar bahasa bantuan tidak dianggap
bahasa sumber Jepang. Tidak ada locale pada ID skill, progress atau kunci mastery.

| Tipe | Prompt / jawaban | Grading |
| --- | --- | --- |
| `SHORT_FREE_RESPONSE` | Jepang / kana | Deterministik |
| `SLOT_FILL` | Jepang / empat opsi Jepang | Deterministik |
| `ARRANGE_TOKEN` | `EN_TO_JA`, `JA_TO_EN`, `ID_TO_JA`, `JA_TO_ID` sesuai `translationLocale` | Urutan token snapshot |
| `FREE_RESPONSE` | Satu kalimat Inggris atau Indonesia / Jepang | AI |

`promptLanguage`/`answerLanguage` memakai `EN`/`ID`/`JA`; `schemaVersion` prompt
masih `1`, sedangkan versi template AI menjadi `2`. Validator memeriksa kesesuaian
arah, metadata bahasa, script, opsi dan kunci. Output pasangan lain ditolak melalui
retry terbatas; tidak dialihkan diam-diam ke Inggris. Pemeriksaan script Latin
bukan bukti bahwa suatu kalimat benar berbahasa Inggris atau Indonesia; kualitas
bahasa alami masih memerlukan evaluasi konten.

## Snapshot, persistence dan retry

Bahasa sesi disimpan secara additive di JSON `recommendation_spec.language`.
`question_snapshot` menyimpan prompt, opsi/token dan kunci; `answer_payload` dan
`result_payload` menyimpan feedback final serta `language` respons. Tidak diperlukan
migration baru. Sesi existing tanpa `language` tetap English dan bentuk DTO legacy
tidak ditambah field tersebut.

Grading mengambil bahasa dari sesi tersimpan, tidak membaca ulang preferensi.
Jawaban tersimpan diperiksa sebelum grading; retry payload identik mengembalikan
hasil tersimpan tanpa generation/grading ulang. Retry progress yang belum selesai
memakai event ID lama. Bahasa tidak menjadi bagian fingerprint jawaban karena
sudah terikat pada session ID. Key/rubric/context recommendation tidak muncul di
DTO publik. Generate tetap operasi baru setiap pemanggilan sebagaimana kontrak
legacy; ini bukan endpoint idempotent untuk pembuatan sesi.

Shared AI menormalisasi request legacy tanpa `language` ke `en`. Snapshot bahasa
masuk ke input provider dan metadata observability bersama versi template dan
ukuran katalog. Prompt, note onboarding, jawaban dan feedback mentah tidak dicatat
pada log default. Retry provider mempertahankan input bahasa yang sama.

## Output AI lain

Placement menghasilkan kode skill/confidence, dan study recommendation menghasilkan
referensi katalog/difficulty; keduanya tidak menghasilkan alasan atau prosa publik.
Jangan menambahkan alasan hasil AI atau menerjemahkan ulang identitas canonical.
Kontrak shared AI menerima snapshot bahasa pada seluruh operasi; judul suggestion
berasal dari katalog syllabus, bukan teks karangan provider. I18n seluruh UI/API,
pemilih bahasa dan formatter tetap BIL-07.

## Verifikasi

Verifikasi 18 November 2026:

- `bun run check` lulus: lint, typecheck, format, empat pengujian release dan
  64 suite / 750 tes Jest. Build production lulus. YAML OpenAPI beserta referensi
  schema lokal diperiksa; tidak ada migration baru.

- Unit/component melalui provider test double dan HTTP/MSW memeriksa pasangan
  EN/ID↔JA, penolakan mismatch/null/locale parsial, retry provider dengan bahasa
  tetap, grading setara, payload privacy, legacy dan auth/DTO boundary.
- Pergantian preferensi `id` → `en` setelah generate tidak mengubah sesi/retry;
  generate berikutnya mengikuti preferensi baru. Respons feedback dengan bahasa
  berbeda ditolak sebelum state progress frontend berubah.
- Smoke MySQL 8.4 lulus: migration existing, ownership/order, concurrent answer,
  replay dan progress/receipt recovery, quiz canonical, serta roundtrip JSON bahasa
  sesi/hasil untuk Inggris dan Indonesia. Smoke AI memeriksa metadata bahasa/versi
  pada request sukses/retry/gagal dan privasi payload; tidak memakai provider live.
- Chrome 1440×1000 dan 390×844 lulus: arah ID_TO_JA/JA_TO_ID, instruksi, atribut
  lang prompt/token/feedback, dan sesi tetap Indonesia sesudah preferensi berubah.
  Tidak ada overflow horizontal atau exception JS. Auth/preferences memakai DB test;
  generation/grading HTTP memakai fixture deterministik via CDP. Screenshot berada
  di `/tmp/bil06-browser-evidence/`. Ini bukan suite E2E TEST-11 atau evaluasi model.
- Subagent meninjau kontrak, snapshot/retry dan matriks regresi dari excerpt yang
  dikirim. Tool workspace tidak tersedia pada subagent; agent utama melakukan
  seluruh edit, integrasi dan eksekusi. Review ini tidak diklaim sebagai audit
  independen seluruh repository.

Contoh semantik untuk evaluasi Inggris/Indonesia:

| Sumber Inggris | Sumber Indonesia | Jawaban Jepang | Makna |
| --- | --- | --- | --- |
| I am a student. | Saya seorang pelajar. | わたしはがくせいです。 / 私は学生です。 | Setara; kana/kanji tidak mengubah makna |
| I am a student. | Saya seorang pelajar. | 私は先生です。 | Berbeda: guru, bukan pelajar |
| It is morning. | Sekarang pagi. | あさです。 | Setara dalam konteks waktu saat ini |

Tes dengan verdict fixture memeriksa kontrak/penerusan hasil, bukan kemampuan
model menilai contoh tersebut. Pemeriksaan script/metadata tidak membuktikan
bahasa alami, kebenaran soal atau pedagoginya. Evaluasi model live (termasuk jawaban
salah dan alternatif natural), latency/biaya serta rollout production tetap BIL-08;
tidak ada provider live atau database production yang diubah pada verifikasi ini.
