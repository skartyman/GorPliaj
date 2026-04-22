import { localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

export default function PageContainer({ title, description, actions, children }) {
  const { language } = useAdminI18n();
  return (
    <section className="page-container">
      <div className="page-container-head">
        <div>
          <h2>{typeof title === 'object' ? localizeField(title, language) : title}</h2>
          {description ? <p className="muted">{typeof description === 'object' ? localizeField(description, language) : description}</p> : null}
        </div>
        {actions ? <div className="actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
