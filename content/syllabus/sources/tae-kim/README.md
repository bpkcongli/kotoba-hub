# Tae Kim — secondary explanation source

[Tae Kim Japanese Grammar Guide.pdf](<Tae Kim Japanese Grammar Guide.pdf>) disediakan oleh pemilik repository. PDF asli dipertahankan; tidak ada proses fetch otomatis untuk file ini.

| Metadata | Nilai |
| --- | --- |
| Judul / penulis | Japanese Grammar Guide / Tae Kim |
| Tanggal pada halaman judul | November 21, 2012 |
| Jumlah halaman PDF | 353 |
| Ukuran | 2,000,269 bytes |
| SHA-256 | `2626fad9abbccad41838c318aeb2e6a0e8877cd1df3f0db3887b3d6eeb035397` |
| Waktu unduh / URL unduh file | Tidak disediakan; tanggal dokumen dan mtime bukan tanggal unduh |
| Situs pendamping | [Tae Kim's Guide to Learning Japanese](https://guidetojapanese.org/learn/grammar) |
| Lisensi file | Belum dicatat pada provenance yang disediakan; jangan menganggap lisensi skill/software juga berlaku untuk buku |

Gunakan untuk memeriksa aturan, nuansa dan contoh penjelasan. Judul lesson, pengelompokan JLPT, urutan dan skill tetap mengikuti katalog KotobaHub yang memakai Bunpro sebagai baseline grammar. Tulis penjelasan Inggris/Indonesia dan contoh baru dengan kata-kata sendiri; jangan menyalin satu bab menjadi konten learner.

Ekstrak daftar isi atau halaman yang relevan saja menggunakan Poppler, dari root repository:

```sh
pdftotext -f 3 -l 9 -layout \
  'content/syllabus/sources/tae-kim/Tae Kim Japanese Grammar Guide.pdf' \
  /tmp/kotoba-tae-kim-contents.txt

pdftotext -f 88 -l 89 -layout \
  'content/syllabus/sources/tae-kim/Tae Kim Japanese Grammar Guide.pdf' \
  /tmp/kotoba-tae-kim-polite.txt
```

Contoh kedua memuat §4.1.4, *Using 「です」 for everything else*, termasuk tabel `でした` dan batasannya untuk i-adjective. Untuk bagian ini halaman PDF dan nomor cetak sama, yaitu 88–89; cek kembali pemetaan sebelum mengutip bagian lain. Ekstraksi dapat menghasilkan karakter seperti `⽣` sebagai pengganti `生` atau simbol yang rusak. Bandingkan dengan halaman PDF bila meragukan; jangan menerapkan normalisasi massal pada prompt/kunci yang sudah terkurasi.

Catat path lokal di `retrievedFrom`, section dan halaman di `notes`, serta URL bagian situs pendamping yang benar-benar diperiksa sebagai `sourceUrl`. Schema v2 mewajibkan URL untuk provider eksternal. Jika URL bagian belum terverifikasi, simpan catatan sumber dalam handoff dan tandai provenance belum lengkap; jangan membuat URL atau melabeli sumber eksternal sebagai `KOTOBAHUB_INTERNAL`. Contoh URL yang sudah diperiksa untuk §4.1.4: [Polite Form and Verb Stems](https://guidetojapanese.org/learn/grammar/polite).

Alur authoring dan review: [syllabus authoring guide](../../../../docs/syllabus/syllabus-authoring-guide.md).
