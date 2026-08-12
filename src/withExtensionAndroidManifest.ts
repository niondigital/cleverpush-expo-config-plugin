import { ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

import { CleverPushPluginProps } from './types/types';

/**
 * Expo Config Plugin to add a <meta-data> tag in AndroidManifest.xml
 */
export const withExtensionAndroidManifest: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const metaDataName = 'com.cleverpush.NotificationServiceExtension';
	const metaDataValue = `${config.android?.package as string}.ExpoNotificationServiceExtension`;

	return withAndroidManifest(config, (config) => {
		const application = config.modResults.manifest?.application?.[0];

		if (!application) {
			throw new Error('No <application> element found in AndroidManifest.xml');
		}

		application['meta-data'] = application['meta-data'] || [];

		if (!application['meta-data'].some((item) => item.$['android:name'] === metaDataName)) {
			application['meta-data'].push({
				$: {
					'android:name': metaDataName,
					'android:value': metaDataValue
				}
			});
		}

		return config;
	});
};
