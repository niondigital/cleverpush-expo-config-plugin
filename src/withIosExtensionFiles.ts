import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

/**
 * Copies the given extension files to the iOS project.
 * Also updates the version and build number in the Info.plist to match the main target.
 *
 * @param config
 * @param props
 */
export const withIosExtensionFiles: ConfigPlugin<{ extensionName: string; files: string[] }> = (config, props) => {
	const sourcePath = path.join(__dirname, `../extensions/ios/${props.extensionName}`);

	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const iosPath = path.join(config.modRequest.projectRoot, 'ios');
			const targetExtensionPath = path.join(iosPath, props.extensionName);

			await fs.promises.mkdir(targetExtensionPath, { recursive: true });

			await Promise.all([
				props.files.map(async (file) => {
					await fs.promises.copyFile(`${sourcePath}/${file}`, `${targetExtensionPath}/${file}`);

					// The version and build number in the Info.plist need to match the version of the main target

					// PLease note: Right now this plugin uses MARKETING_VERSION and CURRENT_PROJECT_VERSION to set the version and build number in the Info.plist
					// We still keep this replacing logic to archive a more generic function for the future
					if (file === 'Info.plist') {
						let content = await fs.promises.readFile(`${targetExtensionPath}/${file}`, 'utf8');
						content = content.replace(
							/(<key>CFBundleShortVersionString<\/key>\s+<string>)(\d.+)(<\/string>)/gm,
							`$1${config.version}$3`
						);
						content = content.replace(
							/(<key>CFBundleVersion<\/key>\s+<string>)(\d+)(<\/string>)/gm,
							`$1${config.ios?.buildNumber ?? 1}$3`
						);
						await fs.promises.writeFile(`${targetExtensionPath}/${file}`, content);
					}
				})
			]);

			return config;
		}
	]);
};
