# SidoInvitation

Backend API Next.js menggunakan Prisma ORM dan PostgreSQL Supabase.

## Persiapan Supabase

1. Buat project Supabase lalu buka **Project Settings → Database → Connection string**.
2. Salin connection string **Transaction pooler** ke `DATABASE_URL` untuk koneksi runtime aplikasi. Ganti placeholder username, password, dan region dengan nilai dari Supabase; biasanya parameter `pgbouncer=true` dibutuhkan.
3. Salin connection string **Direct connection** ke `DIRECT_URL` untuk menjalankan migrasi.
4. Salin `.env.example` menjadi `.env` dan isi kedua URL database, `AUTH_SECRET`, serta nilai `ADMIN_*`. Jangan commit `.env`.
5. Pastikan `AUTH_SECRET` berupa nilai acak yang panjangnya minimal 32 karakter dan kata sandi admin kuat (minimal 12 karakter).
6. Isi harga pada `INVITATION_PRICE_IDR` dan rekening tujuan pada `TRANSFER_BANK_NAME`, `TRANSFER_ACCOUNT_NAME`, serta `TRANSFER_ACCOUNT_NUMBER`.
7. Dari **Project Settings → API**, ambil Project URL dan `service_role` key untuk `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`. Service role key adalah rahasia server: jangan gunakan awalan `NEXT_PUBLIC_` dan jangan kirim ke browser.
8. Dari **Storage**, buat bucket bernama `payment-proofs`, set sebagai **private**, lalu isi `SUPABASE_STORAGE_BUCKET` dengan nama yang sama.

