"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid email or password.");
      }

      localStorage.setItem("vistrah_token", data.access_token);
      localStorage.setItem("vistrah_user", JSON.stringify(data.user));

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <button style={styles.logo} onClick={() => router.push("/")}>
          VISTRAH
        </button>

        <h1 style={styles.title}>Welcome back</h1>

        <p style={styles.subtitle}>
          Login to manage your requirements and track your VISTRAH
          applications.
        </p>

        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>Email</label>

          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={styles.input}
          />

          <label style={styles.label}>Password</label>

          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            style={styles.input}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button disabled={loading} type="submit" style={styles.primary}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={styles.footer}>
          New to VISTRAH?{" "}
          <button style={styles.link} onClick={() => router.push("/signup")}>
            Create an account
          </button>
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7faf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 18px",
  },
  card: {
    width: "100%",
    maxWidth: "470px",
    background: "#ffffff",
    border: "1px solid #e4e9e6",
    borderRadius: "18px",
    padding: "38px",
    boxShadow: "0 15px 45px rgba(7,59,39,.08)",
  },
  logo: {
    border: 0,
    background: "transparent",
    color: "#073b27",
    fontSize: "25px",
    fontWeight: 900,
    letterSpacing: ".14em",
    cursor: "pointer",
    padding: 0,
  },
  title: {
    margin: "28px 0 8px",
    color: "#16221c",
    fontSize: "32px",
    lineHeight: 1.1,
  },
  subtitle: {
    color: "#66736c",
    lineHeight: 1.5,
    marginBottom: "25px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },
  label: {
    color: "#26342d",
    fontSize: "14px",
    fontWeight: 700,
    marginTop: "7px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    height: "48px",
    border: "1px solid #dfe5e1",
    borderRadius: "10px",
    padding: "0 14px",
    fontSize: "15px",
    outline: "none",
  },
  primary: {
    marginTop: "14px",
    height: "50px",
    border: 0,
    borderRadius: "10px",
    background: "#073b27",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #ffd1d1",
    color: "#a32121",
    borderRadius: "9px",
    padding: "11px 12px",
    marginTop: "8px",
    fontSize: "14px",
  },
  footer: {
    textAlign: "center",
    color: "#68756e",
    fontSize: "14px",
    marginTop: "24px",
  },
  link: {
    border: 0,
    background: "transparent",
    color: "#073b27",
    fontWeight: 800,
    cursor: "pointer",
    padding: 0,
  },
};

