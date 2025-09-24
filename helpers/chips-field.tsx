import { useCallback } from "react";
import { Option } from "@/types/option";
import { Stack, Chip } from "@mui/material";

export default function ChipsField({
  label,
  helper,
  options,
  values,
  onChange,
  disabled,
}: Readonly<{
  label: string;
  helper?: string;
  options: Option[];
  values: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}>) {
  const id = `chips-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const toggle = useCallback(
    (val: number) => {
      if (disabled) return;
      onChange(((prev: Iterable<unknown> | null | undefined) => {
        const set = new Set(prev);
        set.has(val) ? set.delete(val) : set.add(val);
        return Array.from(set);
      }) as unknown as number[]);
    },
    [disabled, onChange]
  );

  return (
    <div style={{ marginBottom: 16, opacity: disabled ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <label htmlFor={id} className="font-header font-semibold block mb-1.5">
          {label}
        </label>
        {values.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground underline bg-transparent border-none cursor-pointer"
            aria-label={`Clear ${label} selections`}
          >
            Clear
          </button>
        )}
      </div>
      {helper && <div style={{ color: "#666", marginBottom: 8 }}>{helper}</div>}

      <Stack
        id={id}
        role="listbox"
        aria-multiselectable="true"
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
      >
        {options.map((opt) => {
          const selected = values.includes(opt.id);
          return (
            <Chip
              key={opt.id}
              label={opt.name}
              onClick={() => toggle(opt.id)}
              clickable
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              sx={{ mb: 1 }}
              role="option"
              aria-selected={selected}
            />
          );
        })}
        {options.length === 0 && <span style={{ color: "#777" }}>No options available.</span>}
      </Stack>
    </div>
  );
}