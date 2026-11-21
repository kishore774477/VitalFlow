import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get notification permission');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

export const getPushToken = async (): Promise<string | null> => {
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return token.data || null;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
};

export const scheduleLocalNotification = async (alert: any) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body: alert.message,
        data: {
          alertId: alert.id,
          alertType: alert.type,
          severity: alert.severity,
        },
        badge: 1,
        sound: alert.severity === 'critical' || alert.severity === 'high' ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
      },
    });

    console.log(`Scheduled notification for alert: ${alert.id}`);
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
};

export const cancelNotification = async (notificationId: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
};

export const setNotificationBadge = async (count: number) => {
  try {
    if (Device.isDevice) {
      await Notifications.setBadgeCountAsync(count);
    }
  } catch (error) {
    console.error('Failed to set notification badge:', error);
  }
};

export const setupNotificationListeners = (onNotificationReceived: (notification: Notifications.Notification) => void) => {
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    onNotificationReceived(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { alertId } = response.notification.request.content.data || {};
    console.log(`Notification tapped: ${alertId}`);
    onNotificationReceived(response.notification);
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};

export const shouldTriggerNotification = (alert: any, notificationsEnabled: boolean): boolean => {
  if (!notificationsEnabled) return false;
  if (alert.read) return false;
  if (alert.severity === 'low') return false;
  return true;
};
