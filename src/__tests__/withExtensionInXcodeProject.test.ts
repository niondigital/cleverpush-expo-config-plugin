import { ExportedConfig, ExportedConfigWithProps, IOSConfig, XcodeProject } from 'expo/config-plugins';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { NSE_FILES, NSE_SOURCE_FILE, NSE_TARGET_NAME } from '../constants';
import { withExtensionInXcodeProject } from '../withExtensionInXcodeProject';

const FIXTURE = path.join(__dirname, 'fixtures', 'project.pbxproj');

// The fixture mirrors the Expo template: the app target and the project level both declare a deployment target.
// The project-level value differs from the app target so the tests can tell which one was picked up.
const APP_TARGET_DEPLOYMENT_TARGET = '16.4';

const projectRoots: string[] = [];

afterEach(() => {
	projectRoots.splice(0).forEach((projectRoot) => fs.rmSync(projectRoot, { recursive: true, force: true }));
});

const parseProject = (transform: (pbxproj: string) => string = (pbxproj) => pbxproj): XcodeProject => {
	const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cleverpush-'));
	projectRoots.push(projectRoot);

	const projectPath = path.join(projectRoot, 'ios', 'App.xcodeproj', 'project.pbxproj');
	fs.mkdirSync(path.dirname(projectPath), { recursive: true });
	fs.writeFileSync(projectPath, transform(fs.readFileSync(FIXTURE, 'utf8')));

	return IOSConfig.XcodeUtils.getPbxproj(projectRoot);
};

const addServiceExtension = async (
	project: XcodeProject,
	ios: ExportedConfig['ios'] = {},
	version = '1.2.3'
): Promise<XcodeProject> => {
	const config = withExtensionInXcodeProject(
		{
			name: 'App',
			slug: 'app',
			version,
			ios: { bundleIdentifier: 'com.example.app', buildNumber: '7', ...ios }
		},
		{ targetName: NSE_TARGET_NAME, files: NSE_FILES, sourceFile: NSE_SOURCE_FILE }
	) as ExportedConfig;

	const result = await config.mods!.ios!.xcodeproj!({
		...config,
		modRawConfig: config,
		modRequest: {
			projectRoot: '/',
			platformProjectRoot: '/ios',
			projectName: 'App',
			modName: 'xcodeproj',
			platform: 'ios',
			introspect: false
		},
		modResults: project
	} as ExportedConfigWithProps<XcodeProject>);

	return result.modResults;
};

type BuildSettings = Record<string, string | number>;

const extensionBuildSettings = (project: XcodeProject): Record<string, BuildSettings> =>
	Object.fromEntries(
		Object.values<{ name: string; buildSettings?: BuildSettings }>(project.pbxXCBuildConfigurationSection())
			.filter((configuration) => configuration.buildSettings?.PRODUCT_NAME === `"${NSE_TARGET_NAME}"`)
			.map((configuration) => [configuration.name, configuration.buildSettings!])
	);

const groupsReferencing = (project: XcodeProject, fileRef: string): string[] =>
	Object.entries<{ children?: { value: string }[] } | string>(project.hash.project.objects['PBXGroup'])
		.filter(([, group]) => typeof group === 'object' && group.children?.some((child) => child.value === fileRef))
		.map(([key]) => key);

const extensionGroup = (project: XcodeProject): { children: { value: string }[] } => {
	const group = Object.values<{ name?: string; children?: { value: string }[] } | string>(
		project.hash.project.objects['PBXGroup']
	).find((candidate) => typeof candidate === 'object' && candidate.name === NSE_TARGET_NAME);
	if (typeof group !== 'object' || !group.children) {
		throw new Error('The extension group is missing');
	}
	return { children: group.children };
};

const extensionFilePaths = (project: XcodeProject): string[] =>
	extensionGroup(project).children.map((child) =>
		IOSConfig.XcodeUtils.unquote(project.pbxFileReferenceSection()[child.value].path)
	);

