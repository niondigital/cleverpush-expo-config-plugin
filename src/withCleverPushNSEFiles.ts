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
			const nsePath = path.join(iosPath, NSE_TARGET_NAME);

			await fs.promises.mkdir(nsePath, { recursive: true });

			await Promise.all([NSE_FILES.map(async (file) => {
				const targetFile = `${nsePath}/${file}`;

				await fs.promises.copyFile(`${sourcePath}/${file}`, targetFile);

				// The version and build number in the Info.plist need to match the version of the main target
				if (targetFile === 'Info.plist') {
					let content = await fs.promises.readFile(`${nsePath}/Info.plist`, 'utf8');
					content = content.replace(/(<key>CFBundleShortVersionString<\/key>\s+<string>)(\d.+)(<\/string>)/gm, `$1${config?.version}$3`);
					content = content.replace(/(<key>CFBundleVersion<\/key>\s+<string>)(\d+)(<\/string>)/gm, `$1${config.ios?.buildNumber}$3`);
					await fs.promises.writeFile(`${nsePath}/Info.plist`, content);
				}
			})]);

			return config;
		}
	]);
};