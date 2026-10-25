import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Mudah dibagikan",
    description:
      "Satu tautan untuk semua tamu. Bagikan undangan lewat WhatsApp atau media sosial.",
    icon: "↗",
  },
  {
    number: "02",
    title: "Konfirmasi kehadiran",
    description:
      "Pantau RSVP tamu dengan praktis dan tahu siapa saja yang akan hadir.",
    icon: "♡",
  },
  {
    number: "03",
    title: "Detail acara lengkap",
    description:
      "Cantumkan lokasi, jadwal, cerita kalian, galeri, hingga buku tamu digital.",
    icon: "⌖",
  },
  {
    number: "04",
    title: "Musik pilihanmu",
    description:
      "Sambut tamu dengan lagu favorit yang membuat undangan terasa lebih personal.",
    icon: "♫",
  },
  {
    number: "05",
    title: "Hitung mundur hari bahagia",
    description:
      "Ajak orang tersayang ikut menantikan momen spesial bersama kalian.",
    icon: "◷",
  },
  {
    number: "06",
    title: "Nyaman di semua perangkat",
    description:
      "Tampilan undangan menyesuaikan layar ponsel, tablet, maupun komputer.",
    icon: "⌘",
  },
];

const templates = [
  { name: "Senja di Ubud", type: "RUSTIC · HANGAT", tone: "olive", number: "01" },
  { name: "Janji Suci", type: "KLASIK · ELEGAN", tone: "rose", number: "02" },
  { name: "Ruang Berdua", type: "MODERN · MINIMAL", tone: "blue", number: "03" },
  { name: "Bunga Pagi", type: "FLORAL · ROMANTIS", tone: "peach", number: "04" },
  { name: "Satu Cerita", type: "EDITORIAL · BERSIH", tone: "sand", number: "05" },
  { name: "Malam Minggu", type: "GELAP · DRAMATIS", tone: "plum", number: "06" },
];

const questions = [
  {
    question: "Apa itu SidoInvitation?",
    answer:
      "SidoInvitation membantu kalian membuat undangan pernikahan digital yang personal, mudah dibagikan, dan praktis dikelola.",
  },
  {
    question: "Apakah undangan bisa dibuka di ponsel?",
    answer:
      "Bisa. Setiap desain dibuat responsif agar nyaman dilihat di ponsel, tablet, maupun komputer.",
  },
  {
    question: "Bagaimana cara membagikan undangan?",
    answer:
      "Setelah undangan siap, kalian dapat membagikan tautannya melalui WhatsApp, pesan, atau media sosial.",
  },
  {
    question: "Bisakah saya melihat daftar RSVP tamu?",
    answer:
      "Dashboard nantinya menjadi tempat untuk mengelola undangan dan melihat konfirmasi kehadiran tamu.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="SidoInvitation, beranda">
          <span className="brand-mark">s.</span>
          <span>sido<span className="brand-light">invitation</span></span>
        </Link>
        <nav className="main-nav" aria-label="Navigasi utama">
          <a href="#fitur">Fitur</a>
          <a href="#template">Template</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          <a className="login-link" href="/login">Masuk</a>
          <a className="button button-dark button-small" href="/register">Buat undangan <span>↗</span></a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> UNDANGAN DIGITAL, CERITA PERSONAL</p>
          <h1>Hari istimewa,<br />dimulai dari <em>undangan.</em></h1>
          <p className="hero-description">
            Ceritakan kisah kalian dalam undangan digital yang hangat, indah,
            dan mudah dibagikan kepada orang-orang tersayang.
          </p>
          <div className="hero-actions">
            <a className="button button-dark" href="/register">Mulai buat undangan <span>↗</span></a>
            <a className="text-link" href="#template">Jelajahi template <span>↓</span></a>
          </div>
          <div className="hero-note">
            <span className="avatar-stack" aria-hidden="true"><i>♡</i><i>✳</i><i>✦</i></span>
            <span>Untuk hari yang paling kalian nantikan</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Ilustrasi undangan pernikahan" role="img">
          <div className="art-sun" />
          <div className="art-stem stem-one" /><div className="art-stem stem-two" />
          <div className="art-leaf leaf-one" /><div className="art-leaf leaf-two" />
          <div className="art-card">
            <span className="art-card-kicker">THE WEDDING OF</span>
            <span className="art-card-names">Alya <i>&amp;</i> Bima</span>
            <span className="art-card-date">SABTU, 24 AGUSTUS 2025</span>
            <span className="art-card-flower">✳</span>
          </div>
          <div className="art-caption"><span>01 / 06</span><span>THE WARMTH COLLECTION</span></div>
          <span className="art-sparkle sparkle-one">✳</span>
          <span className="art-sparkle sparkle-two">✦</span>
        </div>
        <div className="hero-bottom"><span>DIRANGKAI DENGAN HATI</span><span>01 — 04</span></div>
      </section>

      <section className="intro-strip">
        <p>SEBUAH HARI, SEJUTA KENANGAN</p>
        <p>Undangan kecil untuk cerita cinta yang besar.</p>
        <span>✳</span>
      </section>

      <section className="section features-section" id="fitur">
        <div className="section-heading">
          <div><p className="eyebrow">DIRANCANG UNTUK KALIAN</p><h2>Semua yang dibutuhkan,<br /><em>dalam satu undangan.</em></h2></div>
          <p className="section-aside">Bukan sekadar informasi acara. Buat setiap detail terasa seperti kalian.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-card-top"><span className="feature-icon">{feature.icon}</span><span>{feature.number}</span></div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="templates-section" id="template">
        <div className="section">
          <div className="section-heading template-heading">
            <div><p className="eyebrow">PILIH YANG PALING KALIAN</p><h2>Seperti cerita <em>kalian.</em></h2></div>
            <a className="text-link" href="/register">Lihat semua template <span>↗</span></a>
          </div>
          <div className="template-grid">
            {templates.map((template) => (
              <a className="template-card" href="/register" key={template.number}>
                <div className={`template-art template-${template.tone}`}>
                  <span className="template-index">{template.number} / 06</span>
                  <span className="template-flower">✳</span>
                  <span className="template-script">A &amp; B</span>
                  <span className="template-view">LIHAT DESAIN ↗</span>
                </div>
                <div className="template-meta"><span>{template.name}</span><span>{template.type}</span></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="faq-section section" id="faq">
        <div className="faq-intro">
          <p className="eyebrow">ADA YANG INGIN DITANYAKAN?</p>
          <h2>Senang bisa<br /><em>membantu.</em></h2>
          <p>Hal yang sering ditanyakan seputar undangan digital kalian.</p>
          <a className="text-link" href="mailto:halo@sidoinvitation.com">Hubungi kami <span>↗</span></a>
        </div>
        <div className="faq-list">
          {questions.map((item, index) => (
            <details className="faq-item" key={item.question}>
              <summary><span className="faq-number">0{index + 1}</span><span>{item.question}</span><span className="faq-toggle">+</span></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="closing-cta">
        <p className="eyebrow">MULAI DENGAN CERITA KALIAN</p>
        <h2>Satu hari yang istimewa.<br /><em>Awal dari selamanya.</em></h2>
        <a className="button button-light" href="/register">Buat undangan sekarang <span>↗</span></a>
        <span className="closing-flower">✳</span>
      </section>

      <footer className="site-footer">
        <Link className="brand" href="/"><span className="brand-mark">s.</span><span>sido<span className="brand-light">invitation</span></span></Link>
        <p>Merangkai cerita, merayakan cinta.</p>
        <span>© 2025 SidoInvitation</span>
      </footer>
    </main>
  );
}
