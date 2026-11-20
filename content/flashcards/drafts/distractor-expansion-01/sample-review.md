# Review sampel TD-006

Verdict: `NEEDS_CHANGES` untuk pasangan **有難う / 済みません** pada draft
otomatis awal. Reviewer hanya menerima kutipan raw JMdict ent_seq `1586820` dan
`1295060` serta nilai canonical EN/ID terkait melalui pesan; reviewer tidak
membaca file sumber, hash, atau artifact lengkap. Hasil ini bukan review batch.

JMdict mencatat 済みません dapat menyatakan terima kasih di samping permintaan
maaf atau perhatian. Prompt arti “thank you” dapat menerima 有難う maupun
済みません; sebaliknya, prompt 済みません dapat dijawab “thank you” maupun
“excuse me”. Ambiguitas Indonesia juga mungkin muncul pada “terima kasih” dan
“permisi”, walaupun kutipan JMdict yang diperiksa memuat gloss bahasa Inggris.

Koreksi: jangan gunakan pasangan tersebut sebagai distractor satu sama lain
tanpa konteks yang membedakan sense. Generator draft kini menolak pasangan dengan
gloss JMdict yang sama di sense mana pun. Pemeriksaan ini konservatif dan tidak
membuktikan bahwa pasangan tersisa aman; review semantik seluruh scope tetap
berstatus `REVIEW_INCOMPLETE`.
