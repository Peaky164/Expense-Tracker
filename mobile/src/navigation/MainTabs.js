import DashboardScreen from "../screens/DashboardScreen";
import BudgetsScreen from "../screens/BudgetsScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CategoriesScreen from '../screens/CategoriesScreen';

const Tab = createBottomTabNavigator();



export default function MainTabs({ user, onLogout }) {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard">
  {() => <DashboardScreen user={user} onLogout={onLogout} />}
</Tab.Screen>
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
    </Tab.Navigator>
  );
}