import { TouchableOpacity } from "react-native";
import DashboardScreen from "../screens/DashboardScreen";
import BudgetsScreen from "../screens/BudgetsScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import ProfileScreen from "../screens/ProfileScreen";
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
  Profile: 'person',
};

// Categories and Budgets stay as screens, hidden from the tab bar,
// with a back arrow in the header that returns to Profile
const hiddenTab = ({ navigation }) => ({
  tabBarItemStyle: { display: 'none' },
  headerLeft: () => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name="chevron-back" size={26} color={colors.gold} />
    </TouchableOpacity>
  ),
});

export default function MainTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      backBehavior="history"
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
        headerStyle: {
          backgroundColor: colors.charcoal,
          borderBottomColor: colors.antique,
          borderBottomWidth: 1,
          shadowColor: colors.gold,
          elevation: 0,
        },
        headerTintColor: colors.gold,
        headerTitleStyle: { color: colors.gold, fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Dashboard">
        {({ navigation }) => <DashboardScreen user={user} navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={hiddenTab} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} options={hiddenTab} />
      <Tab.Screen name="Profile">
        {({ navigation }) => (
          <ProfileScreen user={user} onLogout={onLogout} navigation={navigation} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}