# AGENTS.md

## Purpose
- File ini adalah panduan kerja untuk agent yang berkontribusi di repository `kotoba-flow`.
- Kondisi project saat ini masih berada pada tahap awal planning dan dokumentasi.
- Karena itu, `docs/` adalah source of truth utama sebelum agent melakukan analisis, implementasi, revisi, atau review.

## Mandatory Reading Order
Sebelum mengerjakan task apa pun, agent wajib membaca dokumen berikut dalam urutan ini:

1. [docs/task-breakdown.md](docs/task-breakdown.md)
2. Dokumen referensi yang ditautkan oleh task terkait di dalam `docs/task-breakdown.md`
3. Dokumen pendukung lain di folder [docs/](docs/) yang masih relevan dengan task

Jangan mulai coding, membuat file baru, mengubah arsitektur, atau menyimpulkan requirement hanya dari asumsi tanpa mengecek `docs/` lebih dulu.

## Core Rule
- Semua task yang didefinisikan di [docs/task-breakdown.md](docs/task-breakdown.md) harus dikerjakan dengan mengacu ke dokumentasi di folder [docs/](docs/) terlebih dahulu.
- Jika sebuah task memiliki tautan ke architecture doc, ERD, sequence diagram, API contract, atau dokumen lain, agent wajib membaca dokumen tersebut sebelum mulai bekerja.
- Jika ada konflik antara asumsi agent dan dokumentasi di `docs/`, prioritaskan dokumentasi lalu catat mismatch yang ditemukan.

## Expected Workflow For Every Task
Untuk setiap task yang diambil dari [docs/task-breakdown.md](docs/task-breakdown.md), agent harus mengikuti alur ini:

1. Identifikasi ID task dan status checklist-nya.
2. Baca deskripsi task beserta seluruh dokumen yang dirujuk pada task tersebut.
3. Pahami dependency dan urutan kerja yang ditetapkan dalam `docs/task-breakdown.md`.
4. Pastikan output yang akan dikerjakan konsisten dengan dokumen architecture, ERD, sequence diagram, API contract, atau plan terkait.
5. Baru setelah itu lakukan eksekusi task.

## Planning-First Guardrails
- Pada fase project saat ini, dokumentasi didahulukan dari implementasi.
- Jangan memulai task implementasi bila dokumen prasyaratnya belum ada, belum final, atau belum konsisten.
- Untuk task implementasi, anggap dokumen architecture, ERD, sequence diagram, dan API contract sebagai baseline requirement.
- Bila task masih ambigu, kekurangan konteks, atau referensinya belum cukup, agent harus kembali ke `docs/` dan memperjelas kebutuhan sebelum lanjut.

## Documentation Priority
Gunakan panduan prioritas berikut saat mencari referensi:

- Breakdown dan urutan kerja: [docs/task-breakdown.md](docs/task-breakdown.md)
- Fondasi arsitektur: [docs/architecture-foundation.md](docs/architecture-foundation.md)
- Rencana MVP dan scope: [docs/mvp-plan.md](docs/mvp-plan.md)
- ERD domain: [docs/erd/](docs/erd/)
- Sequence diagram: [docs/sequence-diagram/](docs/sequence-diagram/)
- API contract dan OpenAPI: [docs/api-contract/](docs/api-contract/)

## If Documentation Is Missing Or Mismatched
- Jika task di `docs/task-breakdown.md` belum punya referensi yang cukup di `docs/`, jangan asal implementasi.
- Jika menemukan inkonsistensi antar dokumen, hentikan eksekusi yang berisiko dan tandai mismatch tersebut.
- Jika implementasi atau usulan perubahan memengaruhi dokumentasi, update dokumentasi terkait atau sebutkan dengan jelas dokumen mana yang perlu diselaraskan.

## Non-Negotiable Rule
Sebelum mengerjakan task yang didefinisikan di [docs/task-breakdown.md](docs/task-breakdown.md), agent harus selalu refer ke folder [docs/](docs/) terlebih dahulu.
