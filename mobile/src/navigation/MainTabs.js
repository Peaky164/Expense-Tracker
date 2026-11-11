import BudgetsScreen from "../screens/BudgetsScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CategoriesScreen from '../screens/CategoriesScreen';

const Tab = createBottomTabNavigator();

const Placeholder = ({ title }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 18 }}>{title} screen (coming next)</Text>
  </View>
);

export default function MainTabs({ user, onLogout }) {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard">
        {() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, marginBottom: 16 }}>Welcome, {user.name}</Text>
            <TouchableOpacity onPress={onLogout}>
              <Text style={{ color: '#4f46e5', fontSize: 16 }}>Log out</Text>
            </TouchableOpacity>
          </View>
        )}
      </Tab.Screen>
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
    </Tab.Navigator>
  );
}