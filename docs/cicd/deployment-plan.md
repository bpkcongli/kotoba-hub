# Rencana Deployment KotobaHub untuk Eksperimen RAG

## 1. Status dan keputusan

Dokumen ini menetapkan rencana deployment sesuai arahan pemilik proyek, diperbarui pada
**2 November 2026**, dengan implementasi artifact `DEP-01` dan workflow publish
`DEP-02` diperbarui pada **3 November 2026**. Target image operasional database,
pemeriksaan artifact, dan job publish tersedia di repository. Artifact lokal
`DEP-04` (Compose production, env, Caddy, backup, dan panduan Ubuntu 24.04) juga
tersedia. Pada **3 November 2026**, pemilik proyek mengonfirmasi konfigurasi
Cloudflare/Caddy dan akses aplikasi melalui `https://kotobahub.conglicorp.my.id`,
serta meminta penutupan `DEP-04`. Konfirmasi ini berasal dari operator; agent
tidak mengakses VPS atau mengaudit konfigurasi runtime pada pembaruan ini.
Workflow deploy `DEP-06`, validasi metadata, worker VPS berversi, dan runbook
recovery kini tersedia. Script sudah dipasang dan preflight lulus pada VPS;
pengisian secrets/variables GitHub oleh operator dan verifikasi workflow live
tetap diperlukan. Verifikasi operasional lanjutan tetap pada `DEP-05`. Publish sungguhan memerlukan
konfigurasi Docker Hub pada GitHub; tersedianya job publish saja bukan bukti
publish sudah berhasil.

Alur yang dipilih:

1. GitHub Actions menjalankan quality gate dan membangun image.
2. Image dipublikasikan ke Docker Hub.
3. Container MySQL di VPS disiapkan dengan persistent volume, lalu migration dan
   seed dijalankan sesuai kebutuhan.
4. Operator memicu workflow deploy GitHub Actions untuk rilis yang sudah dipublish.
   Job deploy terhubung lewat SSH; VPS menarik image dan menjalankan container aplikasi
   di belakang Caddy/Nginx. Trafik publik masuk melalui Cloudflare.
5. Konfigurasi deployment dan secret diinjeksikan saat container/job berjalan.

Pilihan awal: **Tencent Cloud Lighthouse Starter Linux 2C4G di region Jakarta**, dengan aplikasi,
**MySQL Community 8.4**, dan **Caddy atau Nginx di satu VPS**. MySQL menyimpan data
di persistent volume. Caddy pada host menjadi contoh utama; Nginx dapat dipakai
dengan peran dan pengaturan TLS yang sama. Jalankan salah satu reverse proxy.

**Cloudflare berada di depan reverse proxy** sebagai DNS dan proxy HTTPS publik.
Untuk tahap diagnosis, SSH tunnel tetap dapat dipakai tanpa domain. Untuk arsitektur
production dengan Cloudflare dan Google OAuth, siapkan hostname yang DNS-nya dapat
dikelola melalui Cloudflare. **Aiven menjadi alternatif**, hanya jika database
nanti ingin dipisahkan dari VPS; bukan dependency deployment awal.

Baseline tetap [arsitektur](../../ARCHITECTURE.md), [MVP plan](../mvp-plan.md),
[kontrak auth](../api-contract/auth-and-authorization.md),
[migration dan seed](../../drizzle/README.md), serta [integrasi AI](../ai-integration.md).
Deployment ini tidak mengubah kontrak
domain atau menambahkan vector database sebagai dependency wajib.

## 2. Susunan komponen

```mermaid
flowchart LR
    Git[GitHub main] --> Quality[Quality gate]
    Quality --> Build[Build app dan ops image]
    Build --> Hub[Docker Hub]
    Hub --> Release[Metadata commit dan digest rilis]
    Release --> Deploy[Workflow deploy manual lewat SSH]
    Internet[Internet / Browser] -->|HTTPS| CF[Cloudflare DNS dan HTTPS proxy]
    subgraph VPS["Tencent Cloud Lighthouse Starter 2C4G - Jakarta - satu VPS"]
        Proxy[Caddy atau Nginx pada host] -->|HTTP loopback port 3000| App[Container KotobaHub]
        App -->|Docker network port 3306| DB[(Container MySQL 8.4)]
        DB --> Volume[(Persistent volume mysql-data)]
        Ops[Job container migration dan seed] --> DB
        Runtime[Env runtime] --> App
        Runtime --> Ops
        Runtime --> DB
    end
    Deploy -->|Menjalankan script deployment| Ops
    Deploy -->|Mengganti container app| App
    CF -->|HTTPS Full strict| Proxy
    Hub --> App
    Hub --> Ops
    App --> AI[API AI]
```

VPS hanya menjalankan image rilis; tidak melakukan `bun install`, `next build`,
atau generate migration. Untuk tahap awal, operator memicu `workflow_dispatch`
setelah publish berhasil dan provisioning VPS selesai. Job deploy menjalankan
script di VPS melalui SSH, dengan env aplikasi tetap di VPS. Runbook SSH manual
bagian 9 dipertahankan untuk bootstrap, diagnosis, dan recovery.

Alur production yang dikunci:

```text
Internet → Cloudflare → Caddy/Nginx → container KotobaHub → container MySQL
                                                               ↓
                                                         persistent volume
```

Cloudflare berjalan di layanan Cloudflare, bukan sebagai container di VPS. Reverse
proxy pada host mengakses port app yang hanya terikat ke `127.0.0.1:3000`. MySQL
hanya dapat diakses melalui Docker network; port `3306` tidak dipublikasikan.
Volume tetap ada saat container app/database diganti. Volume di VPS bukan backup;
kerusakan VPS/disk dapat memengaruhi aplikasi dan seluruh data sekaligus.

## 3. MySQL di VPS dan alternatif Aiven

| Opsi | Biaya database | Kesesuaian dan batasan |
| --- | --- | --- |
| **MySQL Community 8.4 di VPS aplikasi — pilihan awal** | Tidak ada biaya layanan database terpisah | Memakai RAM/disk VPS 2C4G. Persistent volume, backup di luar VPS, restore, dan pembaruan dikelola operator. |
| **Aiven for MySQL Free — alternatif terpisah** | Gratis sesuai kuota provider | 1 CPU, RAM 1 GB, disk 1 GB, satu node, backup, maksimal 76 koneksi. Tanpa SLA dan dapat dimatikan jika tidak aktif. Dipertimbangkan saat database dipisahkan. |

