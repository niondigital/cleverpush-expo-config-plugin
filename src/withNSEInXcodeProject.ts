import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';
import {
	IPHONEOS_DEPLOYMENT_TARGET,
	NSE_FILES,
	NSE_SOURCE_FILE,
	NSE_TARGET_NAME,
	TARGETED_DEVICE_FAMILY
} from './constants';

import { CleverPushPluginProps } from './types/types';

/**
 * Adds the Notification Service Extension target to the Xcode project.
 *
 * Heavily based on https://github.com/OneSignal/onesignal-expo-plugin/blob/main/onesignal/withOneSignalIos.ts
 *
 * @param config
 * @param props
 */
export const withNSEInXcodeProject: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	return withXcodeProject(config, (newConfig) => {
		const xcodeProject = newConfig.modResults;

		if (xcodeProject.pbxTargetByName(NSE_TARGET_NAME)) {
			console.log(`${NSE_TARGET_NAME} already exists in project. Skipping...`);
			return newConfig;
		}

		// Create new PBXGroup for the extension
		const extGroup = xcodeProject.addPbxGroup(
			NSE_FILES,
			NSE_TARGET_NAME,
			NSE_TARGET_NAME
		);

		// Add the new PBXGroup to the top level group. This makes the
		// files / folder appear in the file explorer in Xcode.
		const groups = xcodeProject.hash.project.objects['PBXGroup'];
		Object.keys(groups).forEach(function (key) {
			if (typeof groups[key] === 'object' && groups[key].name === undefined && groups[key].path === undefined) {
				xcodeProject.addToPbxGroup(extGroup.uuid, key);
			}
		});

		// WORK AROUND for codeProject.addTarget BUG
		// Xcode projects don't contain these if there is only one target
		// An upstream fix should be made to the code referenced in this link:
		//   - https://github.com/apache/cordova-node-xcode/blob/8b98cabc5978359db88dc9ff2d4c015cba40f150/lib/pbxProject.js#L860
		const projObjects = xcodeProject.hash.project.objects;
		projObjects['PBXTargetDependency'] = projObjects['PBXTargetDependency'] || {};
		projObjects['PBXContainerItemProxy'] = projObjects['PBXTargetDependency'] || {};

		// Add the NSE target
		// This adds PBXTargetDependency and PBXContainerItemProxy for you
		const nseTarget = xcodeProject.addTarget(
			NSE_TARGET_NAME,
			'app_extension',
			NSE_TARGET_NAME,
			`${config.ios?.bundleIdentifier}.${NSE_TARGET_NAME}`
		);

		// Add build phases to the new target
		xcodeProject.addBuildPhase([NSE_SOURCE_FILE], 'PBXSourcesBuildPhase', 'Sources', nseTarget.uuid);
		xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', nseTarget.uuid);
		xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', nseTarget.uuid);

		// Edit the Deployment info of the new Target, only IphoneOS and Targeted Device Family
		// However, can be more
		const configurations = xcodeProject.pbxXCBuildConfigurationSection();
		for (const key in configurations) {
			if (
				typeof configurations[key].buildSettings !== 'undefined' &&
				configurations[key].buildSettings.PRODUCT_NAME == `"${NSE_TARGET_NAME}"`
			) {
				const buildSettingsObj = configurations[key].buildSettings;

				buildSettingsObj.IPHONEOS_DEPLOYMENT_TARGET = IPHONEOS_DEPLOYMENT_TARGET;
				buildSettingsObj.TARGETED_DEVICE_FAMILY = TARGETED_DEVICE_FAMILY;
				buildSettingsObj.INFOPLIST_FILE = `${NSE_TARGET_NAME}/Info.plist`;
				buildSettingsObj.SWIFT_VERSION = '5.0';
			}
		}

		return newConfig;
	});
};