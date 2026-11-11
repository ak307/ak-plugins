/** Segmented tabs whose value lives in the URL (the caller passes value/onChange from useSearchParams). */
export function Tabs({ label, items, value, onChange }) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          className="ui-tab"
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span className="ui-tab__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
