import Link from "next/link";
import { AuthForm } from "../auth-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="brand-mark">s.</span>
          <span>sido<span className="brand-light">invitation</span></span>
        </Link>
        <div className="auth-aside-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> SENANG BERTEMU LAGI</p>
          <h1>Cerita kalian<br />menunggu <em>dilanjutkan.</em></h1>
          <p>Masuk untuk kembali mengelola undangan dan menyimpan setiap detail hari istimewa kalian.</p>
        </div>
        <span className="auth-aside-footer">MERANGKAI CERITA, MERAYAKAN CINTA.</span>
        <span className="auth-deco" aria-hidden="true" />
      </aside>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <p className="eyebrow">SELAMAT DATANG KEMBALI</p>
          <h2>Masuk ke akun</h2>
          <p className="auth-subtitle">Masukkan detail akun kalian untuk melanjutkan.</p>
          <AuthForm mode="login" />
          <p className="auth-switch">Belum punya akun? <Link href="/register">Daftar sekarang</Link></p>
          <p className="auth-switch">Admin? <Link href="/admin/login">Masuk sebagai admin</Link></p>
          <Link className="auth-back" href="/">← Kembali ke beranda</Link>
        </div>
      </section>
    </main>
  );
}
