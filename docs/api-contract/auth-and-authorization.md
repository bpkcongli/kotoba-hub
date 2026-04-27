# API Contract Authentication And Authorization

## Scope
- Dokumen ini menyelesaikan task `ARCH-13`.
- Fokusnya adalah kontrak API untuk authentication dan authorization MVP, diturunkan dari sequence diagram login Google, route guard onboarding, dan ERD `users`, `accounts`, `sessions`, `learner_profiles`.
- Dokumen ini melengkapi base contract di `docs/api-contract/README.md`, bukan menggantikannya.

## Source References
- Sequence login: [login-session-established.md](../sequence-diagram/login-session-established.md)
- Sequence onboarding guard: [onboarding-personalization.md](../sequence-diagram/onboarding-personalization.md)
- ERD auth dan user profile: [auth-and-user-profile.md](../erd/auth-and-user-profile.md)

## Domain IDs
- `01` untuk `auth / authz`

## Design Goals
- Menjaga ownership tetap jelas: `auth` memiliki login flow, linked account, dan session lifecycle.
- Menyediakan kontrak minimal yang cukup untuk web app memulai login, menyelesaikan callback, membaca session state, dan sign-out.
- Mendefinisikan authorization MVP berbasis state, bukan RBAC, agar protected route dan onboarding gate konsisten sejak awal.

## Core Decisions
- Provider auth MVP hanya `Google OAuth`.
- Auth aplikasi memakai session cookie, bukan bearer token.
- Authorization MVP belum memakai role/permission matrix. Rule akses utamanya hanya:
  - request punya session valid atau tidak
  - `learner_profiles.onboarding_completed` sudah `true` atau belum
- `auth` boleh mengembalikan ringkasan authorization state untuk kebutuhan guard, tetapi source of truth `onboarding_completed` tetap milik module `users`.

## Endpoint Summary

| Method | Path | Purpose | Auth Requirement |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/google/start` | Memulai login Google dan redirect ke provider OAuth | Public |
| `GET` | `/api/v1/auth/callback/google` | Menyelesaikan callback Google, provisioning user bila perlu, lalu membuat session | Public |
| `GET` | `/api/v1/auth/session` | Mengembalikan snapshot session + authorization state untuk current visitor | Public |
| `POST` | `/api/v1/auth/sign-out` | Mengakhiri session aktif dan menghapus cookie | Public-idempotent |

## Endpoint Details

### `POST /api/v1/auth/google/start`
Memulai flow OAuth ke Google.

Behavior:
- Memvalidasi optional query `redirectTo`.
- Membuat state internal yang dibutuhkan auth adapter.
- Merespons dengan redirect `302` ke authorization URL milik Google.

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `redirectTo` | `string` | no | Relative path aplikasi tujuan setelah login selesai, mis. `/dashboard`. Jika tidak diisi, default diarahkan ke app home atau onboarding guard. |

Success response:
- HTTP `302 Found`
- Header `Location` berisi Google authorization URL

Validation error:
- HTTP `422` bila `redirectTo` tidak valid atau bukan relative path aman

### `GET /api/v1/auth/callback/google`
Endpoint callback dari provider OAuth.

Behavior:
- Menerima hasil OAuth dari Google.
- Mengecek linked account di storage milik `auth`.
- Jika first-time login, `auth` memanggil `users` untuk provisioning user dasar.
- Membuat session dan session cookie.
- Redirect ke route tujuan aplikasi.

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `code` | `string` | conditional | Authorization code dari Google. Wajib saat callback sukses. |
| `state` | `string` | conditional | State verifier untuk proteksi OAuth flow. Wajib saat callback sukses. |
| `error` | `string` | conditional | Error code dari provider bila user membatalkan atau provider menolak login. |

Success response:
- HTTP `302 Found`
- Header `Set-Cookie` mengisi session cookie aplikasi
- Header `Location` mengarah ke route pasca-login

Failure response:
- HTTP `401` bila identity provider gagal diverifikasi atau callback tidak bisa menghasilkan session valid
- HTTP `422` bila parameter callback tidak lengkap atau state mismatch terdeteksi sebagai request invalid

### `GET /api/v1/auth/session`
Mengembalikan snapshot session untuk visitor saat ini. Endpoint ini sengaja `public` agar UI bisa memeriksa status auth tanpa memaksa error `401` pada page load.

Behavior:
- Jika cookie session valid ditemukan, endpoint mengembalikan detail session dan user.
- Endpoint juga mengembalikan authorization summary berbasis `onboarding_completed` untuk membantu route guard.
- Jika tidak ada session valid, endpoint tetap `200` dengan state `ANONYMOUS`.

Response shape:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120001000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "isAuthenticated": true,
    "sessionId": "uuid",
    "expiresAt": "2026-04-04T10:00:00Z",
    "user": {
      "id": "uuid",
      "email": "example@gmail.com",
      "displayName": "John Doe",
      "avatarUrl": "https://example.com/avatar.png",
      "emailVerified": true
    },
    "authorization": {
      "appAccess": "APP_READY",
      "onboardingCompleted": true
    }
  }
}
```

