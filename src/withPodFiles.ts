import { ConfigPlugin, withDangerousMod } from 'expo/config-plugins';
import fs from 'fs';
import path from 'path';

import { NCE_TARGET_NAME, NSE_TARGET_NAME } from './constants';
import { CleverPushPluginProps } from './types/types';

const nsePodContent = `
target '${NSE_TARGET_NAME}' do
  pod 'CleverPush/CleverPushExtension'
end
`;

const ncePodContent = `
target '${NCE_TARGET_NAME}' do
  pod 'CleverPush'
end
`;

const hasTarget = (podfile: string, targetName: string): boolean =>
	new RegExp(`^\\s*target\\s+['"]${targetName}['"]`, 'm').test(podfile);

export const withPodFiles: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');

			try {
				// A prebuild without --clean keeps the Podfile of the previous run, so a target block is only
				// appended when the Podfile does not declare it yet; CocoaPods rejects a Podfile that declares
				// the same target twice.
				const podfile = await fs.promises.readFile(podfilePath, 'utf8');

				let additionalContent = '';
				if (!hasTarget(podfile, NSE_TARGET_NAME)) {
					additionalContent += nsePodContent;
				}
				if (props.includeContentExtension && !hasTarget(podfile, NCE_TARGET_NAME)) {
					additionalContent += ncePodContent;
				}

				if (additionalContent) {
					await fs.promises.appendFile(podfilePath, additionalContent);
				}
			} catch (error) {
				console.error(error);
			}

			return config;
		}
	]);
};
