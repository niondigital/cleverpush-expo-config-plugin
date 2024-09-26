import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';
import { NCE_TARGET_NAME, NSE_TARGET_NAME } from './constants';
import { CleverPushPluginProps } from './types/types';

const nsePodContent = `
target '${NSE_TARGET_NAME}' do
  pod 'CleverPush'
end`;

const ncePodContent = `
target '${NCE_TARGET_NAME}' do
  pod 'CleverPush'
end`;

export const withPodFiles: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const iosPath = path.join(config.modRequest.projectRoot, 'ios');

			try {
				const podfileContent = await fs.promises.readFile(`${iosPath}/Podfile`, 'utf8');

				let additionalContent = nsePodContent;
				if (props.includeContentExtension) {
					additionalContent += ncePodContent;
				}

				await fs.promises.appendFile(`${iosPath}/Podfile`, additionalContent);
			} catch (error) {
				console.error(error);
			}

			return config;
		}
	]);
};