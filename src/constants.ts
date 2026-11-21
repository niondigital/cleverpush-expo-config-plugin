export const NSE_TARGET_NAME = 'CleverPushNotificationServiceExtension';
export const NSE_SOURCE_FILE = 'NotificationService.swift';
export const NSE_FILES = [NSE_SOURCE_FILE, 'Info.plist'];

export const NCE_TARGET_NAME = 'CleverPushNotificationContentExtension';
// TODO Swift version is not working right now, check again in future
// export const NCE_SOURCE_FILE = 'NotificationViewController.swift';
export const NCE_SOURCE_FILE = 'NotificationViewController.m';
export const NCE_FILES = [NCE_SOURCE_FILE, 'NotificationViewController.h', 'Info.plist'];

export const APP_GROUP_SUFFIX = 'cleverpush';

// Read by the CleverPush SDK to find the notification service extension.
export const NOTIFICATION_SERVICE_EXTENSION_META_DATA = 'com.cleverpush.NotificationServiceExtension';
// Read by ExpoNotificationServiceExtension.java; keep both names in sync with it.
export const NOTIFICATION_CHANNEL_KEY_META_DATA = 'com.niondigital.cleverpush.notification_channel_key';
export const NOTIFICATION_CHANNELS_META_DATA = 'com.niondigital.cleverpush.notification_channels';

export const TARGETED_DEVICE_FAMILY = `"1,2"`;