describe('withExtensionInXcodeProject', () => {
	it('uses the deployment target of the app target for the extension', async () => {
		const project = await addServiceExtension(parseProject());

		const settings = extensionBuildSettings(project);
		expect(Object.keys(settings)).toEqual(['Debug', 'Release']);
		Object.values(settings).forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(APP_TARGET_DEPLOYMENT_TARGET);
			expect(buildSettings.INFOPLIST_FILE).toBe(`${NSE_TARGET_NAME}/Info.plist`);
			expect(buildSettings.MARKETING_VERSION).toBe('1.2.3');
			expect(buildSettings.CURRENT_PROJECT_VERSION).toBe('7');
		});
	});

	it('prefers ios.deploymentTarget from the app config over the pbxproj', async () => {
		const project = await addServiceExtension(parseProject(), { deploymentTarget: '18.0' });

		Object.values(extensionBuildSettings(project)).forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe('18.0');
		});
	});

	it('matches the deployment target per build configuration', async () => {
		// The app target's Debug configuration comes first in the fixture, so only the second occurrence
		// (Release) is changed.
		let occurrence = 0;
		const project = await addServiceExtension(
			parseProject((pbxproj) =>
				pbxproj.replace(
					new RegExp(`IPHONEOS_DEPLOYMENT_TARGET = ${APP_TARGET_DEPLOYMENT_TARGET};`, 'g'),
					(match) => (++occurrence === 2 ? 'IPHONEOS_DEPLOYMENT_TARGET = 17.0;' : match)
				)
			)
		);

		const settings = extensionBuildSettings(project);
		expect(settings.Debug?.IPHONEOS_DEPLOYMENT_TARGET).toBe(APP_TARGET_DEPLOYMENT_TARGET);
		expect(settings.Release?.IPHONEOS_DEPLOYMENT_TARGET).toBe('17.0');
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

		Object.values(extensionBuildSettings(project)).forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe('17.0');
		});
	});

	it('leaves the deployment target unset when the app target declares none, so both inherit the project level', async () => {
		const project = await addServiceExtension(
			parseProject((pbxproj) =>
				pbxproj.replace(
					new RegExp(`\\s*IPHONEOS_DEPLOYMENT_TARGET = ${APP_TARGET_DEPLOYMENT_TARGET};`, 'g'),
					''
				)
			)
		);

		Object.values(extensionBuildSettings(project)).forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBeUndefined();
		});
	});

	it('leaves the deployment target unset for a build configuration the app target does not have', async () => {
		// The first "name = Debug;" in the fixture belongs to the app target.
		const project = await addServiceExtension(
			parseProject((pbxproj) => pbxproj.replace('name = Debug;', 'name = Staging;'))
		);

		const settings = extensionBuildSettings(project);
		expect(settings.Debug?.IPHONEOS_DEPLOYMENT_TARGET).toBeUndefined();
		expect(settings.Release?.IPHONEOS_DEPLOYMENT_TARGET).toBe(APP_TARGET_DEPLOYMENT_TARGET);
	});

	it('references the extension files by their path in the ios folder', async () => {
		const project = await addServiceExtension(parseProject());

		expect(extensionFilePaths(project)).toEqual(NSE_FILES.map((file) => `${NSE_TARGET_NAME}/${file}`));
	});

	// Another extension, e.g. a widget, that references its files relative to its group adds a bare "Info.plist".
	it.each(['before', 'after'])('shares no file reference with an extension added %s it', async (order) => {
		const addOtherExtension = (target: XcodeProject) => target.addPbxGroup(['Info.plist'], 'Widget', 'Widget');
		let project = parseProject();
		if (order === 'before') {
			addOtherExtension(project);
		}
		project = await addServiceExtension(project);
		if (order === 'after') {
			addOtherExtension(project);
		}

		const sharedReferences = Object.keys(project.pbxFileReferenceSection())
			.filter((key) => !key.endsWith('_comment'))
			.filter((fileRef) => groupsReferencing(project, fileRef).length > 1);
		expect(sharedReferences).toEqual([]);
	});

	it('compiles the source file through the reference in the extension group', async () => {
		const project = await addServiceExtension(parseProject());

		const objects = project.hash.project.objects;
		const target = project.pbxTargetByName(`"${NSE_TARGET_NAME}"`);
		const sourcesPhase = target.buildPhases.find((phase: { comment: string }) => phase.comment === 'Sources');
		const compiledFiles = objects['PBXSourcesBuildPhase'][sourcesPhase.value].files.map(
			(file: { value: string }) => objects['PBXBuildFile'][file.value].fileRef
		);

		expect(compiledFiles).toHaveLength(1);
		expect(extensionGroup(project).children).toContainEqual(expect.objectContaining({ value: compiledFiles[0] }));
	});

	it('does not add the target twice', async () => {
		const project = await addServiceExtension(await addServiceExtension(parseProject()));

		expect(Object.keys(extensionBuildSettings(project))).toHaveLength(2);
	});

	it('refreshes the build settings of an existing target on a second run', async () => {
		const first = await addServiceExtension(parseProject());
		const second = await addServiceExtension(first, { buildNumber: '8', deploymentTarget: '18.0' }, '2.0.0');

		const settings = extensionBuildSettings(second);
		expect(Object.keys(settings)).toEqual(['Debug', 'Release']);
		Object.values(settings).forEach((buildSettings) => {
			expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe('18.0');
			expect(buildSettings.MARKETING_VERSION).toBe('2.0.0');
			expect(buildSettings.CURRENT_PROJECT_VERSION).toBe('8');
		});
	});
});
