import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';
import { NSE_TARGET_NAME } from './constants';
import { CleverPushPluginProps } from './types/types';

const additionalContent = `
target '${NSE_TARGET_NAME}' do
  pod 'CleverPush'
end`;
/*
target 'CleverPushNotificationContentExtension' do
  pod 'CleverPush'
end`;*/

export const withPodFiles: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const iosPath = path.join(config.modRequest.projectRoot, 'ios');

			try {
				const podfileContent = await fs.promises.readFile(`${iosPath}/Podfile`, 'utf8');

				if (podfileContent.match(NSE_TARGET_NAME)) {
					console.log(`${NSE_TARGET_NAME} target already added to Podfile. Skipping...`);
				} else {
					await fs.promises.appendFile(`${iosPath}/Podfile`, additionalContent);
				}
			} catch (error) {
				console.error(error);
			}

			return config;
		}
	]);
};