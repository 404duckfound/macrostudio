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
        <button type="button" className="navbar-btn" disabled title="Coming soon">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="5.5" x2="17" y2="5.5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="14.5" x2="17" y2="14.5" />
            </g>
            <g fill="var(--bg-base)" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="5.5" r="2.1" />
              <circle cx="13" cy="10" r="2.1" />
              <circle cx="7" cy="14.5" r="2.1" />
            </g>
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
}
