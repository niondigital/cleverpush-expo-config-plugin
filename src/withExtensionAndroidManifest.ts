import { AndroidConfig, ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

import { CleverPushPluginProps } from './types/types';

/**
 * Expo Config Plugin to add a <meta-data> tag in AndroidManifest.xml
 */
export const withExtensionAndroidManifest: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const metaDataName = 'com.cleverpush.NotificationServiceExtension';
	const metaDataValue = `${config.android?.package as string}.ExpoNotificationServiceExtension`;

	return withAndroidManifest(config, (config) => {
		const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

		// Unlike a plain "skip if present" guard, this also updates the value in place when the
		// entry already exists, e.g. after android.package changed and prebuild runs without --clean.
		AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, metaDataName, metaDataValue);

		return config;
	});
};
