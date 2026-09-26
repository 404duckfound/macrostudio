export default function Navbar() {
  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-items">
        <button type="button" className="navbar-btn active" aria-current="page" title="Profiles">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 2.5 17.5 6.5 10 10.5 2.5 6.5Z M2.5 10.5l7.5 4 7.5-4 M2.5 14l7.5 4 7.5-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <span>Profiles</span>
        </button>
      </div>
    </nav>
  );
}
