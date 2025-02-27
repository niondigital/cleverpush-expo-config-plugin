import { CleverPushPluginProps } from './types/types';

import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

/**
 * Expo Config Plugin to add a <meta-data> tag in AndroidManifest.xml
 */
export const withExtensionAndroidManifest: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const metaDataName = 'com.cleverpush.NotificationServiceExtension';
	const metaDataValue = `${config.android?.package as string}.ExpoNotificationServiceExtension`;


	return withAndroidManifest(config, (config) => {
		const androidManifest = config.modResults.manifest;

		if (!androidManifest?.application) {
			throw new Error('No manifest found');
		}

		const application = androidManifest.application[0];
		application['meta-data'] = application['meta-data'] || [];

		if (!application['meta-data'].some(item => item.$['android:name'] === metaDataName)) {
			application['meta-data'].push({
				$: {
					'android:name': metaDataName,
					'android:value': metaDataValue,
				},
			});
		}

		return config;
	});
};
