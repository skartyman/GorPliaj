export default function PageContainer({ title, description, actions, children }) {
  return (
    <section className="page-container">
      <div className="page-container-head">
        <div>
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actions ? <div className="actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
