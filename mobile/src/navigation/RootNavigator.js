import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../auth/AuthContext';
import SignInScreen from '../screens/SignInScreen';
import BoardScreen from '../screens/BoardScreen';
import ListsScreen from '../screens/ListsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TaskFormScreen from '../screens/TaskFormScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Board: 'view-dashboard-outline',
  Lists: 'format-list-bulleted',
  Goals: 'target',
  Calendar: 'calendar-month-outline',
  Analytics: 'chart-bar'
};

const MainTabs = ({ navigation }) => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => (
        <MaterialCommunityIcons
          name={TAB_ICONS[route.name] || 'circle-outline'}
          color={color}
          size={size}
        />
      ),
      headerRight: () => (
        <IconButton
          icon="cog-outline"
          onPress={() => navigation.navigate('Settings')}
        />
      )
    })}
  >
    <Tab.Screen name="Board" component={BoardScreen} />
    <Tab.Screen name="Lists" component={ListsScreen} />
    <Tab.Screen name="Goals" component={GoalsScreen} />
    <Tab.Screen name="Calendar" component={ComingSoonScreen} />
    <Tab.Screen name="Analytics" component={ComingSoonScreen} />
  </Tab.Navigator>
);

const RootNavigator = () => {
  const { isAuthed, restoring } = useAuth();
  const paperTheme = useTheme();

  const navTheme = paperTheme.dark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: paperTheme.colors.primary,
          background: paperTheme.colors.background,
          card: paperTheme.colors.surface,
          text: paperTheme.colors.onSurface,
          border: paperTheme.colors.outline
        }
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: paperTheme.colors.primary,
          background: paperTheme.colors.background,
          card: paperTheme.colors.surface,
          text: paperTheme.colors.onSurface,
          border: paperTheme.colors.outline
        }
      };

  if (restoring) {
    return (
      <View style={[styles.centered, { backgroundColor: paperTheme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator>
        {isAuthed ? (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: 'Task' }}
            />
            <Stack.Screen
              name="TaskForm"
              component={TaskFormScreen}
              options={({ route }) => ({
                title: route.params?.mode === 'edit' ? 'Edit task' : 'New task'
              })}
            />
          </>
        ) : (
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default RootNavigator;
