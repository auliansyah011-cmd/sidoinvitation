import Link from "next/link";
import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="brand-mark">s.</span>
          <span>sido<span className="brand-light">invitation</span></span>
        </Link>
        <div className="auth-aside-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> AWAL DARI CERITA KALIAN</p>
          <h1>Hari bahagia<br />pantas punya <em>undangan istimewa.</em></h1>
          <p>Buat akun dan mulai rangkai undangan yang terasa seperti kalian.</p>
        </div>
        <span className="auth-aside-footer">SATU HARI YANG ISTIMEWA. AWAL DARI SELAMANYA.</span>
        <span className="auth-deco" aria-hidden="true" />
      </aside>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <p className="eyebrow">MULAI DI SINI</p>
          <h2>Buat akun baru</h2>
          <p className="auth-subtitle">Isi detail berikut untuk memulai undangan kalian.</p>
          <AuthForm mode="register" />
          <p className="auth-switch">Sudah punya akun? <Link href="/login">Masuk</Link></p>
          <Link className="auth-back" href="/">← Kembali ke beranda</Link>
        </div>
      </section>
    </main>
  );
}
