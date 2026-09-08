import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="not-found">
    <div className="not-found-card">
      <h1>404</h1>
      <h2>Page not found</h2>
      <p>The page you requested does not exist.</p>
      <Link to="/login" className="primary-btn">Back to login</Link>
    </div>
  </div>
);

export default NotFound;
