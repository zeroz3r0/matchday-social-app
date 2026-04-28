import React, { useRef } from 'react';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { navigationIntegration } from '../lib/sentry';
import { C } from '../utils/theme';

import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { CreateMatchScreen } from '../screens/CreateMatchScreen';
import { RankingsScreen } from '../screens/RankingsScreen';
import { ClubsScreen } from '../screens/ClubsScreen';
import { VotingScreen } from '../screens/VotingScreen';
import { CompetitionListScreen } from '../screens/CompetitionListScreen';
import { CompetitionDetailScreen } from '../screens/CompetitionDetailScreen';
import { CompetitionCreateScreen } from '../screens/CompetitionCreateScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export type CompetitionStackParamList = {
  CompetitionList: undefined;
  CompetitionDetail: { id: string };
  CompetitionCreate: undefined;
};

const CompStack = createNativeStackNavigator<CompetitionStackParamList>();

function CompetitionStack() {
  return (
    <CompStack.Navigator screenOptions={{ headerShown: false }}>
      <CompStack.Screen name="CompetitionList" component={CompetitionListScreen} />
      <CompStack.Screen name="CompetitionDetail" component={CompetitionDetailScreen} />
      <CompStack.Screen name="CompetitionCreate" component={CompetitionCreateScreen} />
    </CompStack.Navigator>
  );
}

const TAB_ICONS: Record<string, { active: any; inactive: any }> = {
  Home: { active: 'football', inactive: 'football-outline' },
  Rankings: { active: 'trophy', inactive: 'trophy-outline' },
  Competitions: { active: 'podium', inactive: 'podium-outline' },
  Clubs: { active: 'shield', inactive: 'shield-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.t3,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => {
          const icons = TAB_ICONS[route.name] || TAB_ICONS.Home;
          return (
            <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Partidos' }} />
      <Tab.Screen name="Rankings" component={RankingsScreen} options={{ title: 'Ranking' }} />
      <Tab.Screen
        name="Competitions"
        component={CompetitionStack}
        options={{ title: 'Competiciones' }}
      />
      <Tab.Screen name="Clubs" component={ClubsScreen} options={{ title: 'Clubes' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const navRef = useRef<NavigationContainerRef<Record<string, object | undefined>>>(null);

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}
      >
        <Ionicons name="football" size={44} color={C.primary} />
        <Text
          style={{ color: C.w, fontSize: 20, fontWeight: '800', letterSpacing: 4, marginTop: 16 }}
        >
          MATCHDAY
        </Text>
        <ActivityIndicator size="small" color={C.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => {
        navigationIntegration.registerNavigationContainer(navRef);
      }}
    >
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
