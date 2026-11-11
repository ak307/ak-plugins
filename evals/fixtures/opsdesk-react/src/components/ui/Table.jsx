import { Skeleton } from "./Skeleton.jsx";
import { EmptyState } from "./EmptyState.jsx";

/** Data table: rows are buttons-in-disguise (Enter/Space open them), skeleton rows while loading. */
export function Table({ columns, rows, loading, empty, selectedId, onRowClick, caption }) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        {caption && <caption className="ui-visually-hidden">{caption}</caption>}
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 6 }, (_, index) => (
            <tr key={`skeleton-${index}`}>
              {columns.map((column) => <td key={column.key}><Skeleton width="70%" /></td>)}
            </tr>
          ))}
          {!loading && rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={onRowClick ? 0 : undefined}
              aria-selected={row.id === selectedId || undefined}
              className={onRowClick ? "ui-table__row--clickable" : ""}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onRowClick(row); }
              } : undefined}
            >
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (empty || <EmptyState title="Nothing here yet" />)}
    </div>
  );
}
