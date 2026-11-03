# Bootstrap Lighthouse Ubuntu 24.04 — DEP-04

Target: Lighthouse Jakarta, Linux x86-64, 2 vCPU/4 GB RAM. Compose menjalankan app,
job `ops`, dan MySQL 8.4; Caddy berjalan sebagai service host. Baseline mengikuti
[deployment plan](./deployment-plan.md). Perintah berikut dijalankan operator,
bukan otomatis oleh CI. Selesaikan setiap langkah sebelum melanjutkan.

`DEP-04` ditandai selesai pada **3 November 2026** sesuai konfirmasi dan arahan
pemilik proyek: Cloudflare serta Caddy sudah dikonfigurasi dan aplikasi berhasil
diakses melalui `https://kotobahub.conglicorp.my.id`. Catatan ini merupakan
konfirmasi operator; agent tidak mengakses VPS atau mengaudit ulang konfigurasi
runtime. Workflow deploy tetap milik `DEP-06`; verifikasi flow, cache, persistence,
dan recovery lengkap dilanjutkan pada `DEP-05`.

## 1. Persiapan yang dapat dilakukan tanpa domain

### OS dan akses operator

Dari akun bawaan Ubuntu yang memiliki `sudo`, periksa mesin lalu perbarui paket:

```sh
cat /etc/os-release
uname -m
free -h
df -h /
sudo apt update
sudo apt upgrade
sudo apt install -y ca-certificates curl gnupg ufw openssl gzip util-linux nano cron
```

Pastikan Ubuntu 24.04 dan `x86_64`. Jika update meminta reboot, lakukan sebelum
bootstrap database lalu sambungkan kembali. Simpan akses Console Tencent untuk
pemulihan jaringan.

Buat user operator deployment; password `sudo` dimasukkan secara interaktif:

```sh
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo install -d -o deploy -g deploy -m 0700 /home/deploy/.ssh
sudo -u deploy nano /home/deploy/.ssh/authorized_keys
sudo chmod 0600 /home/deploy/.ssh/authorized_keys
```

Isi `authorized_keys` dengan **public key operator dari laptop**. Private key tetap
di laptop. Uji `ssh deploy@IP_VPS` dari terminal kedua sebelum menutup sesi awal
atau mengubah akses SSH. Key CI terpisah disiapkan nanti pada `DEP-06`.

### Firewall awal

Pada firewall Lighthouse, izinkan TCP port SSH (default `22`) hanya dari IP publik
operator dengan prefix `/32`. Terapkan padanan pada host, setelah mengganti
placeholder IP dan menyesuaikan port jika SSH bukan `22`:

```sh
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 0.0.0.0/0 to any port 22 proto tcp
sudo ufw allow from 0.0.0.0/0 to any port 443 proto tcp
sudo ufw enable
sudo ufw status numbered
```

Pertahankan sesi aktif dan uji koneksi SSH baru. Jika memakai IPv6, batasi sumber
operator IPv6 juga; jangan menambahkan AAAA aplikasi sebelum jalur IPv6 siap.
Port `3000`, `3306`, dan Docker API tidak dibuka di firewall Tencent maupun host.
Untuk tahap tanpa domain, port `80`/`443` juga belum diperlukan.

### Docker Engine dan Compose