Kuota dan kebijakan Aiven diperiksa pada 31 Oktober 2026 di
[dokumentasi free tier](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier).
Opsi self-host memakai image `mysql:8.4` yang juga dipakai [Compose lokal](../../compose.yaml).
Gratis pada pilihan awal berarti tidak ada tagihan managed database tambahan,
sementara biaya resource tetap masuk tagihan VPS. Database awal memakai nama service
`mysql`, database `kotoba_hub`, dan named volume `mysql-data` untuk `/var/lib/mysql`.
Gunakan credential production yang berbeda dari default development. Env bootstrap
MySQL hanya berlaku saat data directory kosong; mengganti env pada volume yang
sudah berisi data tidak otomatis mengganti password atau membuat user baru.
Lihat [MySQL official image](https://hub.docker.com/_/mysql).

### Jika nanti memisahkan database ke Aiven

Lakukan pemisahan sebagai perubahan tersendiri: backup/export database lokal,
hentikan penulisan selama perpindahan, restore ke Aiven, verifikasi schema dan data,
lalu ganti URL/CA pada app dan job `ops` saat runtime. Cegah penulisan ke dua database
yang berbeda. Pertahankan backup dan volume lokal sampai validasi selesai; setelah
ada data baru di Aiven, kembali ke volume lama memerlukan rekonsiliasi data.

- Pilih region sedekat mungkin dengan VPS Jakarta dari pilihan free tier yang tersedia.
  Ukur latency aplikasi-ke-database sebelum menetapkan region.
- Gunakan hostname dan port yang diberikan provider, bukan asumsi port `3306`.
- Terapkan TLS dengan verifikasi CA/identitas server. Mount CA certificate saat
  runtime; jangan menonaktifkan verifikasi sertifikat untuk mengatasi error koneksi.
  Lihat [TLS Aiven](https://aiven.io/docs/platform/concepts/tls-ssl-certificates).
- Batasi akses jaringan ke IP keluar VPS jika kontrol provider tersedia. Pisahkan
  credential aplikasi dari credential untuk migration/seed sesuai izin yang tersedia.
- Verifikasi semua migration terhadap versi MySQL provider, termasuk foreign key,
  JSON, transaksi, dan constraint. Validasi pada database uji sebelum database rilis.
- Ukur pemakaian storage setelah seed. Sisakan ruang untuk index, progress, session,
  dan log AI; hentikan penambahan corpus sebelum disk mendekati batas.

MySQL tetap menyimpan state aplikasi. Storage 1 GB pada alternatif Aiven bukan
alokasi untuk seluruh corpus RAG dan embedding. Jangan mengganti MySQL dengan PostgreSQL atau database
MySQL-compatible lain tanpa verifikasi contract, transaction, dan migration.

## 4. VPS awal: Tencent Cloud Lighthouse 2C4G — Jakarta

Gunakan **Starter Linux 2C4G**: 2 vCPU dan RAM 4 GB, dengan **region Jakarta**
sebagai lokasi deployment yang ditetapkan. Pilih OS Linux x86-64 yang didukung
Docker untuk target image `linux/amd64`.

| Paket acuan | Resource | Harga daftar per bulan | Peran |
| --- | --- | --- | --- |
| **Starter Linux 2C4G** | 2 vCPU, RAM 4 GB, SSD 60 GB, bandwidth 30 Mbps, trafik 1.536 GB/bulan | **US$6** | Pilihan deployment awal |
| Starter Linux 2C8G | 2 vCPU, RAM 8 GB, SSD 80 GB | US$10 | Kandidat upgrade jika RAM menjadi hambatan |

Snapshot harga **2 November 2026** untuk kelompok region di luar China, dari
[harga resmi Lighthouse](https://www.tencentcloud.com/document/product/1103/47794).
[Penawaran promo](https://www.tencentcloud.com/en/act/pro/promo), kapasitas disk,
stok, harga perpanjangan, dan jalur upgrade perlu dicocokkan di Console. Biaya
tambahan dapat mencakup pajak, domain, backup, kelebihan trafik, dan API AI.

RAM 4 GB adalah titik awal untuk trafik rendah, belum hasil benchmark KotobaHub.
Batasi cache/koneksi MySQL dan penggunaan RAM container, sisakan RAM untuk OS serta
reverse proxy, dan jalankan job database/ingestion satu per satu. Contoh bagian 9
memberi batas awal yang perlu divalidasi dengan RSS, memori tersedia, swap/OOM,
latency, dan disk. Build tetap di GitHub Actions. LLM/embedding diasumsikan melalui
API; GPU, LLM lokal, dan OpenClaw bukan service dalam baseline deployment ini.

Jika kebutuhan meningkat, evaluasi paket RAM 8 GB atau pisahkan MySQL ke Aiven
sesuai bagian 3. Upgrade Lighthouse dilakukan melalui Billing → Upgrade bundle dan
memerlukan maintenance/shutdown; hanya target yang tersedia dan memenuhi syarat
upgrade yang dapat dipilih. Lihat [panduan upgrade](https://www.tencentcloud.com/document/product/1103/41562).

## 5. Build dan publish ke Docker Hub

### Perilaku workflow

| Pemicu | Quality/build | Publish | Deployment |
| --- | --- | --- | --- |
| Pull request | `bun run check`, build Next.js, build Docker | Tidak | Tidak |
| Push ke `main` setelah quality lulus | Build image rilis dari commit yang sama | Ya | Menyiapkan rilis untuk dipilih workflow deploy |
| `workflow_dispatch` deploy dari `main` | Memvalidasi hasil publish yang dipilih; tanpa rebuild | Tidak | SSH ke VPS yang sudah diprovision, deploy digest terpilih, lalu verifikasi |

[Workflow Quality](../../.github/workflows/ci.yml) memiliki job `quality` dan `publish`.
Job `publish` memakai `needs: quality` dan hanya berjalan untuk event `push`,
`refs/heads/main`, serta hasil quality `success`. Pull request, termasuk dari fork,
tidak menjalankan login atau publish. Tidak ada trigger `pull_request_target` atau
deployment dalam workflow ini.

Job publish memakai `docker/login-action` `v4.7.0`, `docker/setup-buildx-action`
`v4.4.1`, `docker/build-push-action` `v7.4.0`, dan `actions/upload-artifact`
`v7.0.2`, semuanya dikunci ke full commit SHA rilis resmi yang diperiksa pada
3 November 2026. Checkout dan setup Node job publish juga dikunci ke commit rilis.
Build memakai checkout commit pemicu (`ref: github.sha`), memeriksa kecocokan
`git rev-parse HEAD`, dan memakai `context: .`. Target awal `linux/amd64`
sesuai VPS x86 pada tabel. Tambahkan `linux/arm64` dan verifikasi image bila beralih
ke VPS ARM. Pola publish merujuk
[panduan resmi Docker](https://docs.docker.com/build/ci/github-actions/push-multi-registries/).

Konfigurasi GitHub yang dibutuhkan:

| Nama | Penyimpanan | Kegunaan |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | Actions variable | Akun/namespace registry |
| `DOCKERHUB_REPOSITORY` | Actions variable | Nama repository image |
| `DOCKERHUB_TOKEN` | Actions secret | Token dengan izin push yang diperlukan |

Jangan berikan `DATABASE_URL`, credential Google, atau API key AI ke job build/publish.
Token registry hanya dipakai untuk autentikasi registry, tidak sebagai build argument.
Token tersedia hanya pada step login dan pemeriksaan registry; tidak menjadi env
job atau input secret/build-arg pada BuildKit. Job publish tidak memerlukan Bun
atau instalasi dependency pada host runner; helper rilis memakai Node dari `.nvmrc`.

Buat repository Docker Hub tujuan, pilih visibility yang sesuai, lalu isi kedua
Actions variable dan secret di atas. `DOCKERHUB_REPOSITORY` hanya nama repository,
misalnya `kotoba-hub`, tanpa namespace/hostname/tag. Username dipakai untuk login
dan namespace image; token harus memberi izin read/write ke repository tersebut.
Nilai namespace/repository wajib lowercase dan diperiksa sebelum digunakan sebagai
image reference. Untuk namespace organisasi, gunakan identitas/token organisasi
yang sesuai dengan login Docker Hub.

Satu commit menghasilkan dua artifact pada **repository Docker Hub yang sama**:

| Artifact | Tag contoh | Isi |
| --- | --- | --- |
| Aplikasi | `<namespace>/kotoba-hub:sha-<commit>` | Target `runner`: Next.js standalone dan asset runtime |
| Operasional database | `<namespace>/kotoba-hub:ops-sha-<commit>` | Target `ops`: Bun, dependency termasuk Drizzle Kit, source/config, migration, script dan canonical seed |

Build berjalan berurutan (`ops` lalu `runner`) dari checkout yang sama, dengan
label OCI revision/source sesuai commit/repository GitHub. Tidak ada tag `latest`.
Setelah kedua push sukses, helper memeriksa `Docker-Content-Digest` kedua tag di
registry terhadap output digest build, baru menulis metadata. Job publish
mengunggah tepat satu file `release-metadata.json` sebagai artifact GitHub Actions
bernama `release-metadata`, dengan retensi **90 hari** (sesuaikan batas repository
dan periode rollback). Upload gagal jika file tidak tersedia. Build record
otomatis Docker dinonaktifkan; metadata rilis tidak mengambil dump env atau output
metadata BuildKit. Metadata tidak berisi secret, credential, atau digest MySQL yang
bisa menimpa konfigurasi database VPS. Artifact yang kedaluwarsa atau run yang gagal
tidak dapat dipilih oleh workflow deploy mendatang; simpan arsip tepercaya sebelum
kedaluwarsa jika rollback perlu melebihi periode retensi.
Perlakukan tag commit sebagai tidak boleh ditimpa; deployment memakai digest
`@sha256:...`, bukan `latest`. Keduanya harus berasal dari commit yang sama dan
tersedia sebelum rilis dapat dijalankan. Publikasi artifact tidak mengubah database.

#### Tag commit, concurrency, dan kegagalan publish

Helper [release-metadata.mjs](../../scripts/release-metadata.mjs) memeriksa kedua tag
sebelum build melalui Registry API Docker Hub dengan bearer token berscope `pull`.
Hanya HTTP `404` dianggap tag belum ada; tag yang sudah ada, error autentikasi,
rate limit, timeout, dan kegagalan registry menghentikan publish. Helper tidak
menulis credential ke file, output Actions, metadata, atau summary.

Concurrency berada pada tingkat job: `quality` tetap dapat dibatalkan oleh quality
run yang lebih baru untuk ref yang sama, sedangkan `publish-dockerhub` memakai
`cancel-in-progress: false`. Publish dari repository ini berjalan satu per satu
dan tidak dibatalkan oleh push baru. Pemeriksaan tag bukan reservasi atomik terhadap
publisher di luar workflow ini; aktifkan Docker Hub immutable tags untuk pola
`^(ops-)?sha-[a-f0-9]{40}$` bila tersedia, dan gunakan satu jalur publisher. Lihat
[immutable tags Docker Hub](https://docs.docker.com/docker-hub/repos/manage/hub-images/immutable-tags/).

Jika push kedua, pemeriksaan digest, atau upload artifact gagal, run tidak menjadi
rilis yang bisa dideploy. Image/tag yang telanjur dipush dapat tetap ada; tidak ada
rollback/delete tag otomatis. Rerun commit yang sudah mempunyai salah satu tag
ditolak sebelum build. Periksa kegagalan dan terbitkan rilis dengan commit baru;
jangan menimpa tag lama atau memakai pasangan digest dari run/commit berbeda.

#### Format `release-metadata.json` versi 1

| Field | Isi |
| --- | --- |
| `schemaVersion` | Angka `1` |
| `commit` | SHA commit Git lengkap, `40` karakter hex lowercase |
| `repository` | Repository GitHub `owner/name` |
| `workflow` | `.github/workflows/ci.yml` |
| `publishRun.id`, `publishRun.attempt` | String angka positif identitas run dan attempt GitHub |
| `publishRun.url` | URL GitHub run/attempt yang menghasilkan rilis |
| `quality` | `{ "job": "quality", "result": "success" }` |
| `platform` | `linux/amd64` |
| `images.app` | `{ target: "runner", tag, digest, ref }` |
| `images.ops` | `{ target: "ops", tag, digest, ref }` |

`tag` memakai `docker.io/<namespace>/<repository>:sha-<commit>` atau
`:ops-sha-<commit>`. `digest` wajib `sha256:` dengan `64` karakter hex lowercase;
`ref` adalah `docker.io/<namespace>/<repository>@<digest>`. Consumer `DEP-06`
memvalidasi schema, repository/workflow, run/commit, dan allowlist image
terhadap konfigurasi tepercaya; metadata sendiri tidak menjadi bukti run sukses.

#### Verifikasi lokal `DEP-02`

`bun run test:release` menjalankan tes Node tanpa network/credential untuk guard
push `main`, quality, tag/digest, schema metadata tanpa secret, registry auth/error,
tag yang sudah ada, serta publish parsial/digest mismatch yang tidak menghasilkan
metadata. Tes ini menjadi bagian `bun run check` dan job quality. YAML workflow
juga diperiksa dengan actionlint saat implementasi. Live login/push/upload pada
GitHub Actions memerlukan konfigurasi Docker Hub di atas dan belum dijalankan
dari workspace lokal ini.

Hasil lokal **3 November 2026**: `33` tes rilis lulus; `bun run check` lulus
(lint, typecheck, format, tes rilis, serta `60` suite / `661` tes Jest).
Actionlint `v1.7.12` tidak melaporkan error. Build dan pemeriksaan artifact app/ops
melalui `bash scripts/verify-docker-artifacts.sh` juga lulus dengan frozen lockfile
dan tanpa secret deployment. Verifikasi lokal ini tidak melakukan push registry
atau upload artifact GitHub.

Docker Personal menyediakan repository publik dan sampai satu repository privat;
pull terautentikasi dibatasi 200 per 6 jam. Pilih privat bila konten image tidak
ditujukan untuk publik. Login VPS menggunakan token read-only terpisah dari token
push CI. Lihat [batas Docker Hub](https://docs.docker.com/docker-hub/usage/).

### Job deploy GitHub Actions melalui SSH

Bagian ini menetapkan baseline **`DEP-06`**. Implementasi tersedia pada
[deploy.yml](../../.github/workflows/deploy.yml), [helper validasi/SSH](../../scripts/deploy-release.mjs),
dan [worker VPS](../../scripts/deploy-production.sh), dipasang sebagai
`/opt/kotoba-hub/deploy.sh`. Detail konfigurasi GitHub, pemasangan, polling,
receipt, serta diagnosis sebelum retry ada pada [panduan workflow](./deployment-workflow.md).

#### Persiapan satu kali pada VPS

- Tencent Lighthouse Starter 2C4G di Jakarta sudah dapat diakses operator melalui SSH.
  Docker/Compose, MySQL/persistent volume, Caddy/Nginx, serta Cloudflare sudah siap.
- User khusus deployment memiliki SSH public key CI pada `authorized_keys`, izin
  direktori deployment, dan akses yang diperlukan untuk menjalankan script Docker.
  Akses Docker memberi kendali luas pada host; batasi pemegang key ke workflow tepercaya.
- `compose.production.yaml`, `app.env`, `ops.env`, `mysql.env`, sertifikat, dan
  konfigurasi backup sudah terpasang sesuai bagian 7–9. Bootstrap serta seed pertama
  diselesaikan lewat runbook sebelum deployment rutin diaktifkan.
- Login Docker Hub untuk user deployment di VPS menggunakan token read-only jika
  image privat. Credential registry tersebut tetap di VPS, terpisah dari token push CI.
- Pasang script deployment berversi yang sudah ditinjau dan catat versinya dalam
  hasil rilis. Perubahan script/Compose atau infrastruktur dikelola sebagai pekerjaan
  provisioning tersendiri; deploy rutin tidak menerima script shell bebas dari input.

#### Konfigurasi GitHub dan jalur jaringan

Variable dan secret registry pada tabel sebelumnya tetap dipakai job publish.
Untuk job deploy, siapkan konfigurasi berikut:

| Nama | Penyimpanan | Isi |
| --- | --- | --- |
| `VPS_HOST` | Actions variable | IP VPS Jakarta atau hostname khusus SSH yang tidak diproxy Cloudflare |
| `VPS_PORT` | Actions variable | Port SSH yang dibuka pada firewall |
| `VPS_USER` | Actions variable | User deployment di VPS |
| `VPS_SSH_PRIVATE_KEY` | Actions secret | Private key khusus CI, pasang public key pasangannya di VPS |
| `VPS_SSH_KNOWN_HOSTS` | Actions secret yang dijaga integritasnya | Entri `known_hosts` untuk host/port tujuan, diverifikasi lewat jalur operator tepercaya |
| `APP_URL` | Actions variable | Origin HTTPS aplikasi melalui Cloudflare, misalnya `https://kotoba.example.com` |

Jangan menonaktifkan SSH host-key verification. Output `ssh-keyscan` dari koneksi
yang belum dipercaya saja tidak menjadi bukti identitas VPS; cocokkan fingerprint
melalui akses operator/Console Tencent sebelum menyimpan `known_hosts`.

Gunakan environment GitHub **`production`** dan pembatasan branch `main` bila paket
repository mendukungnya. GitHub Free mendukung environment untuk repository publik;
repository privat memerlukan paket yang sesuai. Jika environment tidak tersedia,
gunakan repository secrets/variables dan pembatasan workflow untuk branch `main`.
Required reviewers merupakan pilihan operator jika tersedia, bukan syarat rencana ini.
Lihat [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

GitHub-hosted runner harus dapat menjangkau SSH VPS; allowlist IP laptop tidak
otomatis mengizinkan runner. Pilih jalur sebelum mengaktifkan job: runner dengan IP
tetap, atau koneksi VPN privat seperti Tailscale dengan autentikasi CI terpisah bila
dipilih. Standard runner tidak memberi IP keluar tetap. Jangan mengandalkan hostname
HTTP yang diproxy Cloudflare sebagai jalur SSH. Lihat
[jaringan runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#ip-addresses).

Credential `DATABASE_URL`, Google OAuth, AI, dan root MySQL tetap di file runtime
VPS, tanpa masuk job build atau metadata rilis. Deploy SSH tidak membutuhkan Tencent
API key atau Cloudflare API token selama job tidak mengubah resource cloud, DNS,
atau sertifikat. Credential VPN hanya diperlukan jika jalur VPN dipilih.

#### Trigger, pemilihan rilis, dan concurrency

- Workflow deploy terpisah menerima `workflow_dispatch` dengan input wajib
  **`publish_run_id`**. Operator memilih run publish yang sukses; job tidak membangun
  image baru dan tidak memakai tag `latest` sebagai rilis.
- Workflow hanya berjalan dari `main`. Validasi bahwa run yang dipilih berasal dari
  repository dan workflow publish yang diizinkan, event push `main`, quality/publish
  sukses, serta metadata commit cocok dengan `head_sha` run tersebut. Deployment
  ditolak sebelum menghubungi VPS jika metadata hilang/tidak valid.
- Ambil artifact `release-metadata` dari run yang dipilih dan validasi namespace,
  repository image, format digest app/ops, serta kesamaan commit. Input/metadata
  diperlakukan sebagai data tervalidasi, bukan perintah shell. Berikan `GITHUB_TOKEN`
  izin `contents: read` dan `actions: read` yang diperlukan untuk membaca run/artifact,
  tanpa token GitHub write tambahan. Lihat
  [workflow artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts).
- Gunakan grup concurrency tetap **`deploy-production`** dengan
  **`cancel-in-progress: false`**, terpisah dari grup Quality yang saat ini memakai
  `cancel-in-progress: true`. Workflow quality/publish baru tidak boleh membatalkan
  migration/deployment yang sedang berjalan. Lengkapi dengan lock di VPS agar
  deployment manual dan CI juga tidak berjalan bersamaan. Lihat
  [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
- Auto-deploy sesudah publish push `main` dapat ditambahkan setelah verifikasi
  `DEP-05` lulus. Rencana awal tidak mengeksekusi deployment dari pull request atau
  setiap push secara langsung.

#### Urutan eksekusi script deploy

1. Validasi input rilis, akses Docker/Compose, file konfigurasi, status MySQL, ruang
   disk, dan ketersediaan backup; ambil lock deployment. Jika rilis yang sama sudah
   tercatat sukses dan healthy, selesai tanpa mengulang operasi database.
2. Simpan identitas/digest rilis aktif serta `release.previous.env`. Siapkan file
   kandidat release env terpisah untuk app/ops digest baru; gunakan kandidat tersebut
   sampai rilis lolos pemeriksaan. Tarik image app/ops sebelum mengubah service. Pertahankan `MYSQL_IMAGE`,
   volume, env credential, DNS, dan konfigurasi proxy yang sudah diprovision.
3. Buat backup database sebelum migration. Jika backup atau pull gagal, hentikan
   deployment. Terapkan migration memakai image `ops` dari rilis yang sama;
   kegagalannya menghentikan proses sebelum app diganti. Perubahan schema yang
   tidak kompatibel dengan app lama memerlukan maintenance terencana.
4. **Lewati seed pada deploy rutin.** Bootstrap/reseed tetap memakai runbook bagian
   6 dan 9 setelah laporan dry-run ditinjau. Workflow awal tidak memiliki pilihan
   yang menjalankan seed otomatis pada setiap push atau deploy.
5. Recreate hanya container app dengan digest baru dan tunggu healthcheck. Gunakan
   `--no-deps` agar rilis aplikasi tidak mengganti container/image MySQL. Container
   app/ops membaca env runtime dari VPS.
6. Periksa HTTP loopback, identitas image yang aktif, dan `APP_URL` HTTPS melalui
   Cloudflare dengan retry terbatas. Periksa envelope anonymous dari
   `/api/v1/auth/session`; pengujian ini tidak menggantikan verifikasi login dan
   isolasi data antar-user pada `DEP-05`.
7. Catat sukses, waktu, commit, app/ops digest, versi script, dan hasil health tanpa
   secret. Perbarui `release.env` aktif secara atomik hanya setelah pemeriksaan berhasil, kemudian
   lepas lock. Log kegagalan disimpan agar operator dapat memulihkan keadaan.

Jika startup/health gagal, job harus berstatus gagal dan melaporkan rilis sebelum
dan sesudahnya. Rollback app mengikuti bagian 9 setelah kompatibilitas schema
dipastikan; jangan melakukan restore database atau rollback schema otomatis.
Jika SSH terputus/job dibatalkan saat operasi database, status deployment dianggap
belum diketahui sampai lock, log, dan keadaan VPS diperiksa. Script perlu mencatat
status operasi agar percobaan ulang tidak mengulang migration parsial tanpa diagnosis.

#### Hasil yang harus diverifikasi

`DEP-06` menyediakan workflow serta script deploy; `DEP-05` memverifikasi rilis
sukses dan gagal, pemilihan digest, penolakan metadata salah/PR, concurrency,
recovery koneksi putus, health publik, dan persistence database. Tidak ada provisioning,
reseed tanpa review, penghapusan volume, atau upgrade MySQL pada deploy rutin.

#### Implementasi DEP-06

Pada **3 November 2026**, workflow manual dari `main` dan helper validasi
run/job attempt/artifact/schema/allowlist tersedia. SSH memakai host verification
wajib; concurrency tidak membatalkan deployment aktif. Worker terpisah dari SSH
mewarisi lock backup/migration, menyimpan tahap/receipt, pull dua digest,
backup/checksum, migration tanpa seed, recreate app saja, dan health loopback/publik.
`release.env` diganti atomik setelah health lolos. Kegagalan/worker hilang menahan
retry sampai diagnosis dan acknowledgement; tidak ada restore/rollback otomatis.

Script `deploy.sh`, backup script dengan inherited lock, dan `deploy.conf` sudah
dipasang pada `/opt/kotoba-hub` melalui koneksi SSH yang memakai known_hosts
operator. `deploy.sh check` lulus: tool/Compose, mode file, MySQL/digest, backup
directory, disk, identitas/health app aktif, HTTP loopback dan Cloudflare, serta
envelope anonymous session. Checksum script VPS saat verifikasi awal:
`61d7c91a95d6fe6eafdd15bce505ff7da1c62593d6fbc72a5b3fdbab4e53498e`.
Preflight ini tidak menjalankan migration atau mengganti app.

Backup live memakai `--lock-held` juga lulus dengan dump lokal `112.797` byte,
mode `0600`, `gzip -t`, dan checksum SHA-256 sesuai. Identitas container app/MySQL
tetap sama sebelum/sesudah pemeriksaan. Ini belum membuktikan salinan off-host
atau keberhasilan restore; keduanya tetap diverifikasi pada `DEP-05`.

Verifikasi lokal: `bun run check` lulus (lint, typecheck, format, suite rilis,
serta `60` suite / `661` tes Jest). `34` tes baru DEP-06 juga lulus saat dijalankan
langsung: `23` tes validasi/SSH dan `11` tes worker VPS. Actionlint `v1.7.12`,
`bash -n` kedua script, dan `git diff --check` tidak melaporkan error. Tidak ada
build/push image baru atau migration production dalam verifikasi ini.

Operator menyatakan konfigurasi GitHub deploy belum diisi; langkah UI dan
key/known_hosts tersedia pada [panduan DEP-06](./deployment-workflow.md#konfigurasi-github).
Workflow belum dipush atau dipicu dari workspace ini. Pengujian live Actions,
runner-to-VPS, rilis sukses/gagal, recovery, serta flow learner tetap `DEP-05`.

## 6. Migration dan seed sebagai job terpisah

Image aplikasi saat ini tidak menyediakan script migration/seed maupun Drizzle Kit.
Menjalankan `bun run db:migrate` melalui `docker exec` pada image aplikasi bukan
jalur deployment yang tersedia. [Dockerfile](../../Dockerfile) menyediakan target
`ops` dengan working directory `/app`, user non-root `bun`, dan kemampuan
menjalankan perintah Bun yang sama dengan repo. Target default tetap `runner`.
Image `ops` memakai entrypoint `bun`; command default `--help` tidak menjalankan
migration atau seed. Perintah job diberikan secara eksplisit, misalnya
`run db:migrate` atau `run db:seed:syllabus:dry-run`.

Target `ops` memuat:

- `package.json`, `bun.lock`, dependency dari `bun install --frozen-lockfile`, dan
  `tsconfig.json` agar alias script dapat di-resolve.
- `drizzle.config.ts`, seluruh `drizzle/*.sql` dan metadata migration yang dikomit.
- `src/`, `scripts/seed-syllabus.ts`, `scripts/seed-flashcards.ts` beserta dependency
  lokal yang diimpor.
- `content/syllabus/manifest.json`, `content/syllabus/tracks/*.json`, serta
  `content/flashcards/system-decks/*.json` yang diperlukan importer.

[`.dockerignore`](../../.dockerignore) memakai allowlist untuk file operasional
tersebut. Setiap parent directory content dibuka lalu child-nya dikecualikan lagi
sebelum file yang diperlukan diizinkan; negasi directory saja dapat membuka semua
isinya. Raw acquisition `content/syllabus/sources/`, `.env*`, sertifikat lokal,
credential workspace, dan script lain tetap di luar context.

Urutan operasi database mengikuti [panduan database](../../drizzle/README.md):

| Kondisi | Operasi |
| --- | --- |
| Database baru | Migration → dry-run syllabus → seed syllabus → dry-run flashcards → seed flashcards |
| Rilis kode tanpa perubahan content | Terapkan migration yang belum dijalankan; lewati seed |
| Canonical syllabus/deck berubah | Migration, tinjau dry-run, seed syllabus lalu flashcards sesuai perubahan/dependency |
| Hanya secret/model/origin berubah | Recreate container dengan env baru; tidak perlu rebuild atau seed |

`db:generate` dilakukan saat development dan hasil SQL dikomit setelah review.
Jangan generate schema dari production. Seed syllabus melakukan rekonsiliasi dan
dapat menonaktifkan subtree; dry-run harus ditinjau meskipun importer dapat dijalankan
ulang. Dry-run flashcards membaca katalog MySQL sehingga dilakukan setelah syllabus siap.

Jalankan satu proses deployment/database job pada satu waktu. Sebelum migration
atau reseed, buat backup yang bisa direstore dan catat versi schema/content. MySQL
DDL tidak menjamin rollback seluruh migration secara atomik; setelah kegagalan,
periksa perubahan parsial dan migration journal sebelum mencoba ulang. Jangan
menyalakan aplikasi baru ketika job database gagal.

### Verifikasi artifact `DEP-01`

Jalankan dari root repository dengan Bun `1.3.9`, Bash/GNU tools, dan Docker
Engine dengan BuildKit serta local exporter tersedia:

```sh
bash scripts/verify-docker-artifacts.sh
```

[Script verifikasi](../../scripts/verify-docker-artifacts.sh) dipanggil oleh
[CI Quality](../../.github/workflows/ci.yml) setelah quality gate dan membangun
`kotoba-hub:ops-ci` serta `kotoba-hub:ci` dari working tree yang sama, tanpa push.
Dua argumen opsional mengganti tag app lalu ops. Build berjalan berurutan.
`next.config.ts` membatasi worker page-data Next.js menjadi `2` untuk mengurangi
lonjakan memori; percobaan sebelumnya terhenti saat memakai `15` worker.

Pemeriksaan mencakup:

- Canary context terpisah: file wajib lolos; env, certificate, credential workspace,
  raw acquisition, dan script lain tidak lolos. Canary tidak memakai secret lokal.
- User `bun`, working directory `/app`, dan ketiadaan konfigurasi deployment pada
  image environment app/ops.
- SHA-256 seluruh source, config, migration SQL/metadata, script seed, dan JSON
  canonical dalam image `ops`, dibandingkan dengan working tree.
- Standalone server, static/public assets, serta ketiadaan worker MSW development,
  Drizzle Kit, dan script seed pada image app.
- Syllabus dry-run, parsing artifact flashcard/KANJI melalui adapter file asli,
  dan penolakan CLI migration ketika `DATABASE_URL` tidak tersedia.

Semua container pemeriksaan memakai `--network none`, tanpa env file, bind mount
source, atau secret deployment; hanya daftar checksum read-only yang di-mount.
Ini memverifikasi kelengkapan artifact dan jalur CLI, bukan keberhasilan migration
atau seed terhadap MySQL. Dry-run flashcards penuh membaca katalog MySQL dan tetap
menjadi bagian runbook database setelah migration dan seed syllabus.

Verifikasi lokal **3 November 2026**: build `ops` dan `runner`, canary allowlist,
checksum artifact, dan seluruh pemeriksaan offline di atas lulus. Build Next.js
menyelesaikan page-data/static generation dengan `2` worker. Syllabus dry-run
melaporkan `1` track, `3` unit, `9` lesson, `35` skill, `137` content block, dan
`90` question yang lolos validasi importer; adapter flashcard membaca kedua
artifact dan `20` skill KANJI. Tidak ada database yang dimigrasi atau di-seed.
`bun run check` juga lulus: lint, typecheck, format, serta `60` test suite / `661`
test. `docker compose config --quiet` lulus.

## 7. Env saat runtime

Pisahkan file pada VPS:

| File | Isi |
| --- | --- |
| `/opt/kotoba-hub/release.env` | Digest app, ops, dan MySQL; tidak berisi credential aplikasi |
| `/opt/kotoba-hub/app.env` | Env runtime aplikasi, termasuk credential aplikasi |
| `/opt/kotoba-hub/ops.env` | Env database untuk migration/seed, tanpa API key AI |
| `/opt/kotoba-hub/mysql.env` | Bootstrap database/user dan password MySQL, termasuk root; hanya untuk service MySQL |
| `/etc/caddy/Caddyfile` | Hostname, TLS origin, dan reverse proxy ke app loopback |
| `/etc/caddy/certs/origin.pem` dan `origin-key.pem` | Sertifikat Cloudflare Origin CA dan private key, hanya dibaca service proxy |
| `/opt/kotoba-hub/certs/mysql-ca.pem` | Opsional: CA MySQL eksternal jika nanti memakai Aiven |

File env secret hanya dapat dibaca operator yang menjalankan deployment (`0600`).
Private key TLS memerlukan izin terbatas yang tetap memungkinkan service proxy
membacanya. CA database eksternal bukan secret, tetapi harus dapat dibaca user container.
Jangan menulis isi secret ke log atau menyimpan hasil render Compose yang memuat env.

Contoh `app.env`; ganti seluruh placeholder sebelum menjalankan container:

```dotenv
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
DATABASE_URL=mysql://kotoba:URL_ENCODED_PASSWORD@mysql:3306/kotoba_hub
AUTH_URL=https://kotoba.example.com
AUTH_SECRET=REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
AUTH_GOOGLE_ID=REPLACE_WITH_GOOGLE_CLIENT_ID
AUTH_GOOGLE_SECRET=REPLACE_WITH_GOOGLE_CLIENT_SECRET
AI_PROVIDER=OPENAI
OPENAI_API_KEY=REPLACE_WITH_SERVER_API_KEY
OPENAI_GENERATION_MODEL=gpt-5.6-terra
OPENAI_NORMALIZATION_MODEL=gpt-5.6-luna
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=1
AI_RETRY_DELAY_MS=250
AI_MAX_OUTPUT_TOKENS=8192
AI_MAX_INPUT_CHARS=40000
```

`AUTH_URL` hanya origin, tanpa path auth. Credential URL perlu percent-encoding;
env file berisi nilai literal, bukan perintah shell. Gunakan model yang tersedia
untuk akun eksperimen; contoh mengikuti konfigurasi repo pada tanggal dokumen.
Startup tetap memerlukan credential Google meskipun akses awal hanya untuk diagnosis.
Key AI boleh kosong untuk fitur non-AI, mengikuti [integrasi AI](../ai-integration.md).

Contoh `mysql.env` untuk inisialisasi volume kosong:

```dotenv
MYSQL_DATABASE=kotoba_hub
MYSQL_USER=kotoba
MYSQL_PASSWORD=REPLACE_WITH_DATABASE_PASSWORD
MYSQL_ROOT_PASSWORD=REPLACE_WITH_DIFFERENT_ROOT_PASSWORD
```

Nilai password pada `mysql.env` adalah nilai asli, sementara password di URL harus
di-percent-encode. `ops.env` hanya memerlukan `DATABASE_URL` ke `mysql:3306/kotoba_hub`.
Bootstrap awal memakai user database `kotoba` untuk app dan migration/seed, dengan
hak pada database tersebut; root tidak diinjeksi ke app/ops. Saat memisahkan user
app dan migrator, buat user/grant secara eksplisit dan sesuaikan URL masing-masing.

Baseline menggunakan koneksi MySQL di Docker network dalam satu host, tanpa mount
CA/TLS database eksternal. TLS untuk trafik publik tetap wajib pada bagian 8.
**`DATABASE_SSL_CA_PATH` tetap usulan konfigurasi baru, belum dibaca implementasi
saat ini.** Implementasikan TLS/CA terverifikasi secara konsisten pada app, seed,
dan Drizzle migration saat memilih Aiven. Perubahan env saja tidak mengaktifkannya;
pekerjaan opsional `DEP-03` tidak memblokir baseline MySQL satu VPS.

Konfigurasi deployment dibaca server saat runtime. Pengecualian yang sudah ada
adalah konstanta image seperti `NODE_ENV=production` dan
`NEXT_PUBLIC_API_MOCKING=false`. Variabel `NEXT_PUBLIC_*` masuk browser bundle saat
build dan tidak dapat diganti dengan injeksi runtime. Jangan memakai prefix itu
untuk host, credential, atau pilihan provider per deployment. Client tetap memakai
API same-origin. Lihat [env Next.js](https://nextjs.org/docs/app/guides/environment-variables).

Gunakan `env_file` untuk injeksi container; `docker compose --env-file release.env`
hanya menyediakan nilai interpolasi Compose dan tidak otomatis menginjeksi seluruh
isinya ke container. Perubahan `app.env` memerlukan **recreate**, bukan sekadar
`docker restart`. Lihat [env Compose](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/).

## 8. Cloudflare, reverse proxy, dan akses aplikasi

### Konfigurasi production

Gunakan Cloudflare untuk DNS dan proxy HTTPS. Caddy menjadi contoh proxy pada host
VPS; Nginx adalah alternatif dengan persyaratan origin, TLS, dan header yang sama.
Cloudflare tidak menggantikan reverse proxy VPS atau menjalankan container/database.
Baseline memakai DNS proxy biasa, tanpa kebutuhan Cloudflare Tunnel atau Workers.

1. Tambahkan domain yang dikelola ke Cloudflare dan selesaikan aktivasi DNS zone.
   Buat record **A** untuk hostname aplikasi ke IPv4 VPS, lalu pilih **Proxied**
   (orange cloud). Tambahkan AAAA hanya jika IPv6 origin dan firewall sudah siap.
   Pastikan edge certificate hostname aktif sebelum akses publik. Lihat
   [proxy status Cloudflare](https://developers.cloudflare.com/dns/proxy-status/).
2. Pasang sertifikat valid pada Caddy/Nginx dan pilih SSL/TLS **Full (strict)**.
   Ada TLS pada browser → Cloudflare dan Cloudflare → VPS; hop proxy → app memakai
   HTTP loopback. Mode Flexible tidak digunakan. Lihat
   [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
3. Contoh berikut memakai **Cloudflare Origin CA** untuk hostname aplikasi. Simpan
   certificate/private key pada host, atur izin baca service proxy, dan catat jadwal
   rotasinya. Origin CA dipercaya Cloudflare, bukan browser yang langsung membuka
   origin; jika proxy Cloudflare dinonaktifkan, HTTPS langsung dapat gagal validasi.
   Sertifikat public CA dengan renewal yang teruji dapat menjadi alternatif. Lihat
   [Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/).
4. Aktifkan redirect HTTP → HTTPS di edge. Batasi inbound HTTPS origin ke
   [rentang IP Cloudflare](https://www.cloudflare.com/ips/) pada firewall Tencent
   dan host; jika port 80 dibuka, batasi juga. SSH hanya dari operator. Port app
   `3000` tetap loopback dan MySQL `3306` tidak dipublikasikan. Perbarui allowlist
   saat rentang Cloudflare berubah. Lihat
   [proteksi origin](https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/).
5. Buat aturan **Bypass cache untuk seluruh path selain `/_next/static/`** pada
   hostname aplikasi. HTML/RSC, `/api/*`, auth/callback/session, onboarding, practice,
   flashcards, dan progress harus tetap dinamis, termasuk ketika memakai cookie.
   Asset hashed `/_next/static/*` mengikuti header cache origin. Hindari aturan
   Cache Everything yang menimpa pengecualian tersebut; hormati `private/no-store`
   dan `Set-Cookie` origin. Lihat
   [perilaku cache Cloudflare](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/).
6. Pertahankan host publik serta informasi protokol HTTPS saat proxy meneruskan
   request ke app. `AUTH_URL` memakai origin publik yang sama. Jika IP asli user
   diperlukan, percayai header Cloudflare hanya dari proxy yang diizinkan; jangan
   memakai header kiriman sembarang client sebagai sumber identitas/otorisasi.

Contoh isi Caddyfile di host, setelah hostname serta Origin CA tersedia:

```caddyfile
kotoba.example.com {
    tls /etc/caddy/certs/origin.pem /etc/caddy/certs/origin-key.pem
    reverse_proxy 127.0.0.1:3000
}
```

Ganti hostname dan lokasi file sesuai provisioning. Jalankan validasi konfigurasi
dan reload service proxy; sertifikat/key tidak masuk image aplikasi. Pola sertifikat
manual mengikuti [directive TLS Caddy](https://caddyserver.com/docs/caddyfile/directives/tls).
Instalasi proxy juga harus memastikan service aktif kembali setelah reboot VPS.

Cloudflare memiliki batas Proxy Read Timeout selain timeout Caddy/Nginx. Jaga total waktu
request AI, retry, dan akses database di bawah batas request yang tersedia; menaikkan
timeout reverse proxy saja tidak mengubah batas Cloudflare. Uji recovery/idempotency
ketika response hilang. Lihat [error 524](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/).

### Akses tanpa domain untuk diagnosis

| Mode | Akses | Batasan |
| --- | --- | --- |
| Diagnosis tanpa domain | SSH tunnel ke port loopback VPS | Cukup untuk cek proses/halaman publik; bukan bukti login berhasil |
| Penggunaan production | Hostname HTTPS → Cloudflare → reverse proxy → app | DNS zone/hostname berada dalam kendali operator dan callback Google terdaftar |

Google OAuth web tidak menerima raw IP publik sebagai redirect host dan mensyaratkan
HTTPS kecuali localhost. Selain itu, session cookie aplikasi memakai `Secure` pada
production. `http://<IP-VPS>` tidak cukup untuk menjalankan seluruh flow login atau
arsitektur Cloudflare di atas. Pembelian domain dapat ditunda untuk diagnosis;
penggunaan publik memerlukan domain/hostname yang pengelolaan DNS-nya memungkinkan
Cloudflare proxy. Subdomain gratis tidak otomatis memberikan kendali zone tersebut. Lihat
[aturan redirect Google](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation).
Untuk pengujian login pribadi tanpa hostname publik, siapkan HTTPS localhost dengan
sertifikat yang dipercaya browser di depan SSH tunnel, lalu daftarkan callback
localhost persis sesuai origin; konfigurasi ini perlu verifikasi browser tersendiri.

Untuk akses publik melalui Cloudflare, set:

```text
AUTH_URL=https://<hostname>
Google authorized redirect URI=https://<hostname>/api/v1/auth/callback/google
```

Jangan membuka port MySQL atau index RAG ke internet. Endpoint diagnosis loopback
dan SSH tunnel melewati jalur terpisah dari Cloudflare untuk pemeriksaan operator;
keberhasilannya tidak membuktikan TLS, cache, atau OAuth pada hostname publik benar.

## 9. Contoh konfigurasi dan runbook VPS

Artifact production `DEP-04` tersedia di repository. Ikuti
[panduan bootstrap Ubuntu 24.04](./deployment-vps-bootstrap.md) untuk persiapan
tanpa domain, pengisian secret di VPS, backup/migration/seed, dan aktivasi Cloudflare.

| Artifact | Tujuan |
| --- | --- |
| [compose.production.yaml](../../compose.production.yaml) | App, job `ops`, MySQL 8.4, volume tetap, batas RAM/log, port loopback. |
| [env templates](../../deploy/production) | Template app, ops, MySQL, dan release, seluruhnya tanpa secret. |
| [Caddyfile.example](../../deploy/production/Caddyfile.example) | Reverse proxy host dengan Origin CA dan forwarded host/proto. |
| [backup-production-db.sh](../../scripts/backup-production-db.sh) | Dump InnoDB, gzip/checksum, izin terbatas, dan lock database. |

Salin Compose dan env ke `/opt/kotoba-hub`. Path env pada file repository relatif
terhadap Compose; contoh ringkas di bawah memakai path absolut pada lokasi yang
sama. File repository menjadi sumber konfigurasi, termasuk pin platform dan log
job ops. Dukungan TLS/CA MySQL eksternal baru diperlukan jika nanti memakai Aiven.
Gunakan Docker Engine dan Compose plugin **2.30+** agar `env_file.format: raw`
tersedia dan karakter seperti `$` pada secret tidak diinterpolasi.

Backup script tidak mengunggah backup atau menghapus salinan lama otomatis.
Operator harus menyiapkan salinan di luar VPS dan retensi/jadwal. Script mengambil
`.deployment.lock`; migration/seed manual memakai lock yang sama. Urutan ringkas
di bawah harus dilengkapi backup dan lock sesuai panduan bootstrap sebelum
mengubah database. Jangan menyimpulkan bootstrap VPS berhasil dari artifact lokal.

```yaml
name: kotoba-hub
services:
  app:
    image: ${APP_IMAGE:?Set APP_IMAGE to the release digest}
    env_file:
      - path: /opt/kotoba-hub/app.env
        format: raw
    ports:
      - '127.0.0.1:3000:3000'
    depends_on:
      mysql:
        condition: service_healthy
    mem_limit: 1536m
    restart: unless-stopped
    init: true
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
  ops:
    image: ${OPS_IMAGE:?Set OPS_IMAGE to the release digest}
    profiles: ['ops']
    env_file:
      - path: /opt/kotoba-hub/ops.env
        format: raw
    depends_on:
      mysql:
        condition: service_healthy
    mem_limit: 512m
    entrypoint: ['bun']
    command: ['run', 'db:migrate']
    restart: 'no'
    init: true
  mysql:
    image: ${MYSQL_IMAGE:?Set MYSQL_IMAGE to the approved MySQL 8.4 digest}
    env_file:
      - path: /opt/kotoba-hub/mysql.env
        format: raw
    command: ['--innodb-buffer-pool-size=512M', '--max-connections=50']
    volumes:
      - mysql-data:/var/lib/mysql
    mem_limit: 1536m
    restart: unless-stopped
    healthcheck:
      test:
        - CMD-SHELL
        - 'MYSQL_PWD="$$MYSQL_PASSWORD" mysql --protocol=TCP -h 127.0.0.1 -u"$$MYSQL_USER" -D "$$MYSQL_DATABASE" -e "SELECT 1" > /dev/null'
      interval: 10s
      timeout: 5s
      retries: 15
      start_period: 30s
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
volumes:
  mysql-data:
    name: kotoba-hub-mysql-data
```

Contoh `release.env`; digest app/ops diambil dari hasil publish commit yang sama.
Digest MySQL berasal dari official image versi 8.4 yang sudah diverifikasi, dan
dicatat terpisah dari versi aplikasi:

```dotenv
APP_IMAGE=docker.io/NAMESPACE/kotoba-hub@sha256:REPLACE_WITH_APP_DIGEST
OPS_IMAGE=docker.io/NAMESPACE/kotoba-hub@sha256:REPLACE_WITH_OPS_DIGEST
MYSQL_IMAGE=docker.io/library/mysql:8.4@sha256:REPLACE_WITH_MYSQL_DIGEST
```

Compose memakai bridge network default untuk app, ops, dan MySQL; tidak ada `ports`
pada MySQL. `DATABASE_URL` mengarah ke service `mysql`, bukan `127.0.0.1` di container
app. Proxy berjalan di host dan bukan service Compose pada contoh ini. Nama project
dan volume dijaga tetap sama saat rilis agar container baru memakai data yang sama.

Batas RAM, buffer pool, dan jumlah koneksi di atas adalah titik awal, bukan hasil
tuning beban production. Ukur peak app, MySQL, dan job ops pada 2C4G; kurangi beban
atau tambah kapasitas jika terjadi OOM, swap berlebihan, atau latency memburuk.
Default 10 koneksi app ditambah job ops/operator harus masuk batas koneksi MySQL.
Pertahankan digest MySQL saat rilis aplikasi biasa; upgrade image database memakai
maintenance dan backup tersendiri. Volume tidak boleh dihapus saat redeploy.

### Verifikasi lokal DEP-04

Pada **3 November 2026**, artifact lokal diverifikasi dengan Docker Engine 29.8.2,
Compose 5.5.1, official MySQL 8.4, dan image app/ops hasil build lokal `DEP-02`.
Pengujian menggunakan project/volume database test terpisah serta port app loopback
acak; tidak membaca env lokal atau mengakses VPS. Nama volume production tidak
dipakai. Seluruh container/volume uji dibersihkan setelah selesai.

- Enam tes tooling memeriksa Compose tanpa daemon, port dan pemisahan credential,
  raw env, backup/checksum/izin, kegagalan dump, serta penolakan lock bersamaan.
- MySQL healthy dengan password uji yang mengandung dollar, quote, dan spasi;
  nilai runtime tetap utuh. Backup gzip/checksum sebelum migration berhasil.
- Enam migration, dry-run dan seed syllabus, lalu dry-run dan seed flashcard
  berhasil. Katalog: 1 track, 3 unit, 9 lesson, 35 skill, 137 content block,
  90 soal quiz. Flashcard: 59 deck, 586 item/membership, seluruhnya pending dan
  belum mapped ke progress resmi. Hasil ini bukan klaim seluruh syllabus published.
- Backup setelah seed dan startup/health app berhasil. Data tetap ada setelah
  restart MySQL. Restore ke MySQL 8.4 kosong terpisah berhasil; jumlah baris semua
  27 tabel, termasuk migration journal, cocok dengan sumber.
- Caddyfile divalidasi memakai image resmi Caddy dan sertifikat uji sementara,
  tanpa network. Ini bukan pemeriksaan sertifikat origin atau TLS publik nyata.
- `bun run check` lulus: lint, typecheck, format, tes tooling rilis, serta 60
  suite/661 tes Jest. Sintaks Bash backup dan `git diff --check` lulus.

Verifikasi lokal ini tidak melakukan publish, provisioning Ubuntu jarak jauh,
backup ke storage di luar VPS, atau pengujian Cloudflare/OAuth publik.

### Konfirmasi operator DEP-04

Pada **3 November 2026**, pemilik proyek melaporkan bahwa Cloudflare dan Caddy
sudah dikonfigurasi serta aplikasi berhasil diakses melalui
`https://kotobahub.conglicorp.my.id`. `DEP-04` ditandai selesai sesuai konfirmasi
dan arahan tersebut. [Panduan bootstrap](./deployment-vps-bootstrap.md#4-aktifkan-hostname-publik-setelah-domain-tersedia)
memuat langkah Rumahweb/nameserver, DNS, Universal SSL, Origin CA, Caddy,
Full (strict), redirect, cache/firewall, serta origin auth untuk hostname ini.

Keberhasilan HTTPS adalah bukti yang dilaporkan operator. Rincian backup di luar
VPS, migration/seed runtime, aturan cache/firewall, dan login tidak diaudit ulang
oleh agent. Verifikasi flow publik, isolasi cache antar-user, persistence,
rollback, serta restore tetap mengikuti `DEP-05`; workflow deploy mengikuti
`DEP-06`.

### Deployment pertama

1. Provision Tencent Lighthouse Starter Linux **2C4G di region Jakarta**,
   buat SSH key operator, pasang Docker/Compose dan Caddy atau Nginx pada host, lalu
   siapkan direktori, env, serta file Compose di atas. VPS tidak memerlukan source repo
   atau Bun host karena perintah database dijalankan dari image `ops`.
2. Isi `mysql.env`, `app.env`, dan `ops.env` dengan password yang konsisten; root
   hanya berada di env MySQL. Siapkan backup di luar VPS dan pastikan named volume
   tujuan benar. Artifact rilis harus sesuai schema/content yang akan diimport.
3. Login Docker Hub secara interaktif di VPS dengan token read-only. Jangan
   memasukkan token literal ke command history. Tarik image app, ops, dan MySQL
   dari digest yang dicatat untuk rilis.

   ```sh
   cd /opt/kotoba-hub
   docker login --username <dockerhub-user>
   docker compose --env-file release.env -f compose.production.yaml --profile ops pull
   ```

4. Jalankan MySQL terlebih dulu. Official image membuat database/user pada volume
   kosong dari `mysql.env`; tunggu healthcheck berhasil, lalu jalankan migration.
   Lanjutkan hanya jika setiap perintah exit code `0`.

   ```sh
   docker compose --env-file release.env -f compose.production.yaml up -d --wait --wait-timeout 180 mysql
   docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:migrate
   ```

5. Untuk database baru, jalankan setiap perintah berikut berurutan. Tinjau laporan
   dry-run sebelum perintah seed berikutnya; pastikan lesson/deck published tersedia
   dan rejected lessons sudah dipahami.

   ```sh
   docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:seed:syllabus:dry-run
   docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:seed:syllabus
   docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:seed:flashcards:dry-run
   docker compose --env-file release.env -f compose.production.yaml run --rm ops run db:seed:flashcards
   ```

6. Start aplikasi dan tunggu healthcheck image, lalu periksa log tanpa membagikan secret.

   ```sh
   docker compose --env-file release.env -f compose.production.yaml up -d --no-build --no-deps --force-recreate --wait --wait-timeout 120 app
   docker compose --env-file release.env -f compose.production.yaml ps
   docker compose --env-file release.env -f compose.production.yaml logs --tail 100 app
   curl --fail http://127.0.0.1:3000/
   ```

7. Untuk diagnosis dari laptop, buka tunnel berikut dan akses `http://localhost:3000`.
   Origin `AUTH_URL` untuk percobaan ini harus konsisten; login tetap mengikuti
   kebutuhan HTTPS/callback pada bagian 8.

   ```sh
   ssh -N -L 3000:127.0.0.1:3000 deploy@<VPS_IP>
   ```

8. Siapkan zone/DNS proxied Cloudflare, edge certificate, sertifikat origin pada
   Caddy/Nginx, Full (strict), aturan bypass cache dinamis, dan firewall bagian 8.
   Update `AUTH_URL` serta callback Google ke hostname HTTPS, recreate app, lalu
   validasi/reload proxy. Uji dari **hostname publik melalui Cloudflare**:
   login, onboarding, syllabus, flashcard answer, lesson quiz, refresh progress,
   dan satu request AI bila diaktifkan. Cek `/api/v1/auth/session` tanpa cookie
   mengembalikan anonymous, session setelah login dikenali, dan data dua user tidak
   tertukar melalui cache. Pastikan API/HTML dinamis tidak menjadi cache HIT dan
   pengecekan loopback masih berhasil untuk diagnosis origin.

9. Setelah bootstrap dan pemeriksaan awal berhasil, pasang akses SSH CI, konfigurasi
   GitHub, serta script pada bagian 5. Implementasikan `DEP-06` dan jalankan satu
   deploy melalui `workflow_dispatch` menggunakan publish run yang sudah diverifikasi.
   Validasi deployment rutin mengikuti `DEP-05`; runbook manual tetap tersedia untuk recovery.

Healthcheck `/` pada Dockerfile hanya memeriksa respons halaman, bukan kesiapan
database, katalog, OAuth, atau AI. Pemeriksaan flow pada langkah 8 tetap diperlukan.
Rencana awal menerima downtime singkat saat container diganti; `restart` policy
menangani proses yang keluar, bukan otomatis memperbaiki container yang hanya unhealthy.

### Rilis berikutnya dan rollback

Deploy rutin memakai [workflow DEP-06](./deployment-workflow.md); langkah manual
berikut untuk maintenance/recovery operator. Pegang `.deployment.lock` selama
seluruh rangkaian dan periksa worker/container migration sebelum memulihkan app.
Pada rilis manual, gunakan kandidat env terpisah dan perbarui `release.env`
secara atomik hanya setelah health berhasil, seperti worker DEP-06.

1. Catat/cadangkan `release.env` sebelumnya sebagai `release.previous.env`, digest,
   versi schema/content, dan backup database sebelum perubahan data.
2. Isi digest app/ops baru, tarik hanya image tersebut, dan pertahankan digest
   MySQL serta named volume. Pastikan database healthy, lalu jalankan migration
   jika diperlukan. Gunakan
   migration kompatibel dengan app lama yang masih berjalan; untuk perubahan yang
   tidak kompatibel, hentikan app dalam maintenance window sebelum mengubah schema.
3. Seed hanya jika diperlukan sesuai bagian 6. Gagal migration/seed berarti rilis
   dihentikan untuk diagnosis, bukan lanjut menjalankan app baru.
4. Recreate app, periksa health dan flow utama, lalu catat hasil deployment. Hindari
   deployment bersamaan; hapus image lama hanya setelah masa rollback selesai.
5. Jika app baru gagal dan schema masih kompatibel, tarik/start digest sebelumnya:

   Untuk rollback sesudah deployment sukses, gunakan `release.previous.env`
   global. Untuk deployment yang gagal sebelum commit, gunakan
   `.deployments/DEPLOY_RUN_ID-ATTEMPT/release.previous.env` milik percobaan itu;
   file global dapat masih merujuk rilis yang lebih lama. Contoh di bawah untuk
   rollback sesudah sukses; ganti nilai `rollback_release` pada kasus gagal.

   ```sh
   rollback_release=release.previous.env
   docker compose --env-file "$rollback_release" -f compose.production.yaml pull app
   docker compose --env-file "$rollback_release" -f compose.production.yaml up -d --no-build --no-deps --force-recreate --wait --wait-timeout 120 app
   ```

   Setelah health dan identitas app sesuai, selaraskan `release.env` dengan snapshot
   rollback menggunakan file sementara mode `0600` dan rename atomik di dalam lock
   yang sama. Catat hasil recovery sebelum acknowledge marker deployment gagal.

Rollback image tidak membatalkan migration atau seed. Jika schema sudah tidak
kompatibel, pilih forward fix atau restore backup dalam maintenance window setelah
menilai data baru yang dapat hilang. Jangan memakai `docker compose down -v` sebagai
langkah redeploy atau recovery database.

### Jika beralih ke Aiven

Ikuti prosedur pemindahan data pada bagian 3 dan selesaikan `DEP-03` sebelum switch.
Buat varian Compose terpisah: hapus service/dependency MySQL lokal dari app dan ops,
tambahkan mount CA read-only pada keduanya, lalu ubah URL runtime ke hostname/port
Aiven. Tidak perlu rebuild app untuk mengganti URL. Pertahankan volume lokal sebagai
bagian rencana pemulihan sampai verifikasi selesai; jangan biarkan MySQL lokal
dan Aiven menerima penulisan aplikasi secara bersamaan.

## 10. Persiapan eksperimen RAG dan operasi minimum

Deploy baseline aplikasi terlebih dulu. Tambahkan retrieval setelah evaluasi
membutuhkan grounding tambahan; RAG belum menjadi konfigurasi yang dapat diaktifkan dengan env. Jangan menambahkan
`RAG_ENABLED` atau service vector ke runbook seolah sudah didukung aplikasi.

Untuk eksperimen berikutnya:

- Mulai dari retrieval terstruktur ke katalog/read model yang sudah diotorisasi.
  Pilih vector store setelah ukuran corpus, metadata filter, model embedding, dan
  metrik evaluasi ditetapkan. Free MySQL tidak otomatis menyediakan vector search.
- Jalankan ingestion/indexing sebagai job terpisah. Batasi concurrency agar tidak
  menghabiskan RAM/CPU app, serta gunakan volume persisten bila index disimpan di VPS.
- Catat versi corpus, strategi chunking, model/dimensi embedding, index, prompt,
  commit, latency retrieval, serta usage/biaya untuk membandingkan hasil eksperimen.
  Simpan state learner di MySQL; index harus bisa dibangun ulang dari sumber canonical.
- Biaya API dan embedding dipisahkan dari biaya VPS. Log estimasi biaya tidak
  menjadi hard cap tagihan; batasi peserta dan frekuensi eksperimen sesuai anggaran.
- Pantau RAM/CPU/disk VPS, pemakaian storage/koneksi MySQL, error request, latency,
  dan pertumbuhan log AI. Pool saat ini maksimal 10 koneksi per proses; hitung juga
  job `ops` dan koneksi operator terhadap batas database. Pada 2C4G, jalankan job
  ingestion/database secara bergantian dan jangan menambahkan service eksperimen
  lain tanpa mengukur kapasitas yang tersisa.
- Siapkan backup database sebelum perubahan dan secara berkala selama eksperimen;
  simpan salinan di luar VPS dan uji restore. Tetapkan retensi log/data eksperimen
  berdasarkan ukuran aktual, bukan menghapus progress learner tanpa kebijakan.

## 11. Pekerjaan implementasi berikutnya

Task deployment dilacak di [task breakdown](../task-breakdown.md). Dokumen ini
menetapkan baseline `DEP-00`; artifact `DEP-01` dan workflow publish `DEP-02`
sudah tersedia. Status dan
urutan implementasi:

1. `DEP-01`: target image `ops`, allowlist build context, dan script verifikasi
   artifact app/ops tersedia; lihat bagian 6 untuk penggunaan dan batas verifikasi.
2. `DEP-02`: job publish setelah quality lulus, tag commit, dan artifact
   `release-metadata` berisi commit/run/digest sudah tersedia. Lihat bagian 5 untuk
   konfigurasi Docker Hub, batas verifikasi lokal, dan recovery publish parsial.
3. `DEP-04`: selesai sesuai konfirmasi dan arahan pemilik proyek pada 3 November
   2026; Cloudflare/Caddy dikonfigurasi dan aplikasi dapat diakses melalui hostname
   HTTPS `kotobahub.conglicorp.my.id`. Artifact lokal dan panduan tersedia pada
   bagian 9. Verifikasi operasional lanjutan tetap pada `DEP-05`.
4. `DEP-06`: workflow `workflow_dispatch`/SSH dan validasi publish run tersedia,
   worker berversi sudah dipasang di VPS serta preflight lulus. Panduan konfigurasi
   GitHub, lock/concurrency, backup/migration, health, dan recovery ada pada
   [deployment workflow](./deployment-workflow.md). Pengisian variable/secret oleh
   operator dan verifikasi workflow live masih diperlukan pada `DEP-05`.
5. `DEP-05`: verifikasi workflow deploy sukses/gagal, concurrency/retry/recovery,
   flow publik melalui Cloudflare, origin/OAuth, isolasi cache
   antar-user, perubahan env tanpa rebuild, persistence/restart VPS, rollback image,
   serta restore database. Dependency: `DEP-04` dan `DEP-06`.
6. `DEP-03` **opsional untuk pemisahan database**: implementasikan TLS/CA MySQL
   konsisten untuk app, migration, dan seed, lalu verifikasi pada database uji.
   Task ini wajib selesai sebelum beralih ke Aiven dan tidak menjadi dependency
   deployment awal dengan MySQL satu VPS.

Urutan baseline: **DEP-01 → DEP-02 → DEP-04 → DEP-06 → DEP-05**.

`IMP-17`, `SYL-07`, dan task pengujian yang masih terbuka tetap mengikuti status
pada task breakdown. Penulisan rencana deployment ini tidak menyatakan integrasi
end-to-end, kapasitas production, atau RAG sudah tervalidasi.
