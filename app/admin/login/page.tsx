import Link from "next/link";
import { AuthForm } from "../../auth-form";

export default function AdminLoginPage() {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="brand-mark">s.</span>
          <span>sido<span className="brand-light">invitation</span></span>
        </Link>
        <div className="auth-aside-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> AREA ADMINISTRATOR</p>
          <h1>Kelola setiap<br />cerita <em>dari sini.</em></h1>
          <p>Masuk untuk mengelola undangan dan melihat aktivitas pada platform SidoInvitation.</p>
        </div>
        <span className="auth-aside-footer">AKSES KHUSUS ADMIN.</span>
        <span className="auth-deco" aria-hidden="true" />
      </aside>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <p className="eyebrow">ADMINISTRATOR</p>
          <h2>Masuk sebagai admin</h2>
          <p className="auth-subtitle">Gunakan email dan kata sandi admin yang sudah dikonfigurasi.</p>
          <AuthForm mode="admin" />
          <p className="auth-switch">Masuk sebagai pengguna? <Link href="/login">Login pengguna</Link></p>
          <Link className="auth-back" href="/">← Kembali ke beranda</Link>
        </div>
      </section>
    </main>
  );
}
