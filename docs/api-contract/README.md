# API Contract Base

## Scope
- Dokumen ini menyelesaikan task `ARCH-12`.
- Fokusnya adalah fondasi kontrak API untuk `KotobaFlow`: metadata OpenAPI, auth scheme, response envelope, error response format, dan pagination/query convention.
- Endpoint detail per feature belum didefinisikan di dokumen ini; itu menjadi lanjutan untuk `ARCH-13`, `ARCH-14`, dan `ARCH-15`.

## Core Decisions
- Format kontrak memakai `OpenAPI 3.1.0`.
- Default prefix endpoint harus memakai versioning, yaitu `/api/v1/...`.
- Semua response memakai envelope yang konsisten melalui root field `status`, dan bila relevan ditambah `metadata` serta `data`.
- List response wajib membungkus array di bawah nama entity collection yang eksplisit, misalnya `flashcardItems`, bukan array anonim di root `data`.
- Pagination query memakai `offset` dan `limit`, sedangkan response metadata tetap dikembalikan dalam bentuk `pageNumber`, `pageSize`, dan `totalRecords` agar UI lebih mudah mengonsumsi hasilnya.

## Auth Scheme
- Auth utama MVP adalah session-based auth via cookie aplikasi.
- Security scheme yang dipakai di base OpenAPI adalah `cookieAuth` dengan cookie `authjs.session-token`.
- Endpoint public seperti login callback atau endpoint read-only yang memang dibuka ke publik nanti harus secara eksplisit override security requirement saat kontrak endpoint ditulis.

## Response Envelope

### Success response
Gunakan struktur berikut untuk seluruh response berhasil:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120000000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {}
}
```

### Success response untuk list
Gunakan envelope ini untuk endpoint yang mengembalikan koleksi:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120000000,
    "message": "Success!",
    "errorDetails": []
  },
  "metadata": {
    "pagination": {
      "pageNumber": 1,
      "pageSize": 10,
      "totalRecords": 2
    }
  },
  "data": {
    "flashcardItems": []
  }
}
```

Rules:
- `metadata.pagination` wajib ada pada list response.
- `data` wajib berupa object.
- Field di dalam `data` untuk koleksi wajib memakai nama entity yang eksplisit dan berbentuk plural camelCase, misalnya `flashcardItems`, `practiceQuestions`, `progressEvents`.

### Success response untuk object tunggal

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120000000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "email": "example@gmail.com",
    "fullName": "John Doe"
  }
}
```

### Success response tanpa return value

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120000000,
    "message": "Success!",
    "errorDetails": []
  }
}
```

## Error Response

```json
{
  "status": {
    "traceId": "uuid",
    "code": 142200001,
    "message": "error",
    "errorDetails": [
      {
        "field": "string",
        "message": "string"
      }
    ]
  }
}
```

Rules:
- `errorDetails` biasanya diisi untuk validation error `422`, dan untuk error lain default-nya boleh array kosong.
- `status.message` harus human-readable dan aman ditampilkan di UI bila memang dibutuhkan.
- Gunakan `401` saat request tidak memiliki session valid atau identity tidak bisa diverifikasi.
- Gunakan `403` saat session valid tetapi user belum memenuhi rule akses, misalnya belum menyelesaikan onboarding untuk endpoint yang mewajibkan app access penuh.

## Error Code Convention
- `status.code` adalah application-specific code 9 digit dengan format:

```text
[interface_type][status_code][domain_id][specific_error_code]
```

Field breakdown:
- `interface_type`: satu digit untuk tipe interface. Contoh awal: `1` untuk REST API.
- `status_code`: tiga digit HTTP status code, misalnya `200`, `401`, `422`, `500`.
- `domain_id`: dua digit untuk bounded context/domain, misalnya authentication and authorization, syllabus, flashcard, dan seterusnya.
- `specific_error_code`: tiga digit spesifik per domain. Untuk response non-error gunakan `000`. Untuk error tidak ter-handle gunakan `999`.

Contoh:
- `120000000`: REST API, HTTP `200`, domain `00`, success default
- `150000999`: REST API, HTTP `500`, domain `00`, unhandled exception
- `142200001`: REST API, HTTP `422`, domain `00`, validation error spesifik `001`

Rules:
- Code ini memungkinkan client dan tim backend membaca jenis interface, status HTTP, domain, dan error spesifik dari satu field yang konsisten.
- Gunakan `domain_id = 00` untuk response shared/common yang belum terikat ke satu domain bisnis spesifik.
- Domain yang sudah punya kontrak endpoint sendiri harus memakai `domain_id` yang stabil dan terdokumentasi.
- Dua error bisa berbagi HTTP status yang sama tetapi tetap dibedakan oleh `specific_error_code`.
- Jika nanti jumlah interface atau domain makin kompleks, registry `interface_type` dan `domain_id` harus dipelihara secara terpusat agar tidak bentrok.
- Karena code ini mengandung informasi yang terstruktur, field `status.code` sebaiknya diperlakukan sebagai identifier stabil aplikasi, bukan pengganti HTTP status itu sendiri.

## Trace ID Convention
- `status.traceId` direkomendasikan berupa UUID per request untuk korelasi log dan debugging.
- `traceId` sebaiknya tidak memakai entity id sebagai default, karena kebutuhan correlation id dan identity id berbeda.
- Jika response berhasil perlu mengembalikan resource id, simpan id tersebut di `data` atau field domain lain yang eksplisit. Untuk error response, jangan tambahkan `data`; gunakan `status.traceId` untuk korelasi ke log internal.

## Pagination And Query Convention

### Standard pagination query
- `offset`: zero-based jumlah record yang dilewati sebelum mengambil data.
- `limit`: jumlah maksimal record yang diambil.

Example:

```text
GET /api/v1/flashcards/decks?offset=0&limit=10
```

### Pagination metadata mapping
- `pageNumber = floor(offset / limit) + 1`
- `pageSize = limit`
- `totalRecords = total hasil query tanpa pagination`

### Query naming convention
- Gunakan `camelCase` untuk nama query parameter, misalnya `unitSlug`, `skillId`, `includeArchived`.
- Boolean query memakai nilai literal `true` atau `false`.
- Jika endpoint butuh filter multi-value, gunakan separated commas, misalnya `?skillIds=a,b`.
- Query params pagination disimpan konsisten sebagai `offset` dan `limit`; jangan campur dengan `page`, `pageSize`, atau `cursor` di MVP kecuali memang ada keputusan arsitektur baru.

## Deliverables
- Base OpenAPI document tersedia di `docs/api-contract/openapi.base.yaml`.
- Dokumen ini menjadi referensi naratif untuk pengisian contract endpoint pada task berikutnya.

## Open Questions For Later Tasks
- Finalisasi registry `domain_id` per module.
- Finalisasi daftar `specific_error_code` per module.
- Perlu atau tidak menggandakan `traceId` ke response header seperti `X-Trace-Id`.
- Perlu atau tidak menyiapkan strategi deprecation saat nanti muncul `/api/v2`.
