// TODO temp solution until https://github.com/expo/expo/issues/24844#issuecomment-2011235153 is fixed

import {
	ConfigPlugin,
	withEntitlementsPlist,
	withInfoPlist,
	withXcodeProject,
	withDangerousMod
} from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

import { CleverPushPluginProps } from './types/types';

// TODO check https://github.com/OneSignal/onesignal-expo-plugin/blob/main/onesignal/withOneSignalIos.ts
// TODO see withRemoteNotificationsPermissions

// TODO also add Notification Content Extension and app group

const withCleverPush: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	config = withAppGroup(config, props);
	config = withCleverPushNSEFiles(config, props);
	config = withNSEInXcodeProject(config, props);
	config = withPodFiles(config, props);
	config = withEASExtraConfig(config, props);

	return config;
};

export default withCleverPush;

const IPHONEOS_DEPLOYMENT_TARGET = '13.4';
const TARGETED_DEVICE_FAMILY = `"1,2"`;

const GROUP_IDENTIFIER_TEMPLATE_REGEX = /{{GROUP_IDENTIFIER}}/gm;
const BUNDLE_SHORT_VERSION_TEMPLATE_REGEX = /{{BUNDLE_SHORT_VERSION}}/gm;
const BUNDLE_VERSION_TEMPLATE_REGEX = /{{BUNDLE_VERSION}}/gm;

const DEFAULT_BUNDLE_VERSION = '1';
const DEFAULT_BUNDLE_SHORT_VERSION = '1.0';

const NSE_TARGET_NAME = 'CleverPushNotificationServiceExtension';
// TODO combine to one array
const NSE_SOURCE_FILE = 'NotificationService.swift';
const NSE_EXT_FILES = [/* `${NSE_TARGET_NAME}.entitlements`, */ `Info.plist`];

const withPodFiles: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const iosRoot = path.join(config.modRequest.projectRoot, 'ios');
			updatePodfile(iosRoot).catch((err) => {
				console.error(err);
			});
			return config;
		}
	]);
};

const withNSEInXcodeProject: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	return withXcodeProject(config, (newConfig) => {
		const xcodeProject = newConfig.modResults;

		if (xcodeProject.pbxTargetByName(NSE_TARGET_NAME)) {
			console.log(`${NSE_TARGET_NAME} already exists in project. Skipping...`);
			return newConfig;
		}

		// Create new PBXGroup for the extension
		const extGroup = xcodeProject.addPbxGroup(
			[...NSE_EXT_FILES, NSE_SOURCE_FILE],
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

				buildSettingsObj.DEVELOPMENT_TEAM = props?.devTeam;
				buildSettingsObj.IPHONEOS_DEPLOYMENT_TARGET =
					props?.iPhoneDeploymentTarget ?? IPHONEOS_DEPLOYMENT_TARGET; // TODO get from config
				buildSettingsObj.TARGETED_DEVICE_FAMILY = TARGETED_DEVICE_FAMILY;
				buildSettingsObj.INFOPLIST_FILE = `${NSE_TARGET_NAME}/Info.plist`;
				buildSettingsObj.SWIFT_VERSION = `5.0`;
				// buildSettingsObj.CODE_SIGN_ENTITLEMENTS = `${NSE_TARGET_NAME}/${NSE_TARGET_NAME}.entitlements`;
			}
		}

		// Add development teams to both your target and the original project
		// TODO check, why necessary?
		xcodeProject.addTargetAttribute('DevelopmentTeam', props?.devTeam); // TODO not working?
		xcodeProject.addTargetAttribute('DevelopmentTeam', props?.devTeam, nseTarget);
		return newConfig;
	});
};

const withCleverPushNSEFiles: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const sourceDir = path.join(__dirname, '../extensions/CleverPushNotificationServiceExtension');

	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const iosPath = path.join(config.modRequest.projectRoot, 'ios');

			/* COPY OVER EXTENSION FILES */
			fs.mkdirSync(`${iosPath}/${NSE_TARGET_NAME}`, { recursive: true });

			for (let i = 0; i < NSE_EXT_FILES.length; i++) {
				const extFile = NSE_EXT_FILES[i];
				const targetFile = `${iosPath}/${NSE_TARGET_NAME}/${extFile}`;

				// await fs.promises.writeFile(targetFile, 'xx');
				await fs.promises.copyFile(`${sourceDir}/${extFile}`, targetFile);
			}

			// Copy NSE source file either from configuration-provided location, falling back to the default one.
			const sourcePath = `${sourceDir}/${NSE_SOURCE_FILE}`;
			const targetFile = `${iosPath}/${NSE_TARGET_NAME}/${NSE_SOURCE_FILE}`;
			// await fs.promises.writeFile(targetFile, 'xx');
			await fs.promises.copyFile(`${sourcePath}`, targetFile);

			/* MODIFY COPIED EXTENSION FILES */
			/*const nseUpdater = new NseUpdaterManager(iosPath);
			await nseUpdater.updateNSEEntitlements(`group.${config.ios?.bundleIdentifier}.onesignal`);
			await nseUpdater.updateNSEBundleVersion(config.ios?.buildNumber ?? DEFAULT_BUNDLE_VERSION);
			await nseUpdater.updateNSEBundleShortVersion(config?.version ?? DEFAULT_BUNDLE_SHORT_VERSION);*/

			return config;
		}
	]);
};

const withAppGroup: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const APP_GROUP_KEY = 'com.apple.security.application-groups';
	return withEntitlementsPlist(config, (newConfig) => {
		if (!Array.isArray(newConfig.modResults[APP_GROUP_KEY])) {
			newConfig.modResults[APP_GROUP_KEY] = [];
		}
		const modResultsArray = newConfig.modResults[APP_GROUP_KEY];
		const entitlement = `group.${newConfig?.ios?.bundleIdentifier || ''}.cleverpush`;
		if (modResultsArray.indexOf(entitlement) !== -1) {
			return newConfig;
		}
		modResultsArray.push(entitlement);

		return newConfig;
	});
};

const withEASExtraConfig: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const extraConfig = {
		...config.extra,
		eas: {
			...config.extra?.eas,
			build: {
				...config.extra?.eas?.build,
				experimental: {
					...config.extra?.eas?.build?.experimental,
					ios: {
						...config.extra?.eas?.build?.experimental?.ios,
						appExtensions: [
							...(config.extra?.eas?.build?.experimental?.ios?.appExtensions ?? []),
							{
								// keep in sync with native changes in NSE
								targetName: NSE_TARGET_NAME,
								bundleIdentifier: `${config?.ios?.bundleIdentifier}.${NSE_TARGET_NAME}`,
								entitlements: {
									/*'com.apple.security.application-groups': [
										`group.${config?.ios?.bundleIdentifier}.CleverPush`
									]*/
								}
							}
						]
					}
				}
			}
		}
	};

	config.extra = extraConfig;
	return config;
};

const content = `
target 'CleverPushNotificationServiceExtension' do
  pod 'CleverPush'
end`;
/*
target 'CleverPushNotificationContentExtension' do
  pod 'CleverPush'
end`;*/

async function updatePodfile(iosPath: string) {
	const podfile = await fs.promises.readFile(`${iosPath}/Podfile`, 'utf8');
	const matches = podfile.match(NSE_TARGET_NAME);

	// TODO check require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
	// => possibility to auto link?
	if (matches) {
		console.log(`${NSE_TARGET_NAME} target already added to Podfile. Skipping...`);
	} else {
		await fs.appendFile(`${iosPath}/Podfile`, content, (err) => {
			if (err) {
				console.error('Error writing to Podfile');
			}
		});
	}
}
