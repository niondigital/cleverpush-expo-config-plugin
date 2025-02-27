import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { CleverPushPluginProps } from './types/types';
export const ANDROID_RES_PATH = 'android/app/src/main/res/';

const folders = ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi'];

async function writeNotificationIconImageFilesAsync(projectRoot: string) {
	await Promise.all(
		folders.map(async (folderName: string) => {
			const folderPath = resolve(projectRoot, ANDROID_RES_PATH, folderName);

			const sourceIconPath = resolve(folderPath,  'notification_icon.png');

			if (existsSync(sourceIconPath)) {
				copyFileSync(sourceIconPath, resolve(folderPath, 'cleverpush_notification_icon.png'))
			}
		})
	);
}

/**
 * Copies the notification icon which will be generated by the expo-notifications plugin
 * so it's compatible with the CleverPush.
 * @param config
 * @param props
 */
export const withAndroidNotificationIcon: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const icon: string | null = config.notification?.icon || null;

	return withDangerousMod(config, [
		'android',
		async (config) => {
			if (icon) {
				await writeNotificationIconImageFilesAsync(config.modRequest.projectRoot);
			}
			return config;
		},
	]);
};
