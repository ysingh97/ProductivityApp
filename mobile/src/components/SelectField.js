import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Menu, Text } from 'react-native-paper';

// Lightweight single-select built on Paper's Menu. options: [{ value, label }].
// A null value renders the placeholder; a "None" entry clears the selection.
const SelectField = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  helperText,
  allowClear = true,
  disabled = false
}) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            icon="menu-down"
            contentStyle={styles.anchorContent}
            disabled={disabled}
            onPress={() => setVisible(true)}
            accessibilityLabel={`${label} selector`}
          >
            {selected ? selected.label : placeholder}
          </Button>
        }
      >
        {allowClear && (
          <Menu.Item
            title="None"
            onPress={() => {
              onChange(null);
              setVisible(false);
            }}
          />
        )}
        {options.map((option) => (
          <Menu.Item
            key={String(option.value)}
            title={option.label}
            onPress={() => {
              onChange(option.value);
              setVisible(false);
            }}
          />
        ))}
      </Menu>
      {Boolean(helperText) && (
        <HelperText type="info" visible>
          {helperText}
        </HelperText>
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
  anchorContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between'
  }
});

export default SelectField;
