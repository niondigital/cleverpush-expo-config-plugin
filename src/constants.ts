export const NSE_TARGET_NAME = 'CleverPushNotificationServiceExtension';
export const NSE_SOURCE_FILE = 'NotificationService.swift';
export const NSE_FILES = [NSE_SOURCE_FILE, 'Info.plist'];

export const NCE_TARGET_NAME = 'CleverPushNotificationContentExtension';
// TODO Swift version is not working right now, check again in future
// export const NCE_SOURCE_FILE = 'NotificationViewController.swift';
export const NCE_SOURCE_FILE = 'NotificationViewController.m';
export const NCE_FILES = [NCE_SOURCE_FILE, 'NotificationViewController.h', 'Info.plist'];

export const APP_GROUP_SUFFIX = 'cleverpush';

// Fallback only: the extension targets normally inherit the deployment target of the app target.
// Expo SDK 56 raised the minimum iOS version to 16.4, so no supported app target is below this value.
export const IPHONEOS_DEPLOYMENT_TARGET = '16.4';
export const TARGETED_DEVICE_FAMILY = `"1,2"`;
