import DashboardScreen from "../screens/DashboardScreen";
import BudgetsScreen from "../screens/BudgetsScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CategoriesScreen from '../screens/CategoriesScreen';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: 'home',
  Transactions: 'swap-horizontal',
  Categories: 'pricetags',
  Budgets: 'pie-chart',
};



export default function MainTabs({ user, onLogout }) {
  return (
        <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONS[route.name]} size={size} color={color} />
          ),
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.charcoal,
            borderTopColor: colors.antique,
          },
        })}
      >
      <Tab.Screen name="Dashboard">
  {() => <DashboardScreen user={user} onLogout={onLogout} />}
</Tab.Screen>
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
    </Tab.Navigator>
  );
}