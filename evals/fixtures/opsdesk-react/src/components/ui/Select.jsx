export function Select({ options, ...props }) {
  return (
    <select className="ui-input ui-select" {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
