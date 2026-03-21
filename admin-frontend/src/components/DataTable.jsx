import { useAdminI18n } from '../lib/i18n';

export default function DataTable({ columns, rows, emptyText }) {
  const { t } = useAdminI18n();

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
                  {column.render ? column.render(row) : row[column.key] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
