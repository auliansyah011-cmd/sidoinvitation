"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type AdminUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  isActive: boolean;
  disabledAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { invitations: number; payments: number };
  invitations: {
    id: string;
    title: string;
    status: "DRAFT" | "PUBLISHED";
    payments: { amount: number; paymentCode: number | null; paidAt: string | null }[];
  }[];
};

type Summary = {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalInvitations: number;
  paidPayments: number;
};

type Activity = {
  id: string;
  type: string;
  createdAt: string;
  user: { name: string; email: string } | null;
};

type PendingPayment = {
  id: string;
  orderId: string;
  amount: number;
  paymentCode: number | null;
  currency: string;
  bank: string;
  proofMimeType: string | null;
  submittedAt: string | null;
  user: { id: string; name: string; email: string };
  invitation: { id: string; title: string; brideName: string; groomName: string };
};

type InvitationTemplate = {
  id: string;
  slug: string;
  name: string;
  style: string;
  description: string | null;
  coverImage: string | null;
  color: string;
  isActive: boolean;
};

type TemplateDraft = Omit<InvitationTemplate, "id" | "slug"> & { id?: string };

type DashboardResult = {
  data: AdminUser[];
  summary: Summary;
  recentActivity: Activity[];
  pagination: { page: number; totalPages: number; total: number };
};

const emptyTemplate: TemplateDraft = {
  name: "",
  style: "",
  description: "",
  coverImage: "",
  color: "olive",
  isActive: true,
};

const activityNames: Record<string, string> = {
  REGISTER: "mendaftar",
  LOGIN: "login",
  ADMIN_LOGIN: "login",
  INVITATION_CREATED: "membuat undangan",
  PAYMENT_CREATED: "membuat instruksi transfer",
  PAYMENT_PROOF_SUBMITTED: "mengirim bukti transfer",
  PAYMENT_PAID: "menyelesaikan pembayaran",
  USER_DISABLED: "dinonaktifkan",
  USER_ENABLED: "diaktifkan kembali",
};

