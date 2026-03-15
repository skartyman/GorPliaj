export default function PanelCard({ title, subtitle, children, actions, className = '' }) {
  return (
    <section className={`panel-card ${className}`.trim()}>
      {(title || actions || subtitle) ? (
        <header className="panel-card-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="actions compact">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
