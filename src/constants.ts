export const NSE_TARGET_NAME = 'CleverPushNotificationServiceExtension';
export const NSE_SOURCE_FILE = 'NotificationService.swift';
export const NSE_FILES = [NSE_SOURCE_FILE, 'Info.plist'];

export const NCE_TARGET_NAME = 'CleverPushNotificationContentExtension';
// TODO Swift version is not working right now, check again in future
// export const NCE_SOURCE_FILE = 'NotificationViewController.swift';
export const NCE_SOURCE_FILE = 'NotificationViewController.m';
export const NCE_FILES = [NCE_SOURCE_FILE, 'NotificationViewController.h', 'Info.plist'];

export const APP_GROUP_SUFFIX = 'cleverpush';

export const IPHONEOS_DEPLOYMENT_TARGET = '12.0';
export const TARGETED_DEVICE_FAMILY = `"1,2"`;