async function readDashboardResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: { error?: string };
  try {
    body = JSON.parse(text) as { error?: string };
  } catch {
    throw new Error(`Server mengembalikan respons tidak valid (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(body.error ?? `Permintaan gagal (HTTP ${response.status}).`);
  }
  return body as T;
}

export function AdminDashboard() {
  const router = useRouter();
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(emptyTemplate);
  const [busyTemplate, setBusyTemplate] = useState(false);
  const [page, setPage] = useState(1);
  const [busyUser, setBusyUser] = useState("");
  const [busyPayment, setBusyPayment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [usersResponse, paymentsResponse, templatesResponse] = await Promise.all([
        fetch(`/api/admin/users?page=${page}&limit=10`),
        fetch("/api/admin/payments?page=1&limit=50"),
        fetch("/api/admin/templates"),
      ]);
      const [usersBody, paymentsBody, templatesBody] = await Promise.all([
        readDashboardResponse<DashboardResult>(usersResponse),
        readDashboardResponse<{ data: PendingPayment[] }>(paymentsResponse),
        readDashboardResponse<{ data: InvitationTemplate[] }>(templatesResponse),
      ]);
      setResult(usersBody);
      setPendingPayments(paymentsBody.data);
      setTemplates(templatesBody.data);
      setError(false);
    } catch (loadError) {
      setError(true);
      setMessage(loadError instanceof Error ? loadError.message : "Gagal memuat data admin.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/users?page=${page}&limit=10`),
      fetch("/api/admin/payments?page=1&limit=50"),
      fetch("/api/admin/templates"),
    ])
      .then(async ([usersResponse, paymentsResponse, templatesResponse]) => {
        const [usersBody, paymentsBody, templatesBody] = await Promise.all([
          readDashboardResponse<DashboardResult>(usersResponse),
          readDashboardResponse<{ data: PendingPayment[] }>(paymentsResponse),
          readDashboardResponse<{ data: InvitationTemplate[] }>(templatesResponse),
        ]);
        if (!cancelled) {
          setResult(usersBody);
          setPendingPayments(paymentsBody.data);
          setTemplates(templatesBody.data);
          setError(false);
        }
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(true);
        setMessage(loadError instanceof Error ? loadError.message : "Gagal memuat data admin.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyTemplate(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch(
        templateDraft.id ? `/api/admin/templates/${templateDraft.id}` : "/api/admin/templates",
        {
          method: templateDraft.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateDraft.name,
            style: templateDraft.style,
            description: templateDraft.description || null,
            coverImage: templateDraft.coverImage || null,
            color: templateDraft.color,
            isActive: templateDraft.isActive,
          }),
        },
      );
      await readDashboardResponse<{ data: InvitationTemplate }>(response);
      setTemplateDraft(emptyTemplate);
      setMessage(templateDraft.id ? "Template berhasil diperbarui." : "Template baru berhasil ditambahkan.");
      await load();
    } catch (saveError) {
      setError(true);
      setMessage(saveError instanceof Error ? saveError.message : "Gagal menyimpan template.");
    } finally {
      setBusyTemplate(false);
    }
  }

  function editTemplate(template: InvitationTemplate) {
    setTemplateDraft({
      id: template.id,
      name: template.name,
      style: template.style,
      description: template.description ?? "",
      coverImage: template.coverImage ?? "",
      color: template.color,
      isActive: template.isActive,
    });
    document.getElementById("katalog-template")?.scrollIntoView({ behavior: "smooth" });
  }

  async function toggleUser(user: AdminUser) {
    const disabled = !user.disabledAt;
    const action = disabled ? "menonaktifkan" : "mengaktifkan kembali";
    if (!window.confirm(`Yakin ingin ${action} akun ${user.name}?`)) return;

    setBusyUser(user.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Gagal mengubah status akun.");
      setMessage(disabled ? "Akun user dinonaktifkan." : "Akun user diaktifkan kembali.");
      await load();
    } catch (toggleError) {
      setError(true);
      setMessage(toggleError instanceof Error ? toggleError.message : "Gagal mengubah status akun.");
    } finally {
      setBusyUser("");
    }
  }

  async function reviewPayment(payment: PendingPayment, decision: "approve" | "reject") {
    const action = decision === "approve" ? "menyetujui pembayaran" : "menolak bukti pembayaran";
    if (!window.confirm(`Yakin ingin ${action} untuk ${payment.user.name}?`)) return;
    setBusyPayment(payment.id);
    setMessage("");
    setError(false);
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Gagal meninjau pembayaran.");
      setMessage(body.message ?? "Status pembayaran diperbarui.");
      await load();
    } catch (reviewError) {
      setError(true);
      setMessage(reviewError instanceof Error ? reviewError.message : "Gagal meninjau pembayaran.");
    } finally {
      setBusyPayment("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (error && !result) {
    return (
      <main className="admin-denied">
        <span className="brand-mark">s.</span>
        <p className="eyebrow">DASHBOARD ADMIN</p>
        <h1>{message.toLowerCase().includes("admin") || message.includes("401") || message.includes("403")
          ? "Akses admin diperlukan."
          : "Dashboard gagal dimuat."}</h1>
        <p>{message}</p>
        <Link className="button button-dark" href="/admin/login">Masuk sebagai admin <span>↗</span></Link>
      </main>
    );
  }

  const summary = result?.summary;
  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">s.</span>
          <span>sido<span className="brand-light">invitation</span></span>
        </Link>
        <div className="dashboard-account"><span>Administrator</span><button className="dashboard-logout" onClick={logout} type="button">Keluar</button><span className="account-avatar">A</span></div>
      </header>
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <p className="dashboard-label">MENU ADMIN</p>
          <nav className="dashboard-nav" aria-label="Navigasi dashboard admin">
            <a className="active" href="#admin-ringkasan">◫ &nbsp; Ringkasan</a>
            <a href="#katalog-template">✳ &nbsp; Katalog template</a>
            <a href="#user-terdaftar">♙ &nbsp; User terdaftar</a>
            <a href="#verifikasi-pembayaran">Rp &nbsp; Verifikasi pembayaran</a>
            <a href="#aktivitas">◷ &nbsp; Aktivitas</a>
          </nav>
        </aside>
        <section className="dashboard-content">
          <p className="eyebrow">PANEL ADMINISTRATOR</p>
          <h1>Pantau aktivitas platform.</h1>
          <p className="dashboard-lead">Pantau pendaftaran, login, undangan, pembayaran, dan status akun user.</p>
          {message && <p className={`dashboard-message${error ? " form-message-error" : ""}`} role={error ? "alert" : "status"}>{message}</p>}

          <div className="admin-stats" id="admin-ringkasan">
            <article className="admin-stat"><span>Total user terdaftar</span><strong>{summary?.totalUsers ?? "—"}</strong></article>
            <article className="admin-stat"><span>Akun aktif setelah bayar</span><strong>{summary?.activeUsers ?? "—"}</strong></article>
            <article className="admin-stat"><span>Akun dinonaktifkan</span><strong>{summary?.disabledUsers ?? "—"}</strong></article>
            <article className="admin-stat"><span>Undangan dibuat</span><strong>{summary?.totalInvitations ?? "—"}</strong></article>
            <article className="admin-stat"><span>Pembayaran berhasil</span><strong>{summary?.paidPayments ?? "—"}</strong></article>
          </div>

          <section className="admin-panel" id="katalog-template">
            <div className="builder-heading">
              <div><p className="eyebrow">PILIHAN DESAIN USER</p><h2>Kelola template undangan</h2></div>
              <span>{templates.length} TEMPLATE</span>
            </div>
            <form className="invitation-form-grid" onSubmit={(event) => void saveTemplate(event)}>
              <label className="form-field">Nama template
                <input
                  maxLength={100}
                  minLength={2}
                  onChange={(event) => setTemplateDraft({ ...templateDraft, name: event.target.value })}
                  required
                  value={templateDraft.name}
                />
              </label>
              <label className="form-field">Gaya desain
                <input
                  maxLength={100}
                  minLength={2}
                  onChange={(event) => setTemplateDraft({ ...templateDraft, style: event.target.value })}
                  placeholder="Contoh: Klasik · Elegan"
                  required
                  value={templateDraft.style}
                />
              </label>
              <label className="form-field">Warna pratinjau
                <select
                  onChange={(event) => setTemplateDraft({ ...templateDraft, color: event.target.value })}
                  value={templateDraft.color}
                >
                  <option value="olive">Olive</option>
                  <option value="rose">Rose</option>
                  <option value="blue">Biru</option>
                  <option value="peach">Peach</option>
                  <option value="sand">Sand</option>
                  <option value="plum">Plum</option>
                </select>
              </label>
              <label className="form-field">URL gambar sampul (opsional)
                <input
                  maxLength={2048}
                  onChange={(event) => setTemplateDraft({ ...templateDraft, coverImage: event.target.value })}
                  placeholder="https://..."
                  type="url"
                  value={templateDraft.coverImage ?? ""}
                />
              </label>
              <label className="form-field invitation-form-wide">Deskripsi (opsional)
                <textarea
                  maxLength={1000}
                  onChange={(event) => setTemplateDraft({ ...templateDraft, description: event.target.value })}
                  rows={3}
                  value={templateDraft.description ?? ""}
                />
              </label>
              <label className="form-field invitation-form-wide">
                <span><input
                  checked={templateDraft.isActive}
                  onChange={(event) => setTemplateDraft({ ...templateDraft, isActive: event.target.checked })}
                  type="checkbox"
                /> Tampilkan template ini untuk user</span>
              </label>
              <div className="invitation-form-wide" style={{ display: "flex", gap: 12 }}>
                <button className="button button-dark" disabled={busyTemplate} type="submit">
                  {busyTemplate ? "Menyimpan..." : templateDraft.id ? "Simpan perubahan" : "Tambah template"}
                </button>
                {templateDraft.id && (
                  <button className="button button-outline" onClick={() => setTemplateDraft(emptyTemplate)} type="button">
                    Batal edit
                  </button>
                )}
              </div>
            </form>
            {templates.length > 0 && (
              <div className="admin-user-list">
                {templates.map((template) => (
                  <article className="admin-user-card" key={template.id}>
                    <span className={`dashboard-template-art template-${template.color}`}>A <i>&amp;</i> B</span>
                    <div>
                      <h3>{template.name}</h3>
                      <p>{template.style}{template.description ? ` · ${template.description}` : ""}</p>
                      <span className={`status-pill${template.isActive ? " status-pill-paid" : ""}`}>
                        {template.isActive ? "DITAMPILKAN KE USER" : "NONAKTIF"}
                      </span>
                    </div>
                    <button className="button button-outline" onClick={() => editTemplate(template)} type="button">Edit template</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-panel" id="user-terdaftar">
            <div className="builder-heading">
              <div><p className="eyebrow">AKUN & PEMBAYARAN</p><h2>User terdaftar</h2></div>
              <span>{result?.pagination.total ?? 0} USER</span>
            </div>
            {loading && <p className="dashboard-lead">Memuat data user...</p>}
            {!loading && result?.data.length === 0 && <p className="dashboard-lead">Belum ada user terdaftar.</p>}
            <div className="admin-user-list">
              {result?.data.map((user) => (
                <article className="admin-user-card" key={user.id}>
                  <div className="admin-user-main">
                    <span className="account-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                    <div><h3>{user.name}</h3><p>{user.email} · @{user.username}</p></div>
                  </div>
                  <div className="admin-user-metrics">
                    <span>Daftar <strong>{new Date(user.createdAt).toLocaleDateString("id-ID")}</strong></span>
                    <span>Login terakhir <strong>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("id-ID") : "Belum login"}</strong></span>
                    <span>Undangan <strong>{user._count.invitations}</strong></span>
                    <span>Pembayaran lunas <strong>{user._count.payments}</strong></span>
                    <span>Status <strong className={user.disabledAt ? "text-danger" : user.isActive ? "text-success" : ""}>{user.disabledAt ? "Dinonaktifkan admin" : user.isActive ? "Aktif" : "Menunggu pembayaran"}</strong></span>
                  </div>
                  {user.invitations.length > 0 && (
                    <div className="admin-user-invitations">
                      {user.invitations.map((invitation) => {
                        const paid = invitation.payments[0];
                        return (
                          <div key={invitation.id}>
                            <span>{invitation.title}</span>
                            <strong className={paid ? "text-success" : ""}>
                              {paid ? `LUNAS · Rp${paid.amount.toLocaleString("id-ID")}${paid.paymentCode !== null ? ` · KODE ${String(paid.paymentCode).padStart(3, "0")}` : ""}` : invitation.status === "PUBLISHED" ? "AKTIF" : "BELUM DIBAYAR"}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button
                    className={`button ${user.disabledAt ? "button-reactivate" : "button-disable"}`}
                    disabled={busyUser === user.id}
                    onClick={() => void toggleUser(user)}
                    type="button"
                  >
                    {busyUser === user.id ? "Menyimpan..." : user.disabledAt ? "Aktifkan user" : "Nonaktifkan user"}
                  </button>
                </article>
              ))}
            </div>
            {result && result.pagination.totalPages > 1 && (
              <div className="pagination-controls">
                <button className="button button-outline" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }} type="button">← Sebelumnya</button>
                <span>Halaman {page} dari {result.pagination.totalPages}</span>
                <button className="button button-outline" disabled={page >= result.pagination.totalPages || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }} type="button">Berikutnya →</button>
              </div>
            )}
          </section>

          <section className="admin-panel" id="verifikasi-pembayaran">
            <div className="builder-heading">
              <div><p className="eyebrow">TRANSFER MANUAL</p><h2>Verifikasi bukti pembayaran</h2></div>
              <span>{pendingPayments.length} MENUNGGU</span>
            </div>
            {pendingPayments.length === 0 ? (
              <p className="dashboard-lead">Belum ada bukti transfer yang menunggu verifikasi.</p>
            ) : (
              <div className="admin-payment-list">
                {pendingPayments.map((payment) => (
                  <article className="admin-payment-card" key={payment.id}>
                    <div>
                      <p className="eyebrow">{payment.bank} · Rp{payment.amount.toLocaleString("id-ID")}{payment.paymentCode !== null ? ` · KODE ${String(payment.paymentCode).padStart(3, "0")}` : ""}</p>
                      <h3>{payment.user.name}</h3>
                      <p>{payment.user.email} · {payment.invitation.title}</p>
                      <small>{payment.submittedAt ? new Date(payment.submittedAt).toLocaleString("id-ID") : "Waktu kirim tidak tersedia"}</small>
                    </div>
                    <div className="admin-payment-actions">
                      {payment.proofMimeType && (
                        <a className="button button-outline" href={`/api/admin/payments/${payment.id}/bukti`} target="_blank" rel="noreferrer">
                          Lihat bukti
                        </a>
                      )}
                      <button className="button button-reactivate" disabled={busyPayment === payment.id} onClick={() => void reviewPayment(payment, "approve")} type="button">
                        Setujui
                      </button>
                      <button className="button button-disable" disabled={busyPayment === payment.id} onClick={() => void reviewPayment(payment, "reject")} type="button">
                        Tolak bukti
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-panel" id="aktivitas">
            <div className="builder-heading">
              <div><p className="eyebrow">MONITORING</p><h2>Aktivitas terbaru</h2></div>
              <span>12 TERBARU</span>
            </div>
            <div className="admin-activity-list">
              {result?.recentActivity.map((activity) => (
                <article className="admin-activity-row" key={activity.id}>
                  <span className="activity-dot" />
                  <p><strong>{activity.user?.name ?? "User"}</strong> {activityNames[activity.type] ?? activity.type.toLowerCase()}</p>
                  <time>{new Date(activity.createdAt).toLocaleString("id-ID")}</time>
                </article>
              ))}
              {!loading && !result?.recentActivity.length && <p className="dashboard-lead">Belum ada aktivitas.</p>}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
