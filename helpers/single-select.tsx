import { Option } from "@/types/option";

export default function SingleSelect({
  label,
  helper,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}: Readonly<{
  label: string;
  helper?: string;
  options: Option[];
  value: number | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}>) {
  const id = `sel-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const helperId = helper ? `${id}-help` : undefined;

  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
        {label}
      </label>
      {helper && (
        <div id={helperId} style={{ color: "#666", marginBottom: 8 }}>
          {helper}
        </div>
      )}
      <select
        id={id}
        aria-describedby={helperId}
        value={value == null ? "" : String(value)}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 8,
          border: "1px solid #e5e5e5",
          padding: "0 8px",
          background: disabled ? "#f5f5f5" : "white",
          color: disabled ? "#666" : "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <option value="" disabled>
          {placeholder ?? "Select…"}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={String(opt.id)}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}