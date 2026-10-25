"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AuthFormProps = {
  mode: "login" | "admin" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setHasError(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(
        isRegister
          ? "/api/auth/register"
          : mode === "admin"
            ? "/api/auth/admin/login"
            : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setHasError(true);
        setMessage(result.error ?? "Permintaan tidak dapat diproses.");
        return;
      }
      router.push(mode === "admin" ? "/admin" : "/dashboard");
    } catch {
      setHasError(true);
      setMessage("Tidak dapat terhubung ke server. Coba lagi sebentar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {isRegister && (
        <label className="form-field">
          Nama lengkap
          <input type="text" name="name" placeholder="Nama kalian" autoComplete="name" required />
        </label>
      )}
      {isRegister && (
        <label className="form-field">
          Username
          <input type="text" name="username" placeholder="Pilih username" autoComplete="username" required />
        </label>
      )}
      <label className="form-field">
        Email
        <input type="email" name="email" placeholder="nama@email.com" autoComplete="email" required />
      </label>
      <label className="form-field">
        Kata sandi
        <input
          type="password"
          name="password"
          placeholder={isRegister ? "Buat kata sandi" : "Masukkan kata sandi"}
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
        />
      </label>
      <button className="button button-dark" type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Memproses..."
          : isRegister
            ? "Buat akun"
            : mode === "admin"
              ? "Masuk sebagai admin"
              : "Masuk"}{" "}
        <span>↗</span>
      </button>
      {message && <p className={`form-message${hasError ? " form-message-error" : ""}`} role={hasError ? "alert" : "status"}>{message}</p>}
    </form>
  );
}
