/**
 * PULSE Collector — Main App Entry
 * 
 * Navigation:
 *   Setup → Recording → History
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import SetupScreen from './screens/SetupScreen';
import RecordingScreen from './screens/RecordingScreen';
import HistoryScreen from './screens/HistoryScreen';
import { COLORS } from './utils/theme';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: COLORS.green,
            background: COLORS.bg0,
            card: COLORS.bg1,
            text: COLORS.textPrimary,
            border: COLORS.border,
            notification: COLORS.red,
          },
        }}
      >
        <StatusBar style="light" backgroundColor={COLORS.bg0} />
        <Stack.Navigator
          initialRouteName="Setup"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: COLORS.bg0 },
            animationEnabled: true,
          }}
        >
          <Stack.Screen name="Setup" component={SetupScreen} />
          <Stack.Screen
            name="Recording"
            component={RecordingScreen}
            options={{
              gestureEnabled: false, // Prevent accidental swipe-back during recording
            }}
          />
          <Stack.Screen name="History" component={HistoryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
