import { AndroidConfig, ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

import {
	NOTIFICATION_CHANNEL_KEY_META_DATA,
	NOTIFICATION_CHANNELS_META_DATA,
	NOTIFICATION_SERVICE_EXTENSION_META_DATA
} from './constants';
import { CleverPushPluginProps } from './types/types';

/**
 * Registers the notification service extension and hands the channel mapping to it via <meta-data>.
 */
export const withExtensionAndroidManifest: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const extensionClassName = `${config.android?.package as string}.ExpoNotificationServiceExtension`;

	return withAndroidManifest(config, (config) => {
		const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

		// Unlike a plain "skip if present" guard, this also updates the value in place when the
		// entry already exists, e.g. after android.package changed and prebuild runs without --clean.
		AndroidConfig.Manifest.addMetaDataItemToMainApplication(
			application,
			NOTIFICATION_SERVICE_EXTENSION_META_DATA,
			extensionClassName
		);

		const channels = props?.androidNotificationChannels;
		if (channels) {
			AndroidConfig.Manifest.addMetaDataItemToMainApplication(
				application,
				NOTIFICATION_CHANNEL_KEY_META_DATA,
				channels.customDataKey
			);
			AndroidConfig.Manifest.addMetaDataItemToMainApplication(
				application,
				NOTIFICATION_CHANNELS_META_DATA,
				JSON.stringify(channels.channels)
			);
		} else {
			// A prebuild without --clean keeps the manifest of the previous run, so a removed option has
			// to remove its entries explicitly.
			AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(
				application,
				NOTIFICATION_CHANNEL_KEY_META_DATA
			);
			AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(application, NOTIFICATION_CHANNELS_META_DATA);
		}

		return config;
	});
};