Possible states:
- `authorization.appAccess = ANONYMOUS` untuk visitor tanpa session
- `authorization.appAccess = ONBOARDING_REQUIRED` untuk user login tetapi belum selesai onboarding
- `authorization.appAccess = APP_READY` untuk user login dan onboarding selesai

### `POST /api/v1/auth/sign-out`
Mengakhiri session aktif.

Behavior:
- Jika ada session aktif, invalidate record session dan hapus cookie.
- Jika session tidak ada, endpoint tetap merespons sukses agar sign-out bersifat idempotent.

Success response:
- HTTP `200 OK`
- Menggunakan success envelope tanpa `data`
- Cookie session dikosongkan/expired

## Authorization Model

### Access states
- `ANONYMOUS`: belum login atau session tidak valid
- `ONBOARDING_REQUIRED`: login berhasil, tetapi `learner_profile` belum ada atau `onboarding_completed = false`
- `APP_READY`: login berhasil dan onboarding selesai

### Authorization rules
- Endpoint public boleh diakses semua visitor.
- Endpoint assessment onboarding boleh diakses user dengan state `ONBOARDING_REQUIRED` maupun `APP_READY`, selama session valid.
- Endpoint area belajar inti seperti `syllabus`, `flashcards`, `practice`, dan `progress` harus minimal `APP_READY`.
- Bila request tidak punya session valid, kembalikan `401`.
- Bila request punya session valid tetapi belum memenuhi access state yang dibutuhkan, kembalikan `403`.

### Guard matrix for next contracts

| Access Requirement | Applicable Endpoints |
| --- | --- |
| Public | `/api/v1/auth/google/start`, `/api/v1/auth/callback/google`, `/api/v1/auth/session`, `/api/v1/auth/sign-out` |
| Authenticated session required | endpoint personalization yang menulis/menegaskan learner profile, serta `GET /api/v1/syllabus` untuk reference data onboarding |
| Authenticated + onboarding completed | endpoint detail belajar seperti `GET /api/v1/syllabus/units/{unitSlug}`, `flashcards`, `practice`, dan `progress` |

## Suggested Error Code Seeds

| HTTP Status | Application Code | Meaning |
| --- | --- | --- |
| `401` | `140101001` | Session tidak ada atau tidak valid |
| `401` | `140101002` | Google callback gagal menghasilkan identity valid |
| `403` | `140301001` | Forbidden generic |
| `403` | `140301002` | Onboarding belum selesai untuk endpoint yang memerlukan app access penuh |
| `422` | `142201001` | Validation error generic |
| `422` | `142201002` | Query `redirectTo` tidak valid |
| `422` | `142201003` | OAuth callback parameter tidak lengkap atau state mismatch |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.auth.yaml`.

## Notes For Follow-up Tasks
- `ARCH-14` perlu mengikuti guard matrix ini saat mendefinisikan endpoint `syllabus` dan `personalization`.
- `ARCH-15` perlu memakai `403 onboarding required` untuk endpoint feature yang belum boleh diakses sebelum onboarding selesai.
