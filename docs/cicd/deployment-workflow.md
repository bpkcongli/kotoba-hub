# Workflow deployment `DEP-06`

Workflow [deploy.yml](../../.github/workflows/deploy.yml) menerima `publish_run_id`
melalui `workflow_dispatch` dari `main`. Ia tidak membangun image. Helper
[deploy-release.mjs](../../scripts/deploy-release.mjs) membaca GitHub Actions API
dengan izin `contents: read` dan `actions: read`, lalu memvalidasi:

- Run berasal dari repository yang sama, `.github/workflows/ci.yml`, event push
  pada `main`, sudah selesai dan sukses.
- Job `quality` serta `publish` sukses pada attempt yang dipilih.
- Tepat satu artifact `release-metadata` belum kedaluwarsa dan milik run/commit itu.
- ZIP hanya berisi `release-metadata.json`; schema versi 1, run/attempt/commit,
  target, tag, digest, platform, dan image allowlist persis sesuai kontrak `DEP-02`.
- Run tidak berubah attempt selama validasi. Artifact lama dari attempt lain
  ditolak walaupun run ID sama.

Archive dibatasi 1 MiB dan JSON 64 KiB. Credential GitHub tidak diteruskan ke URL
unduhan artifact. Request ke VPS hanya memuat identitas rilis, dua digest,
origin HTTPS, ID deploy, dan checksum script. Shell tidak mengevaluasi input atau
file env. Run publish lama tetap bisa dipilih selama artifact tersedia dan valid;
operator bertanggung jawab atas kompatibilitas schema saat memilih rilis lama.

