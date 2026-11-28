import { View, TouchableOpacity } from "react-native";
import DashboardScreen from "../screens/DashboardScreen";
import BudgetsScreen from "../screens/BudgetsScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AddTransactionScreen from "../screens/AddTransactionScreen";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CategoriesScreen from '../screens/CategoriesScreen';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: 'home',
  Transactions: 'swap-horizontal',
  Analytics: 'bar-chart',
  Profile: 'person',
};

// Categories and Budgets stay as screens, hidden from the tab bar,
// with a gold top bar and a back arrow that returns to Profile
const hiddenTab = ({ navigation }) => ({
  tabBarItemStyle: { display: 'none' },
  headerShown: true,
  headerStyle: {
    backgroundColor: colors.charcoal,
    borderBottomColor: colors.antique,
    borderBottomWidth: 1,
    elevation: 0,
  },
  headerTintColor: colors.gold,
  headerTitleStyle: { color: colors.gold, fontWeight: '700' },
  headerLeft: () => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name="chevron-back" size={26} color={colors.gold} />
    </TouchableOpacity>
  ),
});

// Full-screen pages: hidden from the bar, and the bar itself is hidden too
const fullScreenTab = {
  tabBarItemStyle: { display: 'none' },
  tabBarStyle: { display: 'none' },
};

// The gold "+" in the middle of the bar
function AddButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.gold,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.gold,
          shadowOpacity: 0.6,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={30} color="#000000" />
      </View>
    </TouchableOpacity>
  );
}

const Empty = () => null;

export default function MainTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
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
      <Tab.Screen name="Dashboard" options={{ tabBarLabel: 'Home' }}>
        {({ navigation }) => <DashboardScreen user={user} navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen
        name="Add"
        component={Empty}
        options={({ navigation }) => ({
          tabBarButton: () => (
            <AddButton
              onPress={() => {
                const s = navigation.getState();
                const current = s.routes[s.index]?.name;
                navigation.navigate('AddTransaction', {
                  from: current && current !== 'AddTransaction' ? current : 'Dashboard',
                  type: 'expense',
                });
              }}
            />
          ),
        })}
      />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile">
        {({ navigation }) => (
          <ProfileScreen user={user} onLogout={onLogout} navigation={navigation} />
        )}
      </Tab.Screen>
      <Tab.Screen name="Categories" component={CategoriesScreen} options={hiddenTab} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} options={hiddenTab} />
      <Tab.Screen name="AddTransaction" component={AddTransactionScreen} options={fullScreenTab} />
    </Tab.Navigator>
  );
}