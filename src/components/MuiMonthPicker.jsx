import React from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

export default function MuiMonthPicker({ value, onChange, className = "" }) {
  const toDayjs = (ym) => {
    if (!ym) return dayjs();
    const [y, m] = ym.split("-").map((s) => parseInt(s, 10));
    return dayjs(new Date(y, m - 1, 1));
  };

  const fromDayjs = (d) => {
    if (!d) return null;
    return `${d.year()}-${String(d.month() + 1).padStart(2, "0")}`;
  };

  const [local, setLocal] = React.useState(toDayjs(value));

  React.useEffect(() => {
    setLocal(toDayjs(value));
  }, [value]);

  return (
    <DatePicker
      views={["year", "month"]}
      openTo="month"
      value={local}
      inputFormat="MMMM YYYY"
      disableMaskedInput={true}
      onChange={(newVal) => {
        setLocal(newVal);
      }}
      onAccept={(accepted) => {
        const ym = fromDayjs(accepted);
        onChange && onChange(ym);
      }}
      slotProps={{
        textField: {
          size: "small",
          fullWidth: true,
          className,
          inputProps: {
            readOnly: true,
          },
        },
      }}
    />
  );
}
