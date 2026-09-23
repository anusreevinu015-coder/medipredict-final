import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <section className="hero">
        <h1>Medipredict</h1>
        <p className="lead">
          Your AI-assisted healthcare companion. Upload reports, understand your health, and get
          guidance &mdash; securely, from signup to recovery.
        </p>
        <div className="hero-actions">
          {user ? (
            <Link
              to={user.role === 'admin' ? '/admin' : '/patient'}
              className="btn btn-primary btn-lg"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary btn-lg">
                Get started
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Login
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h3>Medical report upload</h3>
          <p>PDF, JPG, JPEG and PNG reports with automatic text extraction.</p>
        </div>
        <div className="feature-card">
          <h3>AI health assessment</h3>
          <p>Understand your reports and review extracted information before it reaches a doctor.</p>
        </div>
        <div className="feature-card">
          <h3>Care & appointments</h3>
          <p>Hospital and doctor recommendations plus online appointment booking.</p>
        </div>
      </section>

      <p className="muted note">
        Phase one is the secure foundation: accounts, sessions and dashboards. Clinical features
        arrive in upcoming stages.
      </p>
    </div>
  );
}