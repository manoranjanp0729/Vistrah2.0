"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    let signupSucceeded = false;

    try {
      const response = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to create account.");
      }
      signupSucceeded = true;

      const loginResponse = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });
      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(
          loginData.detail || "Automatic sign-in failed. Please log in."
        );
      }
      if (
        typeof loginData.access_token !== "string" ||
        !loginData.access_token ||
        !loginData.user
      ) {
        throw new Error("Automatic sign-in did not return a valid session. Please log in.");
      }

      localStorage.setItem("vistrah_user", JSON.stringify(loginData.user));
      localStorage.setItem("vistrah_token", loginData.access_token);
      router.push("/");
    } catch (err: unknown) {
      if (signupSucceeded) {
        setAccountCreated(true);
        setError("Your account was created, but automatic sign-in failed. Please log in.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
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

        <h1 style={styles.title}>Create your account</h1>

        <p style={styles.subtitle}>
          Create your VISTRAH account to submit requirements and track your
          applications.
        </p>

        {accountCreated ? (
          <>
            <div style={styles.error} role="alert">{error}</div>
            <button
              type="button"
              style={styles.primary}
              onClick={() => router.push("/login")}
            >
              Go to Login
            </button>
          </>
        ) : (
        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>Full name</label>
          <input
            required
            value={form.full_name}
            onChange={(e) =>
              setForm({ ...form, full_name: e.target.value })
            }
            placeholder="Your full name"
            style={styles.input}
          />

          <label style={styles.label}>Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            placeholder="you@example.com"
            style={styles.input}
          />

          <label style={styles.label}>Phone</label>
          <input
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
            placeholder="9876543210"
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            placeholder="Minimum 8 characters"
            style={styles.input}
          />

          <label style={styles.label}>Confirm password</label>
          <input
            required
            type="password"
            minLength={8}
            value={form.confirm_password}
            onChange={(e) =>
              setForm({ ...form, confirm_password: e.target.value })
            }
            placeholder="Enter password again"
            style={styles.input}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button disabled={loading} type="submit" style={styles.primary}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        )}

        <p style={styles.footer}>
          Already have an account?{" "}
          <button style={styles.link} onClick={() => router.push("/login")}>
            Login
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
