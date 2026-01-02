import React from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

export default function DatePickerField({
  value,
  onChange,
  required = false,
  textFieldClassName = "",
  placeholder,
  ...props
}) {
  const pickerValue = value === null ? null : typeof value === "string" ? (value ? dayjs(value) : dayjs()) : value || dayjs();

  const handleChange = (newVal) => {
    if (!onChange) return;
    onChange(newVal ? newVal.format("YYYY-MM-DD") : "");
  };

  return (
    <DatePicker
      value={pickerValue}
      onChange={handleChange}
      slotProps={{
        textField: {
          size: "small",
          fullWidth: true,
          required,
          inputProps: { readOnly: true },
          className: textFieldClassName,
          placeholder,
        },
      }}
      {...props}
    />
  );
}
