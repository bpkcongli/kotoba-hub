# Login (Until Session Established) Sequence Diagram

## Scope
- Diagram ini hanya memodelkan flow login Google sampai session berhasil dibuat.
- Flow berhenti di titik `session established`, belum masuk ke pemeriksaan onboarding atau redirect ke dashboard.
- Fokus utamanya ada pada boundary `auth -> users` saat provisioning user pertama kali.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    participant App as Web App / App Router
    participant Auth as Auth Module
    participant Google as Google OAuth
    participant Users as Users Module
    participant DB as MySQL

    Learner->>App: Klik "Continue with Google"
    App->>Auth: Start Google sign-in
    Auth->>Google: Redirect OAuth authorization request
    Google-->>Learner: Consent + account selection
    Google-->>Auth: OAuth callback + identity payload

    Auth->>DB: Check linked account
    alt First-time Google login
        Auth->>Users: Provision user from Google identity
        Users->>DB: Insert users row
        Users-->>Auth: user_id
        Auth->>DB: Insert linked account + create session
    else Returning Google login
        Auth->>DB: Reuse existing account + create session
    end

    Auth-->>App: Session established
    App-->>Learner: Authenticated state ready
```

## Key Decisions Locked By This Diagram
- `auth` tetap menjadi owner untuk login flow, account linking, dan session lifecycle.
- Pada login pertama, `auth` boleh memicu provisioning user dasar lewat `users`.
- Session dibuat setelah account linkage valid, bukan langsung dari payload Google tanpa persistence internal.

## Expected Outcome
- Login Google selalu berakhir pada session aktif yang siap dipakai oleh route guard atau flow onboarding berikutnya.