Gunakan repository resmi Docker. Jika image OS sudah membawa Docker, tinjau paket
yang terpasang dan [konflik paket](https://docs.docker.com/engine/install/ubuntu/#uninstall-old-versions)
sebelum instalasi; jangan mengganti instalasi yang sedang menjalankan workload.
Pada Ubuntu 24.04 amd64 baru:

```sh
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<'EOF'
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker containerd
sudo usermod -aG docker deploy
```

Login ulang sebagai `deploy`, kemudian:

```sh
docker version
docker compose version
docker run --rm hello-world
systemctl is-enabled docker containerd
```

Butuh Compose plugin **2.30+** (termasuk versi mayor yang lebih baru) untuk
`env_file.format: raw`. Grup `docker` memberi kendali luas setara root; batasi ke
operator tepercaya. VPS tidak membutuhkan Bun, Node, source repo, atau build app.
Panduan: [instalasi Docker](https://docs.docker.com/engine/install/ubuntu/),
[post-install](https://docs.docker.com/engine/install/linux-postinstall/).

Docker published ports dapat melewati aturan UFW. Karena itu, Compose mengikat
app ke loopback dan tidak memublikasikan MySQL; UFW bukan pengganti pembatasan
port Compose. Lihat [Docker dan UFW](https://docs.docker.com/engine/install/ubuntu/#firewall-limitations).

### Direktori dan backup di luar VPS

```sh
sudo install -d -o deploy -g deploy -m 0700 /opt/kotoba-hub
sudo install -d -o deploy -g deploy -m 0700 /var/backups/kotoba-hub
```

Siapkan tujuan backup **di luar instance**, misalnya laptop operator atau storage
backup terpisah. Catat lokasi, cara mengirim/mengambil backup, retensi, dan jadwal.
Jangan menjalankan migration/reseed sebelum backup sukses dan salinannya disimpan
di luar VPS. Untuk bootstrap manual, laptop cukup sebagai salinan awal; backup
berkala memerlukan pengambilan/upload terjadwal sebelum menerima data learner.

### Pasang Caddy

Pasang dari repository resmi; Caddy boleh dipasang sebelum domain tersedia:

```sh
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key -o /tmp/caddy-stable.key
sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg /tmp/caddy-stable.key
curl -1fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /tmp/caddy-stable.list
sudo install -m 0644 /tmp/caddy-stable.list /etc/apt/sources.list.d/caddy-stable.list
sudo chmod a+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo apt update
sudo apt install -y caddy
sudo systemctl stop caddy
sudo install -d -o root -g caddy -m 0750 /etc/caddy/certs
```

Instalasi paket menyalakan default service; hentikan sampai hostname, sertifikat,
dan konfigurasi siap. Jangan memasang Nginx bersamaan pada port yang sama.
Referensi: [paket Caddy untuk Ubuntu](https://caddyserver.com/docs/install#debian-ubuntu-raspbian).

## 2. Salin artifact dan isi env

Dari root repository **di laptop**, salin file tanpa secret:

```sh
scp compose.production.yaml deploy/production/*.example scripts/backup-production-db.sh deploy@IP_VPS:/opt/kotoba-hub/
```

Pada VPS sebagai `deploy`, buat file runtime sekali saja. `cp -n` mempertahankan
file yang sudah diisi bila langkah diulang:

```sh
cd /opt/kotoba-hub
umask 077
cp -n app.env.example app.env
cp -n ops.env.example ops.env
cp -n mysql.env.example mysql.env
cp -n release.env.example release.env
chmod 0600 app.env ops.env mysql.env release.env
chmod 0700 backup-production-db.sh
```

Isi dengan editor di VPS, jangan kirim nilai secret ke chat atau commit Git:

| File | Nilai yang harus disiapkan |
| --- | --- |
| `release.env` | App/ops `ref` dari satu artifact `release-metadata` yang publish run-nya sukses; official MySQL `8.4@sha256:...` dipilih terpisah. |
| `mysql.env` | Database `kotoba_hub`, user `kotoba`, password user dan root yang berbeda. |
| `ops.env` | Hanya `DATABASE_URL`, host `mysql`, port `3306`, password user yang sama. |
| `app.env` | URL database, `AUTH_SECRET`, origin `AUTH_URL`, credential Google, dan konfigurasi AI jika digunakan. |

Generate tiga nilai acak **terpisah** dengan `openssl rand -hex 32`, lalu simpan
masing-masing untuk password MySQL user, password root, dan `AUTH_SECRET`.
Hex memudahkan pengisian URL tanpa encoding khusus. Jika memilih password lain,
percent-encode komponen password di `DATABASE_URL`, sedangkan `MYSQL_PASSWORD`
tetap berisi password asli. Raw env memakai nilai literal: jangan tambahkan quote
shell atau mengeksekusi file dengan `source`. Password root hanya di `mysql.env`.
Mengubah env MySQL pada volume yang sudah berisi data tidak merotasi password DB.

`OPENAI_API_KEY` boleh kosong untuk fitur non-AI. Google ID/secret dan secret auth
tetap wajib untuk startup app. Selama diagnosis tanpa domain, `AUTH_URL` dapat
memakai `http://localhost:3000` yang sesuai tunnel; ini hanya pemeriksaan halaman,
bukan konfigurasi login production. Untuk menguji login pribadi sebelum domain,
butuh proxy HTTPS localhost dengan sertifikat dipercaya browser di depan tunnel,
origin env dan callback Google yang persis sama; prosedur itu bukan verifikasi
production Cloudflare. Jangan menggunakan IP publik sebagai callback Google.

Periksa repository Docker Hub sudah dikonfigurasi dan publish sungguhan sukses;
status implementasi `DEP-02` saja tidak membuktikan image ada.

### Mendapatkan digest MySQL 8.4

Digest MySQL diambil dari official image Docker Hub, terpisah dari metadata rilis
app/ops KotobaHub. Pada VPS sebagai user `deploy`:

1. Baca informasi image MySQL 8.4 di registry:

   ```sh
   docker buildx imagetools inspect docker.io/library/mysql:8.4
   ```

2. Salin nilai **`Digest:` paling atas**, sebelum bagian `Manifests`, lengkap
   dengan prefix `sha256:`. Bagian `Manifests` berisi digest per platform;
   gunakan digest teratas untuk mengunci seluruh manifest/index image.
   Compose production memilih platform `linux/amd64`.
3. Buka `/opt/kotoba-hub/release.env` dengan editor. Ganti
   `REPLACE_WITH_MYSQL_DIGEST` dengan nilai yang disalin. Template saat ini
   memakai `MYSQL_IMAGE=docker.io/library/mysql:8.4@REPLACE_WITH_MYSQL_DIGEST`,
   sehingga hasil akhirnya mengikuti pola berikut:

   ```dotenv
   MYSQL_IMAGE=docker.io/library/mysql:8.4@sha256:<64-karakter-hex-dari-output>
   ```

   Teks dalam tanda `<...>` adalah placeholder penjelasan, bukan nilai literal.
   Pastikan hanya ada **satu `sha256:`** setelah `@`. Jika file lama sudah berisi
   `@sha256:REPLACE_WITH_MYSQL_DIGEST`, ganti seluruh bagian setelah `@` dengan
   nilai `Digest:` lengkap agar tidak menjadi `@sha256:sha256:...`.

Catat digest yang dipilih dan pertahankan saat rilis aplikasi berikutnya. Tag
`8.4` dapat menunjuk image baru; upgrade MySQL dilakukan sebagai maintenance
tersendiri dengan backup, bukan otomatis setiap deploy app. Perintah inspect
hanya membaca metadata registry, tidak menjalankan atau mengganti database.
Referensi: [Docker imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/).

### Validasi dan tarik image

```sh
docker login --username NAMA_AKUN_DOCKERHUB
docker compose --env-file release.env -f compose.production.yaml --profile ops config --quiet
docker compose --env-file release.env -f compose.production.yaml --profile ops pull
```

Login diperlukan untuk image privat; gunakan token pull/read-only pada prompt,
bukan token literal di command. `config --quiet` memeriksa sintaks tanpa mencetak
secret; jangan membagikan hasil render `config` biasa. Semua perintah memakai
`-f compose.production.yaml`; jangan gabungkan dengan Compose development.

## 3. Bootstrap database dan aplikasi

Jalankan satu operasi database pada satu waktu, dari `/opt/kotoba-hub` sebagai
`deploy`. Backup script mengambil `.deployment.lock`; migration dan seed memakai
lock yang sama. Jangan membuka sesi database lain selama rangkaian ini.

```sh
docker compose --env-file release.env -f compose.production.yaml up -d --wait --wait-timeout 180 mysql
bash backup-production-db.sh
```

Backup script menggunakan user database di dalam container, snapshot InnoDB,
gzip, dan SHA-256. Bila dump gagal, script gagal dan menghapus file sementara;
tidak menghasilkan file backup sukses. Salin file `.sql.gz` **dan** `.sha256`
yang dicetak ke laptop, dari terminal laptop:

```sh
scp 'deploy@IP_VPS:/var/backups/kotoba-hub/kotoba_hub-NAMA_BACKUP.sql.gz*' ./
sha256sum -c kotoba_hub-NAMA_BACKUP.sql.gz.sha256
gzip -t kotoba_hub-NAMA_BACKUP.sql.gz
```

Nama `NAMA_BACKUP` diganti sesuai output script, tanpa wildcard yang memilih backup
lain. Backup pertama boleh berisi database kosong; ini baseline sebelum migration.
Setelah salinan aman, kembali ke VPS:

```sh
flock -n .deployment.lock docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:migrate
flock -n .deployment.lock docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:seed:syllabus:dry-run
```

Tinjau laporan lesson yang lolos dan ditolak. Lanjutkan hanya jika exit code `0`
dan katalog published sesuai harapan:

```sh
flock -n .deployment.lock docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:seed:syllabus
flock -n .deployment.lock docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:seed:flashcards:dry-run
```

Tinjau laporan deck/item sebelum seed berikutnya:

```sh
flock -n .deployment.lock docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:seed:flashcards
bash backup-production-db.sh
docker compose --env-file release.env -f compose.production.yaml up -d --no-build --no-deps --force-recreate --wait --wait-timeout 120 app
docker compose --env-file release.env -f compose.production.yaml ps
curl --fail http://127.0.0.1:3000/
docker stats --no-stream
```

Simpan juga backup setelah seed di luar VPS, berikut metadata rilis dan versi
schema/content. Jika migration gagal, hentikan bootstrap; MySQL DDL dapat parsial.
Jangan generate migration di VPS, lanjut seed, atau menghapus volume untuk mencoba
ulang. Ikuti [workflow database](../drizzle/README.md) untuk diagnosis.

Tanpa domain, buka tunnel dari laptop:

```sh
ssh -N -L 127.0.0.1:3000:127.0.0.1:3000 deploy@IP_VPS
```

Buka `http://localhost:3000` untuk diagnosis halaman publik. Database dan port app
tetap tidak diekspos ke internet. Image healthcheck `/` bukan bukti katalog,
OAuth, AI, atau seluruh flow learner siap.

## 4. Aktifkan hostname publik setelah domain tersedia

Konfigurasi deployment memakai domain yang dibeli di Rumahweb:

| Peran | Nilai |
| --- | --- |
| Domain/zone Cloudflare | `conglicorp.my.id` |
| Hostname aplikasi | `kotobahub.conglicorp.my.id` |
| Origin aplikasi | `https://kotobahub.conglicorp.my.id` |

### 4.1. Tambahkan zone dan A record di Cloudflare

Tambahkan **`conglicorp.my.id`** sebagai zone pada dashboard Cloudflare. Jika
halaman review menampilkan **Records we found: 0**, buat record secara manual
melalui **Add record**, atau **DNS → Records → Add record** setelah onboarding:

| Kolom | Nilai |
| --- | --- |
| Type | `A` |
| Name | `kotobahub` |
| IPv4 address | IP publik instance Lighthouse, tanpa skema URL, port, atau path |
| Proxy status | **Proxied**, awan oranye |
| TTL | `Auto` |

Hostname akhirnya harus `kotobahub.conglicorp.my.id`. Record `@` untuk domain
utama tidak diperlukan bila aplikasi hanya memakai subdomain tersebut. Tambahkan
AAAA hanya setelah IPv6 origin dan firewall-nya siap. Referensi:
[pengelolaan DNS record](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/).

### 4.2. Ganti nameserver di Rumahweb dan tunggu aktivasi

Lanjutkan onboarding Cloudflare dan salin **dua nameserver yang diberikan untuk
zone ini**. Di **Clientzone Rumahweb → Domain → kelola `conglicorp.my.id` →
Name Server Setting/Nameserver**, pilih custom nameserver jika diminta. Ganti
nameserver lama dengan kedua nilai dari Cloudflare, kosongkan slot tambahan yang
masih berisi nameserver lama, lalu simpan. Nameserver diganti di registrar,
sedangkan A record dikelola di Cloudflare setelah delegasi aktif.

Jika DNSSEC sebelumnya aktif di registrar, nonaktifkan sebelum mengganti
nameserver; aktifkan kembali melalui Cloudflare setelah zone aktif. Kembali ke
Cloudflare, jalankan pemeriksaan nameserver, lalu tunggu status **Active**.
Pembaruan dapat memerlukan hingga 24 jam. Referensi:
[Rumahweb](https://www.rumahweb.com/journal/cara-setting-domain-di-CloudFlare/) dan
[aktivasi zone Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).

### 4.3. Periksa sertifikat edge Universal SSL

Buka **SSL/TLS → Edge Certificates** dan periksa sertifikat bertipe **Universal**.
Untuk zone `conglicorp.my.id`, cakupan yang diharapkan adalah domain utama dan
`*.conglicorp.my.id`; wildcard tersebut mencakup `kotobahub.conglicorp.my.id`.
Wildcard hanya mencakup satu tingkat, sehingga `www.kotobahub.conglicorp.my.id`
memerlukan cakupan lain.

Peringatan **This hostname is not covered by a certificate** dapat muncul saat
sertifikat belum diterbitkan. Bila zone baru aktif dan sertifikat masih pending,
tunggu proses Universal SSL, biasanya 15 menit hingga 24 jam setelah aktivasi.
Jika tetap muncul setelah sertifikat **Active**, periksa hostname aktual record
dan cakupan sertifikat. Referensi:
[Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/) dan
[pesan cakupan sertifikat](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/total-tls/error-messages/).

### 4.4. Buat dan simpan Cloudflare Origin CA

Pilih zone `conglicorp.my.id`, buka **SSL/TLS → Origin Server → Create Certificate**.
Pilih **Generate private key and CSR with Cloudflare**, key type **RSA (2048)**,
dan masa berlaku. Daftar bawaan `conglicorp.my.id` serta `*.conglicorp.my.id`
sudah mencakup hostname aplikasi; tidak perlu menambahkannya secara terpisah.

Klik **Create**, pilih format **PEM**, lalu simpan **Origin Certificate** dan
**Private Key** sebagai dua file berbeda. Salin private key sebelum menutup
halaman karena tidak dapat ditampilkan kembali. Pada VPS dengan Caddy terpasang:

```sh
sudo install -d -o root -g caddy -m 0750 /etc/caddy/certs
sudo nano /etc/caddy/certs/origin.pem
sudo nano /etc/caddy/certs/origin-key.pem
```

Pada file pertama, tempel seluruh certificate termasuk baris `BEGIN CERTIFICATE`
dan `END CERTIFICATE`. Pada file kedua, tempel seluruh private key termasuk baris
`BEGIN` dan `END`. Simpan setiap file sebelum membuka file berikutnya; jangan
tambahkan quote, menyimpan key di repository, atau membagikannya ke chat/log.

```sh
sudo chown root:caddy /etc/caddy/certs/origin.pem /etc/caddy/certs/origin-key.pem
sudo chmod 0640 /etc/caddy/certs/origin.pem /etc/caddy/certs/origin-key.pem
```

Catat tanggal kedaluwarsa dan jadwal rotasi. Origin CA mengamankan koneksi
Cloudflare → VPS; sertifikat edge mengamankan browser → Cloudflare. Origin CA
tidak dipercaya browser untuk akses langsung origin, sehingga DNS tetap
**Proxied**. Referensi:
[Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/).

### 4.5. Pasang dan aktifkan Caddyfile

Edit `/etc/caddy/Caddyfile` dengan `sudo nano /etc/caddy/Caddyfile`, atau salin
template yang hostname-nya sudah disesuaikan. Gunakan isi berikut:

```caddyfile
kotobahub.conglicorp.my.id {
    tls /etc/caddy/certs/origin.pem /etc/caddy/certs/origin-key.pem
    reverse_proxy 127.0.0.1:3000
}
```

Pastikan file `root:root`, mode `0644`, lalu validasi sebagai user service:

```sh
sudo chown root:root /etc/caddy/Caddyfile
sudo chmod 0644 /etc/caddy/Caddyfile
sudo -u caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Lanjutkan setelah muncul **Valid configuration**:

```sh
sudo systemctl enable --now caddy
sudo systemctl reload caddy
```

Default reverse proxy Caddy menjaga host serta meneruskan protokol HTTPS ke app.
Jangan memakai header IP client untuk otorisasi. Referensi:
[TLS Caddy](https://caddyserver.com/docs/caddyfile/directives/tls).

### 4.6. Aktifkan Full (strict) dan redirect HTTPS

Setelah certificate origin terpasang, buka **SSL/TLS → Overview**, lalu pilih
**Full (strict)**. Di **SSL/TLS → Edge Certificates**, aktifkan **Always Use HTTPS**
agar Cloudflare mengalihkan request HTTP ke HTTPS. Jika opsi tidak muncul,
pastikan mode SSL/TLS tidak **Off**. Referensi:
[Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) dan
[Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/).

### 4.7. Terapkan bypass cache dan firewall origin

Pada **Caching → Cache Rules**, buat rule untuk hostname aplikasi dengan ekspresi:

```text
(http.host eq "kotobahub.conglicorp.my.id" and not starts_with(http.request.uri.path, "/_next/static/"))
```

Pilih action **Bypass cache**, lalu deploy rule. Hapus/selaraskan aturan lain yang
menimpa bypass ini. Hanya hashed static asset mengikuti cache origin; HTML/RSC,
API, auth/session, dan data learner tetap dinamis. Hormati `private/no-store` serta
`Set-Cookie`. Referensi:
[cache rules](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/).

Firewall Lighthouse di dashboard Tencent dan UFW di Ubuntu merupakan dua lapisan
terpisah; rule keduanya tidak tersinkronisasi otomatis. Pada keduanya, izinkan
TCP `443` hanya dari **semua CIDR resmi Cloudflare IPv4/IPv6 yang dipakai**.
Ambil daftar di [Cloudflare IP ranges](https://www.cloudflare.com/ips/), tinjau,
lalu tambahkan satu rule UFW per CIDR, dengan mengganti placeholder berikut:

```sh
sudo ufw allow from CIDR_CLOUDFLARE to any port 443 proto tcp
sudo ufw status numbered
```

Terapkan padanannya di firewall Tencent dan catat pembaruan allowlist. Rule
`0.0.0.0/0` pada contoh firewall awal mengizinkan semua IPv4; selaraskan rule luas
tersebut dengan allowlist Cloudflare untuk `443` dan IP operator untuk SSH.
Tambahkan izin pengganti serta uji sesi SSH kedua sebelum menghapus rule lama.
Port `3000` tetap loopback, MySQL `3306` tidak dipublikasikan, dan port `80` origin
boleh ditutup karena redirect dilakukan di edge dengan sertifikat origin manual.
Jika port `80` dibuka, batasi juga ke Cloudflare.

### 4.8. Sesuaikan origin auth dan periksa akses publik

Pada `/opt/kotoba-hub/app.env`, isi origin tanpa path auth:

```dotenv
AUTH_URL=https://kotobahub.conglicorp.my.id
```

Daftarkan authorized redirect URI Google persis sebagai:

```text
https://kotobahub.conglicorp.my.id/api/v1/auth/callback/google
```

Perubahan env memerlukan recreate app. Dari `/opt/kotoba-hub`:

```sh
docker compose --env-file release.env -f compose.production.yaml up -d --no-build --no-deps --force-recreate --wait --wait-timeout 120 app
```

Dari laptop, periksa redirect dan akses HTTPS:

```sh
curl -I http://kotobahub.conglicorp.my.id
curl --fail -I https://kotobahub.conglicorp.my.id
```

Request HTTP harus mengembalikan redirect dengan header
`Location: https://kotobahub.conglicorp.my.id/`. Buka hostname HTTPS di browser.
Keberhasilan halaman publik tidak membuktikan seluruh flow learner sudah diuji.
Verifikasi login Google, onboarding, katalog, jawaban flashcard/quiz, refresh
progress, request AI bila aktif, serta isolasi cache dua user dilanjutkan pada
`DEP-05`. API/HTML dinamis tidak boleh menjadi cache HIT. Jangan menyimpan cookie,
token, atau output secret sebagai bukti. Referensi:
[Google redirect rules](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation).

## 5. Backup berkala, restore, dan batas penyelesaian

Contoh cron user `deploy`, **setelah satu backup manual berhasil**, setiap hari
pukul 02:15 UTC (09:15 WIB) bila timezone daemon VPS UTC:

```cron
15 2 * * * /bin/bash /opt/kotoba-hub/backup-production-db.sh >> /var/backups/kotoba-hub/backup.log 2>&1
```

Periksa `timedatectl` sebelum memilih jadwal. Konfigurasikan pengambilan/upload
di luar VPS terjadwal dan pantau kegagalannya, termasuk konflik lock. Cron ini
hanya menghasilkan salinan lokal. Tetapkan retensi berdasarkan ruang disk dan
kebutuhan recovery; script tidak menghapus backup otomatis.

Backup berisi data learner: batasi akses dan lindungi penyimpanan/transfer.
`gzip -t` dan checksum hanya memeriksa integritas file; uji restore ke **MySQL 8.4
terpisah dengan database kosong** sebelum menganggap backup dapat dipulihkan.
Dump berisi schema dan data database aplikasi saja, tanpa `CREATE DATABASE`/`USE`;
provision user/grant pada target secara terpisah. Contoh dari shell Bash pada
mesin yang sudah menjalankan container MySQL uji terpisah:

```sh
set -o pipefail
sha256sum -c kotoba_hub-NAMA_BACKUP.sql.gz.sha256
gzip -dc kotoba_hub-NAMA_BACKUP.sql.gz | docker exec -i NAMA_CONTAINER_MYSQL_UJI sh -eu -c 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"'
```

Sesuaikan nama container dan pastikan database di dalamnya memang kosong dan
terisolasi; restore dapat menimpa tabel target. Periksa migration journal, jumlah
katalog/deck, dan sampel data; jangan menguji restore pada database aktif. Recovery
production membutuhkan maintenance, app berhenti menulis, backup kondisi terakhir,
serta penilaian data setelah waktu backup yang dapat hilang. Rollback image tidak
membatalkan migration/seed. Jangan gunakan `docker compose down -v` untuk recovery.

Simpan catatan operasional berikut untuk rilis dan verifikasi `DEP-05`:

- Versi OS/arsitektur, Docker/Compose, digest app/ops/MySQL, serta named volume.
- Backup sebelum migration dan setelah seed, checksum, lokasi salinan di luar VPS.
- Exit status migration/seed, laporan published/rejected, startup dan penggunaan RAM.
- Hostname, TLS/cache/firewall, callback Google, dan hasil pemeriksaan publik awal.

`DEP-04` ditutup sesuai konfirmasi operator tentang konfigurasi Cloudflare/Caddy
dan akses HTTPS publik. Rincian backup/migration/seed, cache/firewall, serta login
VPS tidak diaudit ulang oleh agent pada pembaruan dokumentasi ini. Uji reboot,
persistence, rollback image, restore production, dan workflow SSH terperinci
diteruskan ke `DEP-05`. Workflow `DEP-06` dan script VPS kini tersedia; lanjutkan ke
[panduan workflow deployment](./deployment-workflow.md) untuk pemasangan script,
variables/secrets GitHub, preflight, serta diagnosis/retry tanpa mengulang migration
parsial. Routine deploy tidak menjalankan seed atau memperbarui MySQL.