Referensi API: [workflow runs](https://docs.github.com/en/rest/actions/workflow-runs),
[jobs per attempt](https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt),
dan [artifacts](https://docs.github.com/en/rest/actions/artifacts).

## Konfigurasi GitHub

Gunakan environment `production`, dibatasi ke `main`. Workflow menetapkan
concurrency `deploy-production` dengan `cancel-in-progress: false`.
Environment required reviewers bersifat opsional sesuai paket dan kebijakan
repository. Bila environment tidak tersedia pada paket repository, hapus baris
`environment: production` melalui perubahan yang ditinjau, kemudian gunakan
repository variables/secrets; guard `main` tetap wajib.

| Nama | Jenis | Nilai / sumber |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | Variable | Namespace registry yang dipakai publish, saat ini `andrian8367` |
| `DOCKERHUB_REPOSITORY` | Variable | `kotoba-hub` |
| `VPS_HOST` | Variable | `43.173.39.185`, bukan hostname HTTP Cloudflare |
| `VPS_PORT` | Variable | `22` |
| `VPS_USER` | Variable | `deploy` |
| `APP_URL` | Variable | `https://kotobahub.conglicorp.my.id`, tanpa slash akhir |
| `VPS_SSH_PRIVATE_KEY` | Secret | Private key khusus CI; public key dipasang pada user `deploy` |
| `VPS_SSH_KNOWN_HOSTS` | Secret | Entri host SSH yang sudah diverifikasi melalui jalur operator tepercaya |

Implementasi memilih **secret** untuk `VPS_SSH_KNOWN_HOSTS`; variable bernama
sama tidak dibaca. Jangan mengambil `ssh-keyscan` dari koneksi yang belum
dipercaya sebagai satu-satunya bukti identitas. Cocokkan fingerprint lewat
Console Tencent atau koneksi operator yang sudah dipercaya. Host port nonstandar
memerlukan format `[host]:port` pada `known_hosts`.

Untuk mengisi melalui UI GitHub:

1. Buka repository → **Settings → Environments → New environment**, nama
   `production`; batasi deployment branches ke `main` bila paket mendukungnya.
2. Pada environment itu, tambahkan enam variable pada tabel di atas dan dua
   secret SSH. Kedua variable Docker Hub boleh tetap pada level repository bila
   sudah digunakan job publish.
3. Buat key CI terpisah di laptop, tanpa menimpa key SSH operator:

   ```sh
   ssh-keygen -t ed25519 -f ~/.ssh/kotoba-hub-actions -C kotoba-hub-github-actions -N ''
   ```

   Jika file key sudah ada, jangan generate ulang. Dari terminal tempat key dibuat,
   periksa apakah key CI sendiri sudah dapat login:

   ```sh
   ssh -F /dev/null \
     -i ~/.ssh/kotoba-hub-actions \
     -o IdentitiesOnly=yes \
     -o IdentityAgent=none \
     -o BatchMode=yes \
     -o StrictHostKeyChecking=yes \
     deploy@43.173.39.185 'id -un'
   ```

   Jika hasilnya `deploy`, key sudah diterima dan tidak perlu disalin lagi.
   Jika gagal autentikasi dengan `Permission denied (publickey)` dan file key
   lokal tersedia, pasang public key melalui key operator yang sudah berfungsi:

   ```sh
   ssh-copy-id -f -F /dev/null \
     -i ~/.ssh/kotoba-hub-actions.pub \
     -o IdentityFile=/home/user/.ssh/tencent_conglicorp \
     -o IdentitiesOnly=yes \
     -o StrictHostKeyChecking=yes \
     deploy@43.173.39.185
   ```

   Ulangi tes login khusus key CI setelah pemasangan. Opsi `IdentityFile` operator
   ikut dipakai saat `ssh-copy-id` mengecek key yang sudah terpasang, sehingga
   perintah tanpa `-f` dapat menampilkan `All keys were skipped` meskipun key CI
   belum terpasang. `-f` melewati pengecekan itu dan dapat menambahkan duplikat;
   gunakan hanya setelah tes key CI gagal autentikasi. Lihat
   [manual ssh-copy-id](https://manpages.debian.org/bookworm/openssh-client/ssh-copy-id.1.en.html).

   Simpan seluruh file private `~/.ssh/kotoba-hub-actions` ke secret
   `VPS_SSH_PRIVATE_KEY` melalui UI; public key tetap pada VPS. Jangan mengirim
   private key ke chat, repository, atau workflow artifact.
4. Ambil entri dari known_hosts laptop yang sudah dipercaya, lalu cocokkan
   fingerprint melalui akses operator/Console sebelum menyimpannya sebagai
   secret `VPS_SSH_KNOWN_HOSTS`:

   ```sh
   ssh-keygen -F 43.173.39.185 -f ~/.ssh/known_hosts
   ```

   Salin baris key saja, tanpa baris komentar `# Host ...`; entri hashed juga
   didukung OpenSSH. Port `22` memakai host biasa, bukan `[host]:22`.
5. Pastikan akses runner pada firewall, lalu jalankan workflow sesuai bagian
   **Menjalankan rilis**. Workflow ini baru muncul setelah file berada di `main`.

SSH memakai `StrictHostKeyChecking=yes`, known_hosts khusus, key khusus,
`BatchMode=yes`, dan `IdentitiesOnly=yes`, tanpa konfigurasi SSH runner global.
File credential sementara mode `0600` dihapus saat helper selesai atau gagal;
runner harus tetap ephemeral. Secret aplikasi, Google, MySQL, AI, serta token
Docker Hub push tidak diberikan ke job deploy. Login registry read-only tetap
pada user `deploy` di VPS bila repository image privat.

Pastikan SSH dapat dijangkau runner sebelum memicu workflow. Standard
GitHub-hosted runner tidak memiliki IP keluar tetap. Jika firewall hanya
mengizinkan IP operator, gunakan runner tepercaya dengan IP tetap atau siapkan
jalur VPN sebagai provisioning tersendiri; jangan membuka firewall otomatis
dari job ini. Sesuaikan `runs-on` jika memilih runner dengan IP tetap. Referensi:
[jaringan runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#ip-addresses).

## Pemasangan dan pembaruan script di VPS

Script tidak diunggah oleh deployment rutin. Provision versi yang sudah ditinjau
dari checkout yang sama dengan workflow `main`. Script di VPS diperiksa terhadap
SHA-256 file `scripts/deploy-production.sh` pada checkout workflow; bila berbeda,
deploy ditolak sebelum Docker dijalankan. `script_version=1` dan checksum dicatat
pada receipt setiap deployment.

Dari laptop dengan host SSH yang sudah dipercaya:

```sh
scp scripts/deploy-production.sh scripts/backup-production-db.sh deploy/production/deploy.conf.example deploy@43.173.39.185:/opt/kotoba-hub/
```

Di VPS sebagai `deploy`, hentikan operasi deployment/database lain terlebih
dahulu, lalu pasang dengan lock yang sama:

```sh
cd /opt/kotoba-hub
umask 077
flock -n .deployment.lock install -m 0700 deploy-production.sh deploy.sh
flock -n .deployment.lock chmod 0700 backup-production-db.sh
cp -n deploy.conf.example deploy.conf
chmod 0600 deploy.conf
```

Pembaruan file script, backup, atau Compose sebaiknya di-stage ke direktori
sementara lalu di-install/rename **di dalam satu lock**; jangan menimpa file
yang sedang dipakai worker. Contoh di atas untuk bootstrap pertama saat tidak
ada worker. Ubah `IMAGE_REPOSITORY` pada `deploy.conf` menjadi
`docker.io/andrian8367/kotoba-hub`; origin harus sama dengan `APP_URL` GitHub.
Config ini tidak berisi credential dan tidak boleh di-`source`.

```dotenv
IMAGE_REPOSITORY=docker.io/andrian8367/kotoba-hub
APP_URL=https://kotobahub.conglicorp.my.id
BACKUP_DIR=/var/backups/kotoba-hub
MIN_FREE_MB=4096
```

`MIN_FREE_MB` adalah minimum ruang kosong pada filesystem deployment, backup,
dan Docker. Ini batas awal, bukan estimasi ukuran dump. Pantau kapasitas dan
tetapkan retensi/salinan off-host mengikuti runbook backup. Script tidak menghapus
backup otomatis. Backup directory harus sudah diprovision dengan pemilik
`deploy`, mode `0700`, dan bisa ditulis. `deploy.conf`, `release.env`, `app.env`,
`ops.env`, dan `mysql.env` harus regular file milik operator, mode `0600`.
`release.env` hanya memuat tiga key image; jangan menyimpan credential di situ.

Jalankan preflight yang tidak menarik image, melakukan backup/migration, atau
mengganti container:

```sh
bash /opt/kotoba-hub/deploy.sh check
sha256sum /opt/kotoba-hub/deploy.sh
```

Preflight memeriksa tool, Compose/env tanpa mencetak render secret, MySQL sehat
dan digest-nya sesuai, backup directory, ruang disk, identitas/health app aktif,
HTTP loopback, serta halaman dan envelope session anonim melalui Cloudflare.
Script membutuhkan Bash, GNU coreutils/timeout, `flock`, Docker/Compose, curl,
gzip, dan Python 3 seperti baseline Ubuntu 24.04.

## Menjalankan rilis

1. Pastikan perubahan workflow sudah berada di `main`, script VPS cocok dengan
   checksum checkout itu, dan variables/secrets/jalur SSH sudah siap.
2. Buka Actions → **Deploy production** → **Run workflow**, pilih branch `main`,
   masukkan ID run **Quality** yang publish-nya sukses.
3. Tinjau summary identitas rilis dan receipt hasil VPS.

Worker mengambil `.deployment.lock`, menyimpan request/receipt dalam
`/opt/kotoba-hub/.deployments/<deploy-run-id>-<attempt>/`, dan berjalan dengan
`nohup` serta log lokal. Worker mewarisi lock pada fd 9 sehingga putus SSH atau
job dibatalkan tidak melepaskan lock selama worker/CLI database masih berjalan.
Job melakukan polling status; start yang acknowledgement-nya hilang hanya diikuti
query status untuk ID yang sama, tidak menjalankan migration kedua.

Urutan worker:

1. Preflight; bila digest app/ops sudah aktif setelah deployment sukses terdahulu
   dan seluruh health lolos, catat `already-healthy` tanpa migration lagi.
2. Simpan `release.previous.env` pada direktori receipt dan buat kandidat terpisah,
   pertahankan digest MySQL, lalu pull app/ops serta cocokkan label revision dengan commit.
3. Backup database dan verifikasi gzip/checksum memakai lock yang diwariskan.
4. Migration dengan image `ops` kandidat, `--no-deps`, maksimal 10 menit. Tidak ada seed.
5. Recreate **hanya app** dengan `--no-build --no-deps --force-recreate --wait`.
6. Periksa health Docker, digest reference dan image ID app, HTTP loopback,
   halaman HTTPS publik, serta envelope session anonim kedua origin. HTTP memakai
   retry terbatas. Ini tidak menguji login Google, database write learner, atau
   isolasi cache antar-user; pengujian tersebut tetap `DEP-05`.
7. Setelah seluruh pemeriksaan lolos, rename file kandidat menjadi `release.env`
   secara atomik, simpan `release.previous.env` global, receipt sukses, dan pointer
   sukses. Container migration sukses dibersihkan.

Migration container memakai nama `kotoba-migrate-<deploy-id>` dan dipertahankan
jika gagal untuk diagnosis. Log dapat memuat keluaran CLI migration; batasi akses
seperti file secret, jangan mengunggah log penuh ke artifact atau chat.
Tidak ada restore database, downgrade schema, rollback app, upgrade MySQL,
perubahan DNS/proxy, atau penghapusan volume otomatis.

## Recovery

```sh
bash /opt/kotoba-hub/deploy.sh status DEPLOY_RUN_ID-ATTEMPT
```

`status` mengembalikan receipt tanpa secret: hasil, tahap, commit, publish run,
digest sebelum/kandidat, waktu, checksum script, serta lokasi backup. Jika receipt
masih `running` tetapi lock sudah bebas, hasil menjadi `unknown`; proses mungkin
terhenti atau VPS reboot. Status `failed`/`unknown` dan marker `pending` menahan
deployment baru sampai diagnosis. Request ulang dengan ID yang sudah tercatat
tidak mengulang operasi, termasuk setelah acknowledgement.

Untuk kasus gagal atau koneksi putus:

1. Periksa `status`, `.deployments/pending`, `operation.log`, container app/MySQL,
   dan `docker inspect kotoba-migrate-DEPLOY_RUN_ID-ATTEMPT`. Jangan menghapus lock
   atau receipt untuk mencoba ulang. Tunggu worker/CLI/container migration selesai;
   putus CLI tidak membuktikan proses MySQL dalam container sudah berhenti.
2. Pada kegagalan migration, periksa SQL yang mungkin sudah diterapkan dan journal
   Drizzle; MySQL DDL dapat parsial. Selesaikan diagnosis/perbaikan sebelum retry.
3. Pada kegagalan startup/health, container kandidat dapat sudah aktif, sedangkan
   `release.env` masih menunjuk rilis sebelumnya. Receipt mencatat keduanya. Jika
   schema kompatibel, pulihkan app memakai `release.previous.env` pada direktori
   receipt sesuai [runbook rollback](./deployment-plan.md#rilis-berikutnya-dan-rollback).
   Gunakan lock yang sama untuk recovery manual. Jangan restore DB otomatis.
4. Setelah kondisi app/database diketahui dan aman, lepaskan marker secara eksplisit:

   ```sh
   bash /opt/kotoba-hub/deploy.sh acknowledge DEPLOY_RUN_ID-ATTEMPT
   ```

   Perintah gagal bila lock masih dipegang worker. Acknowledgement hanya mencatat
   keputusan operator dan membuka gate; tidak memulihkan app atau database.
5. Rerun workflow menghasilkan attempt baru/ID deployment baru. Rilis yang sama
   setelah sukses menjadi no-op hanya jika app/digest dan health masih cocok.

Jika job timeout atau dibatalkan, worker mungkin tetap berjalan; periksa status
VPS sebelum memicu rilis lain. GitHub concurrency menjaga job CI, sementara lock
dan marker VPS melindungi operasi setelah job berakhir. Seed, restore, backup
manual, dan perubahan provisioning wajib memakai `.deployment.lock` yang sama.
`backup-production-db.sh --lock-held` hanya menerima fd 9 yang menunjuk lock
tersebut; cron/operator biasa tetap memakai mode tanpa flag.

## Verifikasi implementasi

Tes offline ada pada `tests/release/deploy-release.test.mjs` dan
`tests/release/deploy-production.test.mjs`, ikut `bun run test:release` dan
`bun run check`. Fixture Docker/curl terisolasi tidak menjalankan database atau
menyentuh VPS. Cakupan mencakup metadata/run/attempt/allowlist, archive dan credential,
urutan backup sebelum migration, lock worker terpisah dari SSH, no-op, kegagalan
pull/backup/migration/startup/health, receipt, dan gate recovery.

Hasil pemasangan VPS, quality check, serta batas verifikasi dicatat pada
[deployment plan](./deployment-plan.md#implementasi-dep-06).
Deployment sukses/gagal GitHub Actions, jalur jaringan runner, pembatalan job,
rollback/restore dan seluruh flow learner tetap diverifikasi pada `DEP-05`.
