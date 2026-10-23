import { ExportedConfig, XcodeProject } from 'expo/config-plugins';
import fs from 'fs';
import os from 'os';
import path from 'path';
import xcode from 'xcode';

import { IPHONEOS_DEPLOYMENT_TARGET, NSE_FILES, NSE_SOURCE_FILE, NSE_TARGET_NAME } from '../constants';
import { withExtensionInXcodeProject } from '../withExtensionInXcodeProject';

const FIXTURE = path.join(__dirname, 'fixtures', 'project.pbxproj');

// The fixture mirrors the Expo template: the app target and the project level both declare a deployment
// target, the app target's value is the one the consumer controls through expo-build-properties.
const APP_TARGET_DEPLOYMENT_TARGET = '16.4';
const PROJECT_DEPLOYMENT_TARGET = '15.1';

const parseProject = (transform: (pbxproj: string) => string = (pbxproj) => pbxproj): XcodeProject => {
	const projectPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cleverpush-')), 'project.pbxproj');
	fs.writeFileSync(projectPath, transform(fs.readFileSync(FIXTURE, 'utf8')));

	const project = xcode.project(projectPath);
	project.parseSync();
	return project;
};

const addServiceExtension = async (project: XcodeProject): Promise<XcodeProject> => {
	const config = withExtensionInXcodeProject(
		{ name: 'App', slug: 'app', version: '1.2.3', ios: { bundleIdentifier: 'com.example.app', buildNumber: '7' } },
		{ targetName: NSE_TARGET_NAME, files: NSE_FILES, sourceFile: NSE_SOURCE_FILE }
	) as ExportedConfig;

	const result = await config.mods!.ios!.xcodeproj!({
		...config,
		modRequest: {
			projectRoot: '/',
			platformProjectRoot: '/ios',
			projectName: 'App',
			modName: 'xcodeproj',
			platform: 'ios',
			introspect: false
		},
		modResults: project
	});

	return result.modResults;
};

const extensionBuildSettings = (project: XcodeProject): Record<string, string | number>[] =>
	Object.values<{ buildSettings?: Record<string, string | number> }>(project.pbxXCBuildConfigurationSection())
		.filter((configuration) => configuration.buildSettings?.PRODUCT_NAME === `"${NSE_TARGET_NAME}"`)
		.map((configuration) => configuration.buildSettings!);

describe('withExtensionInXcodeProject', () => {
	it('uses the deployment target of the app target for the extension', async () => {
		const project = await addServiceExtension(parseProject());

		const settings = extensionBuildSettings(project);
		expect(settings).toHaveLength(2);
		settings.forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(APP_TARGET_DEPLOYMENT_TARGET);
			expect(buildSettings.INFOPLIST_FILE).toBe(`${NSE_TARGET_NAME}/Info.plist`);
			expect(buildSettings.MARKETING_VERSION).toBe('1.2.3');
			expect(buildSettings.CURRENT_PROJECT_VERSION).toBe('7');
		});
	});

	it('strips quotes from a quoted deployment target', async () => {
		const project = await addServiceExtension(
			parseProject((pbxproj) =>
				pbxproj.replace(
					new RegExp(`IPHONEOS_DEPLOYMENT_TARGET = ${APP_TARGET_DEPLOYMENT_TARGET};`, 'g'),
					'IPHONEOS_DEPLOYMENT_TARGET = "17.0";'
				)
			)
		);

		extensionBuildSettings(project).forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe('17.0');
		});
	});

	it('falls back to the project-level deployment target when the app target has none', async () => {
		const project = await addServiceExtension(
			parseProject((pbxproj) =>
				pbxproj.replace(new RegExp(`\\s*IPHONEOS_DEPLOYMENT_TARGET = ${APP_TARGET_DEPLOYMENT_TARGET};`, 'g'), '')
			)
		);

		extensionBuildSettings(project).forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(PROJECT_DEPLOYMENT_TARGET);
		});
	});

	it('falls back to the constant when the project declares no deployment target', async () => {
		const project = await addServiceExtension(
			parseProject((pbxproj) => pbxproj.replace(/\s*IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g, ''))
		);

		extensionBuildSettings(project).forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(IPHONEOS_DEPLOYMENT_TARGET);
		});
	});

	it('does not add the target twice', async () => {
		const project = await addServiceExtension(await addServiceExtension(parseProject()));

		expect(extensionBuildSettings(project)).toHaveLength(2);
	});
});
