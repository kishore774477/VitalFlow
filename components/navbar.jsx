import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function Navbar({ activeTab = 'Home' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState(null);

  // Get current user and listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch unread count from Supabase
  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false);

        if (error) throw error;
        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('alerts_unread_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Determine current tab from pathname or activeTab prop
  const currentTab = pathname?.replace('/', '') || activeTab.toLowerCase();

  const handleNavigation = (route) => {
    if (pathname === route) return;
    router.replace(route);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity
          style={[styles.navItem, (currentTab === 'home' || activeTab === 'Home') && styles.activeNavItem]}
          onPress={() => handleNavigation('/home', 'Home')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="home-variant" 
            style={[styles.navIcon, (currentTab === 'home' || activeTab === 'Home') && styles.activeNavIcon]} 
          />
          <Text style={[styles.navText, (currentTab === 'home' || activeTab === 'Home') && styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navItem, (currentTab === 'analytics' || activeTab === 'Analytics') && styles.activeNavItem]}
          onPress={() => handleNavigation('/analytics', 'Analytics')}
          activeOpacity={0.7}
        >
          <FontAwesome5 
            name="chart-line" 
            style={[styles.navIcon, (currentTab === 'analytics' || activeTab === 'Analytics') && styles.activeNavIcon]} 
          />
          <Text style={[styles.navText, (currentTab === 'analytics' || activeTab === 'Analytics') && styles.activeNavText]}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navItem, (currentTab === 'health' || activeTab === 'Health') && styles.activeNavItem]}
          onPress={() => handleNavigation('/health', 'Health')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="heart-pulse" 
            style={[styles.navIcon, (currentTab === 'health' || activeTab === 'Health') && styles.activeNavIcon]} 
          />
          <Text style={[styles.navText, (currentTab === 'health' || activeTab === 'Health') && styles.activeNavText]}>Health</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navItem, (currentTab === 'alerts' || activeTab === 'Alerts') && styles.activeNavItem]}
          onPress={() => handleNavigation('/alerts', 'Alerts')}
          activeOpacity={0.7}
        >
          <View>
            <Ionicons 
              name="notifications" 
              style={[styles.navIcon, (currentTab === 'alerts' || activeTab === 'Alerts') && styles.activeNavIcon]} 
            />
            {unreadCount > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.navText, (currentTab === 'alerts' || activeTab === 'Alerts') && styles.activeNavText]}>Alerts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navItem, (currentTab === 'profile' || activeTab === 'Profile') && styles.activeNavItem]}
          onPress={() => handleNavigation('/profile', 'Profile')}
          activeOpacity={0.7}
        >
          <Feather 
            name="user" 
            style={[styles.navIcon, (currentTab === 'profile' || activeTab === 'Profile') && styles.activeNavIcon]} 
          />
          <Text style={[styles.navText, (currentTab === 'profile' || activeTab === 'Profile') && styles.activeNavText]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a252f',
    paddingBottom: Platform.OS === 'ios' ? 30 : 25,
    paddingTop: 15,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 1000,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 60,
    minHeight: 60,
  },
  activeNavItem: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 6,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeNavIcon: {
    color: '#3498db',
  },
  navText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeNavText: {
    color: '#3498db',
    fontWeight: '600',
  },
  alertBadge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a252f',
  },
  alertBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});