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

/**
 * Appends the target block when it is wanted and missing, and removes the block this plugin wrote when it is
 * no longer wanted. A block that was edited by hand is left alone, the plugin only removes what it wrote itself.
 */
const syncTarget = (podfile: string, targetName: string, content: string, wanted: boolean): string => {
	if (wanted) {
		return hasTarget(podfile, targetName) ? podfile : podfile + content;
	}
	return podfile.replace(content, '');
};

export const withPodFiles: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');

			try {
				// A prebuild without --clean keeps the Podfile of the previous run, so the target blocks are
				// reconciled against the current content: CocoaPods rejects a Podfile that declares the same
				// target twice, and a block whose Xcode target no longer exists aborts pod install.
				const podfile = await fs.promises.readFile(podfilePath, 'utf8');

				let result = syncTarget(podfile, NSE_TARGET_NAME, nsePodContent, true);
				result = syncTarget(result, NCE_TARGET_NAME, ncePodContent, props.includeContentExtension === true);

				if (result !== podfile) {
					await fs.promises.writeFile(podfilePath, result);
				}
			} catch (error) {
				console.error(error);
			}

			return config;
		}
	]);
};
