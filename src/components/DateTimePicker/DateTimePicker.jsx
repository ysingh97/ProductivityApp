import * as React from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import TextField from '@mui/material/TextField';

export default function MyDateTimePicker({ value, onChange }) {
  return (
    <LocalizationProvider adapterLocale="en" dateAdapter={AdapterDayjs}>
      <DateTimePicker
        label="Target Completion Date"
        value={value}
        onChange={onChange}
        renderInput={(params) => <TextField {...params} />}
      />
    </LocalizationProvider>
  );
}