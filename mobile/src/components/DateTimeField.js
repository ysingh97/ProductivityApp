import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Button, HelperText, Text } from 'react-native-paper';

// Cross-platform date + time picker built on the community picker. On Android
// the native dialog is shown imperatively (date first, then time); on iOS the
// inline spinner is toggled. Value/onChange use dayjs instances (or null).
const DateTimeField = ({ label, value, onChange, minimumDate, helperText }) => {
  const [mode, setMode] = useState(null); // 'date' | 'time' | null (Android)
  const [showInline, setShowInline] = useState(false); // iOS

  const openPicker = () => {
    if (Platform.OS === 'android') {
      setMode('date');
    } else {
      setShowInline(true);
    }
  };

  const handleAndroidChange = (event, selectedDate) => {
    if (event.type === 'dismissed' || !selectedDate) {
      setMode(null);
      return;
    }
    if (mode === 'date') {
      const base = value ? value : dayjs();
      const merged = dayjs(selectedDate)
        .hour(base.hour())
        .minute(base.minute())
        .second(0)
        .millisecond(0);
      onChange(merged);
      setMode('time');
    } else {
      const merged = (value || dayjs(selectedDate))
        .hour(dayjs(selectedDate).hour())
        .minute(dayjs(selectedDate).minute())
        .second(0)
        .millisecond(0);
      onChange(merged);
      setMode(null);
    }
  };

  const handleIosChange = (event, selectedDate) => {
    if (selectedDate) {
      onChange(dayjs(selectedDate).second(0).millisecond(0));
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <View style={styles.row}>
        <Button
          mode="outlined"
          icon="calendar"
          onPress={openPicker}
          style={styles.pickButton}
          accessibilityLabel={`${label} picker`}
        >
          {value ? value.format('MMM D, YYYY h:mm A') : 'Set date & time'}
        </Button>
        {Boolean(value) && (
          <Button mode="text" onPress={() => onChange(null)} accessibilityLabel="Clear date">
            Clear
          </Button>
        )}
      </View>
      {Boolean(helperText) && (
        <HelperText type="info" visible>
          {helperText}
        </HelperText>
      )}

      {Platform.OS === 'android' && mode && (
        <DateTimePicker
          value={(value || dayjs()).toDate()}
          mode={mode}
          is24Hour={false}
          minimumDate={mode === 'date' && minimumDate ? minimumDate.toDate() : undefined}
          onChange={handleAndroidChange}
        />
      )}
      {Platform.OS === 'ios' && showInline && (
        <DateTimePicker
          value={(value || dayjs()).toDate()}
          mode="datetime"
          display="spinner"
          minimumDate={minimumDate ? minimumDate.toDate() : undefined}
          onChange={handleIosChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4
  },
  label: {
    marginBottom: 6,
    opacity: 0.8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pickButton: {
    flex: 1
  }
});

export default DateTimeField;
