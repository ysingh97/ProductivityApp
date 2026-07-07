import * as React from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import TextField from '@mui/material/TextField';

const normalizeToMinute = (value) => {
  if (!value || typeof value.second !== 'function' || typeof value.millisecond !== 'function') {
    return value;
  }

  return value.second(0).millisecond(0);
};

export default function MyDateTimePicker({
  label = "Target Completion Date",
  value,
  onChange,
  textFieldProps,
  ...pickerProps
}) {
  return (
    <LocalizationProvider adapterLocale="en" dateAdapter={AdapterDayjs}>
      <DateTimePicker
        label={label}
        value={value}
        onChange={(nextValue) => onChange(normalizeToMinute(nextValue))}
        {...pickerProps}
        renderInput={(params) => (
          <TextField
            {...params}
            {...textFieldProps}
            inputProps={{
              ...params.inputProps,
              ...(textFieldProps?.inputProps || {})
            }}
            InputProps={{
              ...params.InputProps,
              ...(textFieldProps?.InputProps || {})
            }}
          />
        )}
      />
    </LocalizationProvider>
  );
}
