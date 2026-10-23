import { ConfigPlugin, withXcodeProject } from 'expo/config-plugins';

import { IPHONEOS_DEPLOYMENT_TARGET, TARGETED_DEVICE_FAMILY } from './constants';

/**
 * Reads IPHONEOS_DEPLOYMENT_TARGET from the build configurations referenced by the given
 * XCConfigurationList. Values in a pbxproj may be quoted, the quotes are stripped.
 */
const readDeploymentTarget = (xcodeProject: any, configurationListUuid: string | undefined): string | undefined => {
	if (!configurationListUuid) {
		return undefined;
	}

	const configurationList = xcodeProject.pbxXCConfigurationList()?.[configurationListUuid];
	const configurations = xcodeProject.pbxXCBuildConfigurationSection();

	for (const { value } of configurationList?.buildConfigurations ?? []) {
		const target = configurations[value]?.buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;
		if (typeof target === 'string' && target.length > 0) {
			return target.replace(/^"(.*)"$/, '$1');
		}
	}

	return undefined;
};

/**
 * Returns the deployment target of the main app target so the extension matches it.
 *
 * An extension is embedded into the app, so a deployment target that differs from the app target either
 * excludes devices the app supports or builds the extension against an iOS version the app no longer
 * targets. The app target is the first native target; the project-level settings are the second source
 * because the Expo template declares the value on both levels. The constant applies only when neither
 * level is readable.
 */
const getAppDeploymentTarget = (xcodeProject: any): string => {
	try {
		const { firstTarget } = xcodeProject.getFirstTarget();
		const { firstProject } = xcodeProject.getFirstProject();

		return (
			readDeploymentTarget(xcodeProject, firstTarget?.buildConfigurationList) ??
			readDeploymentTarget(xcodeProject, firstProject?.buildConfigurationList) ??
			IPHONEOS_DEPLOYMENT_TARGET
		);
	} catch {
		return IPHONEOS_DEPLOYMENT_TARGET;
	}
};

/**
 * Adds an extension target to the Xcode project.
 *
 * @param config
 * @param props
 */
export const withExtensionInXcodeProject: ConfigPlugin<{ targetName: string; files: string[]; sourceFile?: string }> = (
	config,
	{ targetName, files, sourceFile }
) => {
	return withXcodeProject(config, (newConfig) => {
		const xcodeProject = newConfig.modResults;

		// addTarget registers the target comment with surrounding quotes and the lookup compares the comment
		// verbatim, so a target this plugin added in an earlier run is only found by its quoted name.
		if (xcodeProject.pbxTargetByName(targetName) || xcodeProject.pbxTargetByName(`"${targetName}"`)) {
			console.log(`${targetName} already exists in project. Skipping...`);
			return newConfig;
		}

		// Create new PBXGroup for the extension
		const extGroup = xcodeProject.addPbxGroup(files, targetName, targetName);

		// Add the new PBXGroup to the top level group. This makes the
		// files / folder appear in the file explorer in Xcode.
		const groups: any[] = xcodeProject.hash.project.objects['PBXGroup'];
		Object.entries(groups).forEach(([key, group]) => {
			if (typeof group === 'object' && group.name === undefined && group.path === undefined) {
				xcodeProject.addToPbxGroup(extGroup.uuid, key);
			}
		});

		// WORK AROUND for codeProject.addTarget BUG
		// Xcode projects don't contain these if there is only one target
		// An upstream fix should be made to the code referenced in this link:
		//   - https://github.com/apache/cordova-node-xcode/blob/8b98cabc5978359db88dc9ff2d4c015cba40f150/lib/pbxProject.js#L860
		const projObjects = xcodeProject.hash.project.objects;
		projObjects['PBXTargetDependency'] = projObjects['PBXTargetDependency'] || {};
		projObjects['PBXContainerItemProxy'] = projObjects['PBXContainerItemProxy'] || {};

		// Add the target
		// This adds PBXTargetDependency and PBXContainerItemProxy for you
		const newTarget = xcodeProject.addTarget(
			targetName,
			'app_extension',
			targetName,
			`${config.ios?.bundleIdentifier}.${targetName}`
		);

		// Add build phases to the new target
		xcodeProject.addBuildPhase(sourceFile ? [sourceFile] : [], 'PBXSourcesBuildPhase', 'Sources', newTarget.uuid);
		xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', newTarget.uuid);
		xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', newTarget.uuid);

		// Set the most essential (and necessary) build settings of the new target
		const deploymentTarget = getAppDeploymentTarget(xcodeProject);
		const configurations: { buildSettings: Record<string, string | number> | undefined }[] =
			xcodeProject.pbxXCBuildConfigurationSection();
		Object.values(configurations).forEach((configuration) => {
			if (configuration.buildSettings?.PRODUCT_NAME === `"${targetName}"`) {
				const buildSettings = configuration.buildSettings;

				buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
				buildSettings.TARGETED_DEVICE_FAMILY = TARGETED_DEVICE_FAMILY;
				buildSettings.INFOPLIST_FILE = `${targetName}/Info.plist`;
				buildSettings.SWIFT_VERSION = '5.0';

				// The version and build number in the Info.plist need to match the version of the main target.
				// Set MARKETING_VERSION and CURRENT_PROJECT_VERSION so Info.plist can use those variables
				buildSettings.MARKETING_VERSION = config.version ?? '1.0.0';
				buildSettings.CURRENT_PROJECT_VERSION = config.ios?.buildNumber ?? 1;
			}
		});

		return newConfig;
	});
};
