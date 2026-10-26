import { ConfigPlugin, ExportedConfig, IOSConfig, withXcodeProject, XcodeProject } from 'expo/config-plugins';

import { TARGETED_DEVICE_FAMILY } from './constants';

/**
 * Returns the deployment target the app target has for the given build configuration.
 *
 * An extension is embedded into the app, so it has to match the app target: a lower value can fall out of the
 * range Xcode still supports, a higher value excludes devices the app runs on. The value is resolved the way
 * Expo resolves it for the app target:
 *
 * 1. `ios.deploymentTarget` from the app config (Expo SDK 56+). Expo writes it into the app target in a mod of
 *    its own; reading the config directly keeps this plugin independent of where that mod sits in the chain.
 * 2. The value the app target declares in the pbxproj, which is the Expo template value on a fresh prebuild.
 * 3. `undefined` when the app target declares none: the app target then inherits the project-level setting and
 *    the extension does the same when the build setting stays unset.
 */
const getAppDeploymentTarget = (
	config: Pick<ExportedConfig, 'ios'>,
	project: XcodeProject,
	buildConfiguration: string
): string | undefined => {
	if (config.ios?.deploymentTarget) {
		return config.ios.deploymentTarget;
	}

	let appConfiguration;
	try {
		appConfiguration = IOSConfig.Target.getXCBuildConfigurationFromPbxproj(project, { buildConfiguration });
	} catch (error) {
		// The app target has no build configuration of that name (or there is no app target at all). The
		// extension then inherits the project level, the same way the app target does for that configuration.
		console.warn(`Could not read the app deployment target for ${buildConfiguration}: ${String(error)}`);
		return undefined;
	}

	const deploymentTarget = appConfiguration?.buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;

	return deploymentTarget ? IOSConfig.XcodeUtils.unquote(String(deploymentTarget)) : undefined;
};

/**
 * Creates the extension target with its file group and build phases.
 */
const addExtensionTarget = (
	xcodeProject: XcodeProject,
	{
		targetName,
		files,
		sourceFile,
		bundleIdentifier
	}: { targetName: string; files: string[]; sourceFile?: string; bundleIdentifier: string }
) => {
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
	const newTarget = xcodeProject.addTarget(targetName, 'app_extension', targetName, bundleIdentifier);

	// Add build phases to the new target
	xcodeProject.addBuildPhase(sourceFile ? [sourceFile] : [], 'PBXSourcesBuildPhase', 'Sources', newTarget.uuid);
	xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', newTarget.uuid);
	xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', newTarget.uuid);
};

/**
 * Adds an extension target to the Xcode project and keeps its build settings in sync with the app.
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
			console.log(`${targetName} already exists in project. Updating its build settings...`);
		} else {
			addExtensionTarget(xcodeProject, {
				targetName,
				files,
				sourceFile,
				bundleIdentifier: `${config.ios?.bundleIdentifier}.${targetName}`
			});
		}

		// The build settings are written on every prebuild, not only when the target is created: a prebuild
		// without --clean keeps the Xcode project of the previous run, and the version, build number and
		// deployment target of the extension have to follow the app.
		const configurations: { name: string; buildSettings: Record<string, string | number> | undefined }[] =
			xcodeProject.pbxXCBuildConfigurationSection();
		Object.values(configurations).forEach((configuration) => {
			if (configuration.buildSettings?.PRODUCT_NAME === `"${targetName}"`) {
				const buildSettings = configuration.buildSettings;

				const deploymentTarget = getAppDeploymentTarget(newConfig, xcodeProject, configuration.name);
				if (deploymentTarget) {
					buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
				} else {
					delete buildSettings.IPHONEOS_DEPLOYMENT_TARGET;
				}
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
