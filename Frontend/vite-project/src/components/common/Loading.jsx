const Loading = ({ text = 'Loading...' }) => (
  <div className="loading-shell">
    <div className="spinner" />
    <p>{text}</p>
  </div>
);

export default Loading;
