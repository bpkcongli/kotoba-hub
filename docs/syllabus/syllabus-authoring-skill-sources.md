# Attribution skill authoring syllabus

Skill proyek ditulis untuk kontrak KotobaHub. Prinsip yang relevan dari [Scibly Skills](https://github.com/scibly-dev/skills) diadaptasi sebagai panduan pedagogi, bukan diinstal sebagai dependensi global. Sumber diperiksa pada 2026-11-17 melalui branch `main`; referensi ini tidak mengklaim snapshot commit yang dipin.

| Sumber upstream | Adaptasi KotobaHub | Pemakai |
| --- | --- | --- |
| [didactic-reduction](https://github.com/scibly-dev/skills/blob/main/skills/didactic-reduction/SKILL.md) | Pilih inti yang dibutuhkan learner, kurangi kompleksitas sampingan, gunakan contoh sehari-hari dan transfer ke konteks baru; seluruh objective tetap dicakup | content-block-maker, reviewer |
| [assessment-design](https://github.com/scibly-dev/skills/blob/main/skills/assessment-design/SKILL.md) | Uji kemampuan target, hindari ambiguitas/trik, beri feedback yang menjelaskan alasan | post-study-question-maker, reviewer |
| [content-editing](https://github.com/scibly-dev/skills/blob/main/skills/content-editing/SKILL.md) | Review akurasi, kedalaman yang sesuai, struktur, istilah dan konsistensi gaya | content-review, kedua maker saat self-check |

Lisensi upstream: [MIT](https://github.com/scibly-dev/skills/blob/main/LICENSE), Copyright (c) 2026 Scibly; [salinan notice](licenses/scibly-MIT.txt) disertakan untuk adaptasi ini. Lisensi tersebut tidak berlaku otomatis untuk materi Bunpro/Tae Kim/Tatoeba.

Konvensi upstream untuk jenis assessment, jumlah opsi, skala umum atau tahapan konfirmasi tidak diimpor. Kontrak proyek tetap menetapkan `SHORT_FREE_RESPONSE`, satu blank Jepang, dua paket bantuan `en/id`, satu bank sepuluh soal dan ladder `1..10`. Bloom dapat membantu berpikir tentang variasi tugas, tetapi tidak mengganti difficulty proyek atau membenarkan soal di luar prerequisite.

[kotoba-anti-slop-copy](../../.agents/skills/kotoba-anti-slop-copy/SKILL.md) melengkapi ketiganya untuk wording konkret dan jujur. Adaptasi dan notice upstream anti-slop tetap tercatat di [anti-slop integration](../anti-slop-integration.md). Tidak perlu memasang Humanizer atau skill generik lain untuk menjalankan workflow ini.

Konfigurasi agent mengikuti [dokumentasi custom subagents Codex](https://developers.openai.com/codex/subagents/): satu TOML per agent di `.codex/agents/`, dengan `name`, `description` dan `developer_instructions`. Model/reasoning diwarisi dari parent. Reviewer menerima instruksi tidak mengedit; file custom agent tidak membuat sandbox read-only terpisah dari izin parent.