Generate Prisma Client dan buat tabel di Supabase:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
```

Saat mengembangkan schema, gunakan `npm run db:migrate -- --name nama_perubahan`. Jangan jalankan `migrate dev` terhadap database production.

Jika database sudah berisi migrasi awal, terapkan migrasi dashboard dan pembayaran yang baru dengan `npm run db:deploy`, lalu jalankan ulang `npm run db:seed` agar akun admin memiliki status aktif. Migrasi menambahkan aktivitas, status akun, review bukti transfer, dan kode unik pembayaran per user. Perubahan schema belum berlaku sampai migrasi berhasil dijalankan.

## Dashboard dan pembayaran

- `/admin/login` adalah login khusus admin; setelah berhasil masuk, admin diarahkan ke `/admin`.
- Admin melihat daftar user, waktu daftar/login terakhir, jumlah undangan, jumlah pembayaran berhasil, aktivitas terakhir, dan dapat menonaktifkan atau mengaktifkan kembali akun.
- User masuk lewat `/login`, lalu menggunakan `/dashboard` untuk memilih template, mengisi detail acara, menyimpan draft, melihat rekening tujuan, dan mengunggah bukti transfer.
- Admin mengelola katalog template di panel **Katalog template**. Template baru langsung tersedia di pilihan user setelah disimpan; template dapat diedit atau dinonaktifkan tanpa menghapus undangan yang sudah dibuat.
- Harga satu undangan dikonfigurasi lewat `INVITATION_PRICE_IDR`. Setiap user diberi kode unik 3 digit yang tetap; kode ditambahkan ke harga dasar, misalnya Rp150.000 + kode 123 menjadi transfer Rp150.123.
- Kode pembayaran 001-999 dijamin unik antar-user dan disimpan di database. Kapasitasnya 999 user dengan kode teralokasi. Salin nominal total yang ditampilkan saat transfer; admin dapat mencocokkan kode unik di dashboard.
- Setelah menambahkan migrasi kode pembayaran, jalankan `npm run db:deploy` dan restart server Next.js supaya Prisma Client dan koneksi memuat schema terbaru.
- Akun baru dapat login dan membuat draft, tetapi belum berstatus aktif. Setelah bukti dikirim, pembayaran berstatus `AWAITING_REVIEW`. Hanya admin yang dapat menyetujui atau menolak bukti.
- Bukti disimpan di bucket Supabase Storage **private**, dibatasi 5 MB dan format JPG, PNG, WebP, atau PDF. Admin melihat bukti melalui endpoint yang memerlukan session admin.
- Persetujuan admin mengubah pembayaran menjadi `PAID`, mengaktifkan akun, dan menerbitkan undangan. Penolakan memungkinkan user mengirim bukti baru.
- Transfer manual tidak memeriksa transaksi bank secara otomatis. Admin harus memastikan nominal, rekening tujuan, dan transaksi benar sebelum menyetujui.

## Endpoint

Semua request dan response menggunakan JSON. Session memakai cookie `sidoinvitation_session` yang `HttpOnly`, `SameSite=Lax`, dan `Secure` di production.

| Method | Endpoint | Auth | Kegunaan |
| --- | --- | --- | --- |
| `POST` | `/api/auth/admin/login` | Publik | Login akun admin yang dibuat melalui seed |
| `POST` | `/api/auth/register` | Publik | Daftar akun pengguna; langsung membuat session |
| `POST` | `/api/auth/login` | Publik | Login akun pengguna |
| `GET` | `/api/users/me` | User/admin | Mendapatkan profil session aktif |
| `GET` | `/api/templates` | Publik | Daftar template aktif yang dapat dipilih user |
| `GET` | `/api/admin/templates` | Admin | Daftar semua template, termasuk yang nonaktif |
| `POST` | `/api/admin/templates` | Admin | Menambah template undangan |
| `PUT` | `/api/admin/templates/:id` | Admin | Mengedit template atau mengaktifkan/menonaktifkannya |
| `GET` | `/api/undangan?page=1&limit=10` | User/admin | Daftar undangan milik sendiri; admin melihat semua |
| `GET` | `/api/undangan/:id-atau-slug` | Publik untuk undangan terbit; selain itu pemilik/admin | Detail undangan |
| `POST` | `/api/undangan` | User/admin | Membuat undangan |
| `PUT` | `/api/undangan/:id` | Pemilik/admin | Mengganti field undangan |
| `DELETE` | `/api/undangan/:id` | Pemilik/admin | Menghapus undangan |
| `GET` | `/api/admin/users?page=1&limit=10` | Admin | Ringkasan dan daftar aktivitas user |
| `PATCH` | `/api/admin/users/:id` | Admin | Nonaktifkan/aktifkan user dengan `{ "disabled": true }` |
| `POST` | `/api/pembayaran` | Pemilik undangan | Buat instruksi transfer manual |
| `GET` | `/api/pembayaran?invitationId=...` | Pemilik/admin | Lihat status dan rekening tujuan |
| `POST` | `/api/pembayaran/:id/bukti` | Pemilik pembayaran | Unggah bukti multipart (`proof`) |
| `GET` | `/api/admin/payments?page=1&limit=50` | Admin | Daftar bukti yang menunggu verifikasi |
| `GET` | `/api/admin/payments/:id/bukti` | Admin | Melihat file bukti dari bucket private |
| `PATCH` | `/api/admin/payments/:id` | Admin | Tinjau dengan `{ "decision": "approve" }` atau `"reject"` |

Daftar undangan dibatasi untuk user yang login agar draft tidak terbuka ke publik. Detail undangan berstatus `PUBLISHED` bisa dibaca publik menggunakan ID atau slug; draft hanya bisa dibaca pemilik/admin. Admin disiapkan lewat variabel seed, bukan lewat endpoint registrasi publik.

### Register

```json
{
  "name": "Alya Putri",
  "username": "alyaputri",
  "email": "alya@example.com",
  "password": "contoh-password-kuat-123"
}
```

Password harus 8-72 karakter dan mengandung huruf serta angka. Email dan username harus unik.

### Login

Kedua endpoint login menerima:

```json
{
  "email": "alya@example.com",
  "password": "contoh-password-kuat-123"
}
```

Gunakan `credentials: "include"` pada fetch dari browser agar cookie session tersimpan dan dikirim.

### Buat atau edit undangan

`POST /api/undangan` dan `PUT /api/undangan/:id` menerima field berikut. PUT memerlukan field utama lengkap; `slug` boleh tidak dikirim saat edit untuk mempertahankan slug sebelumnya.

```json
{
  "title": "Pernikahan Alya & Bima",
  "slug": "alya-dan-bima",
  "brideName": "Alya Putri",
  "groomName": "Bima Pratama",
  "eventDate": "2027-08-24T08:00:00.000Z",
  "venue": "Pendopo Asri",
  "address": "Jl. Melati No. 10, Yogyakarta",
  "description": "Dengan bahagia kami mengundang Anda.",
  "coverImage": "https://example.com/cover.jpg"
}
```

`slug`, `description`, `coverImage`, dan `status` opsional. Slug tanpa input dibuat otomatis. Field nullable `description` dan `coverImage` dapat dikirim `null` untuk dikosongkan. `status` bernilai `DRAFT` atau `PUBLISHED` dan hanya admin yang boleh menerbitkan undangan.

Contoh response pagination:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

Error memakai bentuk `{ "error": "..." }`; input invalid juga mengembalikan detail validasi. Status yang umum: `400`, `401`, `403`, `404`, dan `409`.

Template menerima `name`, `style`, `color` (`olive`, `rose`, `blue`, `peach`, `sand`, atau `plum`), `description`, `coverImage` (URL HTTP/HTTPS atau `null`), dan `isActive`. Slug dibuat oleh server saat template baru ditambahkan dan tidak berubah ketika template diedit.

Setelah menambahkan migrasi katalog template, jalankan `npm run db:deploy` dan `npm run db:generate`, lalu restart server Next.js. Migrasi akan mengisi katalog awal dengan pilihan template yang sebelumnya sudah tersedia di dashboard user.
