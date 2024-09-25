import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';
import { NSE_FILES, NSE_TARGET_NAME } from './constants';
import { CleverPushPluginProps } from './types/types';

/**
 * Copies the Notification Service Extension files to the iOS project.
 *
 * @param config
 * @param props
 */
export const withCleverPushNSEFiles: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const sourcePath = path.join(__dirname, '../extensions/CleverPushNotificationServiceExtension');

	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const iosPath = path.join(config.modRequest.projectRoot, 'ios');

			await fs.promises.mkdir(`${iosPath}/${NSE_TARGET_NAME}`, { recursive: true });

			await Promise.all([NSE_FILES.map(async (file) => {
				const targetFile = `${iosPath}/${NSE_TARGET_NAME}/${file}`;

				await fs.promises.copyFile(`${sourcePath}/${file}`, targetFile);
			})]);

			return config;
		}
	]);
};