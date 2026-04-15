import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { CreateMatchScreen } from '../screens/CreateMatchScreen';
import { RankingsScreen } from '../screens/RankingsScreen';
import { ClubsScreen } from '../screens/ClubsScreen';
import { VotingScreen } from '../screens/VotingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border, borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 6 },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Partidos', tabBarIcon: ({ focused }) => <TabIcon emoji="⚽" label="Partidos" focused={focused} /> }} />
      <Tab.Screen name="Rankings" component={RankingsScreen} options={{ title: 'Ranking', tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" label="Ranking" focused={focused} /> }} />
      <Tab.Screen name="Clubs" component={ClubsScreen} options={{ title: 'Clubes', tabBarIcon: ({ focused }) => <TabIcon emoji="🛡️" label="Clubes" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Perfil" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚽</Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2 }}>MATCHDAY</Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
            <Stack.Screen name="CreateMatch" component={CreateMatchScreen} />
            <Stack.Screen name="Voting" component={VotingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
