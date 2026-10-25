"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Profile = { id: string; name: string; email: string; role: string; isActive: boolean };
type Invitation = {
  id: string;
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  venue: string;
  status: "DRAFT" | "PUBLISHED";
  templateId: string;
  payments: Payment[];
};
type Payment = {
  id: string;
  orderId: string;
  amount: number;
  paymentCode: number | null;
  currency: string;
  bank: string;
  status: "PENDING" | "AWAITING_REVIEW" | "PAID" | "FAILED" | "EXPIRED" | "REJECTED";
  submittedAt: string | null;
  paidAt: string | null;
  reviewedAt: string | null;
};

type TransferAccount = { bankName: string; accountName: string; accountNumber: string };
type InvitationTemplate = {
  id: string;
  slug: string;
  name: string;
  style: string;
  description: string | null;
  coverImage: string | null;
  color: string;
};

async function readApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Permintaan tidak dapat diproses.");
  return body as T;
}

export function UserDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment>>({});
  const [transferAccounts, setTransferAccounts] = useState<Record<string, TransferAccount>>({});
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPayment, setUploadingPayment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [profileResult, invitationResult, templateResult] = await Promise.all([
        readApi<{ user: Profile }>("/api/users/me"),
        readApi<{ data: Invitation[] }>("/api/undangan?page=1&limit=50"),
        readApi<{ data: InvitationTemplate[] }>("/api/templates"),
      ]);
      setProfile(profileResult.user);
      setInvitations(invitationResult.data);
      setTemplates(templateResult.data);
      setPayments(Object.fromEntries(
        invitationResult.data
          .filter((invitation) => invitation.payments.length > 0)
          .map((invitation) => [invitation.id, invitation.payments[0]]),
      ));
    } catch (loadError) {
      setError(true);
      setMessage(loadError instanceof Error ? loadError.message : "Gagal memuat dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      readApi<{ user: Profile }>("/api/users/me"),
      readApi<{ data: Invitation[] }>("/api/undangan?page=1&limit=50"),
      readApi<{ data: InvitationTemplate[] }>("/api/templates"),
    ])
      .then(([profileResult, invitationResult, templateResult]) => {
        if (cancelled) return;
        setProfile(profileResult.user);
        setInvitations(invitationResult.data);
        setTemplates(templateResult.data);
        setPayments(Object.fromEntries(
          invitationResult.data
            .filter((invitation) => invitation.payments.length > 0)
            .map((invitation) => [invitation.id, invitation.payments[0]]),
        ));
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(true);
        setMessage(loadError instanceof Error ? loadError.message : "Gagal memuat dashboard.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(false);
    setMessage("");
    setIsSaving(true);
    const values = new FormData(event.currentTarget);
    const eventDate = values.get("eventDate");

    try {
      await readApi<{ data: Invitation }>("/api/undangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.get("title"),
          brideName: values.get("brideName"),
          groomName: values.get("groomName"),
          eventDate: new Date(String(eventDate)).toISOString(),
          venue: values.get("venue"),
          address: values.get("address"),
          description: values.get("description") || null,
          coverImage: values.get("coverImage") || null,
          templateId: selectedTemplate || templates[0].slug,
        }),
      });
      setMessage("Undangan tersimpan sebagai draft. Lanjutkan pembayaran untuk mengaktifkannya.");
      form.reset();
      await loadDashboard();
    } catch (createError) {
      setError(true);
      setMessage(createError instanceof Error ? createError.message : "Gagal membuat undangan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function startPayment(invitationId: string) {
    setError(false);
    setMessage("");
    try {
      const result = await readApi<{ data: Payment; transferAccount: TransferAccount }>("/api/pembayaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      setPayments((current) => ({ ...current, [invitationId]: result.data }));
      setTransferAccounts((current) => ({ ...current, [invitationId]: result.transferAccount }));
      setMessage("Instruksi transfer tersedia. Setelah transfer, unggah bukti untuk ditinjau admin.");
    } catch (paymentError) {
      setError(true);
      setMessage(paymentError instanceof Error ? paymentError.message : "Gagal membuat pembayaran.");
    }
  }

  async function refreshPayment(invitationId: string) {
    try {
      const result = await readApi<{ data: Payment | null; transferAccount: TransferAccount }>(
        `/api/pembayaran?invitationId=${encodeURIComponent(invitationId)}`,
      );
      setTransferAccounts((current) => ({ ...current, [invitationId]: result.transferAccount }));
      if (result.data) {
        setPayments((current) => ({ ...current, [invitationId]: result.data! }));
        if (result.data.status === "PAID") {
          setMessage("Pembayaran berhasil. Akun dan undangan sudah aktif.");
          await loadDashboard();
        } else if (result.data.status === "AWAITING_REVIEW") {
          setMessage("Bukti pembayaran sedang ditinjau admin.");
        }
      }
    } catch (refreshError) {
      setError(true);
      setMessage(refreshError instanceof Error ? refreshError.message : "Gagal memeriksa pembayaran.");
    }
  }

  async function submitProof(event: FormEvent<HTMLFormElement>, paymentId: string, invitationId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("proof");
    if (!(file instanceof File) || file.size === 0) {
      setError(true);
      setMessage("Pilih file bukti pembayaran terlebih dahulu.");
      return;
    }
    setUploadingPayment(paymentId);
    setError(false);
    setMessage("");
    try {
      const response = await fetch(`/api/pembayaran/${paymentId}/bukti`, {
        method: "POST",
        body: new FormData(form),
      });
      const result: { message?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Gagal mengirim bukti pembayaran.");
      setMessage(result.message ?? "Bukti pembayaran berhasil dikirim.");
      form.reset();
      await refreshPayment(invitationId);
    } catch (uploadError) {
      setError(true);
      setMessage(uploadError instanceof Error ? uploadError.message : "Gagal mengirim bukti.");
    } finally {
      setUploadingPayment("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">s.</span>
          <span>sido<span className="brand-light">invitation</span></span>
        </Link>
        <div className="dashboard-account">
          <span>{profile?.name ?? "Akun user"}</span>
          <button className="dashboard-logout" type="button" onClick={logout}>Keluar</button>
          <span className="account-avatar">{profile?.name?.slice(0, 1) ?? "U"}</span>
        </div>
      </header>
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <p className="dashboard-label">MENU USER</p>
          <nav className="dashboard-nav" aria-label="Navigasi dashboard user">
            <a className="active" href="#ringkasan">◫ &nbsp; Dashboard</a>
            <a href="#pilih-template">✳ &nbsp; Pilih template</a>
            <a href="#undangan-saya">♡ &nbsp; Undangan saya</a>
          </nav>
        </aside>
        <section className="dashboard-content">
          <p className="eyebrow">RUANG KALIAN</p>
          <h1>{profile ? `Selamat datang, ${profile.name}.` : "Dashboard user"}</h1>
          <p className="dashboard-lead">Buat undangan, pilih desain, lalu aktifkan melalui pembayaran.</p>

          {profile && (
            <div className={`activation-banner${profile.isActive ? " activation-banner-active" : ""}`} id="ringkasan">
              <span>{profile.isActive ? "AKUN AKTIF" : "AKUN BELUM AKTIF"}</span>
              <p>{profile.isActive
                ? "Terima kasih, pembayaran kalian telah mengaktifkan akun."
                : "Setelah transfer, kirim bukti pembayaran. Admin akan meninjau lalu mengaktifkan akun dan undangan."}</p>
            </div>
          )}

          {message && <p className={`dashboard-message${error ? " form-message-error" : ""}`} role={error ? "alert" : "status"}>{message}</p>}
          {isLoading && <p className="dashboard-lead">Memuat data akun...</p>}
          {error && !profile && <p className="dashboard-message form-message-error">{message} <Link href="/login">Masuk kembali</Link></p>}

          <form className="invitation-builder" onSubmit={createInvitation}>
            <div className="builder-heading" id="pilih-template">
              <div>
                <p className="eyebrow">LANGKAH 1</p>
                <h2>Pilih template undangan</h2>
              </div>
              <span>01 — 03</span>
            </div>
            {templates.length === 0 && !isLoading && (
              <p className="dashboard-lead">Belum ada template yang tersedia. Silakan coba lagi nanti.</p>
            )}
            <div className="dashboard-template-grid">
              {templates.map((template) => (
                <button
                  aria-pressed={(selectedTemplate || templates[0]?.slug) === template.slug}
                  className={`dashboard-template${(selectedTemplate || templates[0]?.slug) === template.slug ? " selected" : ""}`}
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.slug)}
                  type="button"
                >
                  <span
                    className={`dashboard-template-art template-${template.color}`}
                    style={template.coverImage ? {
                      backgroundImage: `linear-gradient(#0002, #0002), url(${JSON.stringify(template.coverImage)})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                      color: "#fff",
                    } : undefined}
                  >A <i>&amp;</i> B</span>
                  <span className="dashboard-template-name">{template.name}</span>
                  <span className="dashboard-template-style">{template.style}</span>
                  {template.description && <span className="dashboard-template-style">{template.description}</span>}
                </button>
              ))}
            </div>
            <div className="builder-heading builder-heading-form">
              <div>
                <p className="eyebrow">LANGKAH 2</p>
                <h2>Isi detail hari istimewa</h2>
              </div>
              <span>DETAIL ACARA</span>
            </div>
            <div className="invitation-form-grid">
              <label className="form-field">Judul undangan<input name="title" placeholder="Pernikahan Alya & Bima" required maxLength={150} /></label>
              <label className="form-field">Nama mempelai wanita<input name="brideName" placeholder="Nama lengkap" required maxLength={100} /></label>
              <label className="form-field">Nama mempelai pria<input name="groomName" placeholder="Nama lengkap" required maxLength={100} /></label>
              <label className="form-field">Tanggal dan waktu acara<input name="eventDate" type="datetime-local" required /></label>
              <label className="form-field">Nama lokasi<input name="venue" placeholder="Nama gedung atau lokasi" required maxLength={200} /></label>
              <label className="form-field">Alamat acara<input name="address" placeholder="Alamat lengkap" required maxLength={500} /></label>
              <label className="form-field invitation-form-wide">Cerita atau deskripsi<textarea name="description" placeholder="Tuliskan cerita singkat atau pesan untuk tamu..." rows={4} maxLength={5000} /></label>
              <label className="form-field invitation-form-wide">URL foto sampul<input name="coverImage" type="url" placeholder="https://..." /></label>
            </div>
            <button className="button button-dark" disabled={isSaving || isLoading || templates.length === 0} type="submit">
              {isSaving ? "Menyimpan..." : "Simpan draft undangan"} <span>↗</span>
            </button>
          </form>

          <section className="invitation-list" id="undangan-saya">
            <div className="builder-heading">
              <div><p className="eyebrow">LANGKAH 3</p><h2>Undangan saya</h2></div>
              <span>{invitations.length} UNDANGAN</span>
            </div>
            {invitations.length === 0 && !isLoading ? (
              <div className="dashboard-empty"><h2>Belum ada undangan</h2><p>Pilih template dan isi detail acara untuk membuat draft undangan pertama kalian.</p></div>
            ) : (
              <div className="user-invitation-list">
                {invitations.map((invitation) => {
                  const payment = payments[invitation.id];
                  return (
                    <article className="user-invitation-card" key={invitation.id}>
                      <div className="user-invitation-info">
                        <p className="eyebrow">{templates.find((item) => item.slug === invitation.templateId)?.name ?? "TEMPLATE PILIHAN"}</p>
                        <h3>{invitation.title}</h3>
                        <p>{invitation.brideName} &amp; {invitation.groomName} · {invitation.venue}</p>
                        <span className={`status-pill${invitation.status === "PUBLISHED" ? " status-pill-paid" : ""}`}>{invitation.status === "PUBLISHED" ? "AKTIF" : "DRAFT · MENUNGGU PEMBAYARAN"}</span>
                      </div>
                      {invitation.status === "DRAFT" && (
                        <div className="payment-action">
                          {!payment ? (
                              <button className="button button-dark" type="button" onClick={() => void startPayment(invitation.id)}>Lihat instruksi transfer <span>↗</span></button>
                          ) : (
                            <div className="payment-details">
                              <strong>
                                {payment.status === "PAID" ? "Pembayaran disetujui" :
                                  payment.status === "AWAITING_REVIEW" ? "Menunggu verifikasi admin" :
                                    payment.status === "REJECTED" ? "Bukti perlu dikirim ulang" :
                                      "Transfer bank"}
                              </strong>
                              <span>Total transfer: <strong>Rp{payment.amount.toLocaleString("id-ID")}</strong></span>
                              {payment.paymentCode !== null && (
                                <span>Kode unik user: <code>{String(payment.paymentCode).padStart(3, "0")}</code></span>
                              )}
                              {payment.paymentCode !== null && (
                                <small>Nominal sudah termasuk kode unik {String(payment.paymentCode).padStart(3, "0")} agar pembayaran mudah dikenali.</small>
                              )}
                              {transferAccounts[invitation.id] && (
                                <>
                                  <span>{transferAccounts[invitation.id].bankName} · {transferAccounts[invitation.id].accountName}</span>
                                  <code>{transferAccounts[invitation.id].accountNumber}</code>
                                </>
                              )}
                              {!transferAccounts[invitation.id] && payment.status !== "AWAITING_REVIEW" && (
                                <button className="text-link" type="button" onClick={() => void startPayment(invitation.id)}>Lihat rekening tujuan <span>↗</span></button>
                              )}
                              {(payment.status === "PENDING" || payment.status === "REJECTED") && (
                                <form className="proof-upload" onSubmit={(event) => void submitProof(event, payment.id, invitation.id)}>
                                  <label className="form-field">Bukti transfer (JPG, PNG, WebP, PDF; maks. 5 MB)
                                    <input name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
                                  </label>
                                  <button className="button button-dark" type="submit" disabled={uploadingPayment === payment.id}>
                                    {uploadingPayment === payment.id ? "Mengunggah..." : "Kirim bukti pembayaran"} <span>↗</span>
                                  </button>
                                </form>
                              )}
                              {payment.status === "AWAITING_REVIEW" && <small>Dikirim {payment.submittedAt ? new Date(payment.submittedAt).toLocaleString("id-ID") : ""}. Admin akan memverifikasi transfer.</small>}
                              {(payment.status === "FAILED" || payment.status === "EXPIRED") && (
                                <button className="button button-dark" type="button" onClick={() => void startPayment(invitation.id)}>Buat instruksi transfer baru <span>↗</span></button>
                              )}
                              <button className="text-link" type="button" onClick={() => void refreshPayment(invitation.id)}>Perbarui status</button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
