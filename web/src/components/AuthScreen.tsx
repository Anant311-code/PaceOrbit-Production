
import { useState, type FormEvent } from "react";
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthScreen() {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand">
          <div className="auth-brand-icon"><Activity size={23} /></div>
          <div>
            <strong>PaceOrbit</strong>
            <span>FIND YOUR RHYTHM</span>
          </div>
        </div>

        <div className="auth-visual-content">
          <span className="auth-eyebrow">YOUR JOURNEY STARTS HERE</span>
          <h1>Every move<br />has a <em>story.</em></h1>
          <p>
            Track your progress, discover new routes and build
            a healthier rhythm — one activity at a time.
          </p>

          <div className="auth-stats">
            <div><strong>01</strong><span>MOVE</span></div>
            <div><strong>02</strong><span>IMPROVE</span></div>
            <div><strong>03</strong><span>REPEAT</span></div>
          </div>
        </div>

        <div className="auth-visual-footer">
          PACEORBIT · EVERY STEP COUNTS
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <div className="auth-brand-icon"><Activity size={22} /></div>
            <strong>PaceOrbit</strong>
          </div>

          <span className="auth-eyebrow">
            {mode === "login" ? "WELCOME BACK" : "JOIN THE COMMUNITY"}
          </span>

          <h2>
            {mode === "login" ? "Good to see you." : "Create your account."}
          </h2>

          <p className="auth-subtitle">
            {mode === "login"
              ? "Sign in and pick up where your journey left off."
              : "Start tracking your movement and progress today."}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "register" && (
              <label className="auth-field">
                <span>Full name</span>
                <div className="auth-input-wrap">
                  <UserRound size={18} />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    minLength={2}
                    maxLength={40}
                    required
                  />
                </div>
              </label>
            )}

            <label className="auth-field">
              <span>Email address</span>
              <div className="auth-input-wrap">
                <Mail size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={254}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  minLength={8}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="auth-submit"
              disabled={submitting}
            >
              {submitting
                ? "Please wait..."
                : mode === "login" ? "Sign in" : "Create account"}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "login"
              ? "New to PaceOrbit?"
              : "Already have an account?"}
            <button type="button" onClick={switchMode}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </div>

          <div className="auth-terms">
            YOUR MOVEMENT. YOUR JOURNEY. YOUR PACE.
          </div>
        </div>
      </section>
    </main>
  );
}
