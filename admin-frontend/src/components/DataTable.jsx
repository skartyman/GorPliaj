import { useAdminI18n } from '../lib/i18n';
import { localizeField } from '../lib/api';

export default function DataTable({ columns, rows, emptyText }) {
  const { t, language } = useAdminI18n();

  if (!rows.length) {
    return <p className="muted">{emptyText || t('common.loading')}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => (
                <td key={`${row.id || index}-${column.key}`}>
                  {column.render ? column.render(row) : localizeField(row[column.key], language) || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
