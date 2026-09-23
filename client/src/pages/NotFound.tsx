import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="center-screen v-stack">
      <h1>404</h1>
      <p className="muted">That page does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Back home
      </Link>
    </div>
  );
}