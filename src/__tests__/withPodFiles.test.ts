import { ExportedConfig, ExportedConfigWithProps } from 'expo/config-plugins';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { NCE_TARGET_NAME, NSE_TARGET_NAME } from '../constants';
import { withPodFiles } from '../withPodFiles';

const BASE_PODFILE = `require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")

target 'App' do
  use_expo_modules!
end
`;

const projectRoots: string[] = [];

afterEach(() => {
	projectRoots.splice(0).forEach((projectRoot) => fs.rmSync(projectRoot, { recursive: true, force: true }));
});

const createProject = (): string => {
	const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cleverpush-'));
	projectRoots.push(projectRoot);

	fs.mkdirSync(path.join(projectRoot, 'ios'));
	fs.writeFileSync(path.join(projectRoot, 'ios', 'Podfile'), BASE_PODFILE);
	return projectRoot;
};

const runPodFilesMod = async (projectRoot: string, includeContentExtension: boolean): Promise<string> => {
	const config = withPodFiles({ name: 'App', slug: 'app' }, { includeContentExtension }) as ExportedConfig;

	await config.mods!.ios!.dangerous!({
		...config,
		modRawConfig: config,
		modRequest: {
			projectRoot,
			platformProjectRoot: path.join(projectRoot, 'ios'),
			projectName: 'App',
			modName: 'dangerous',
			platform: 'ios',
			introspect: false
		},
		modResults: {}
	} as ExportedConfigWithProps);

	return fs.readFileSync(path.join(projectRoot, 'ios', 'Podfile'), 'utf8');
};

const countTargets = (podfile: string, targetName: string): number =>
	podfile.split('\n').filter((line) => line.trim() === `target '${targetName}' do`).length;

describe('withPodFiles', () => {
	it('appends both extension targets after the existing content', async () => {
		const podfile = await runPodFilesMod(createProject(), true);

		expect(podfile.startsWith(BASE_PODFILE)).toBe(true);
		expect(countTargets(podfile, NSE_TARGET_NAME)).toBe(1);
		expect(countTargets(podfile, NCE_TARGET_NAME)).toBe(1);
	});

	it('appends only the service extension target without the content extension', async () => {
		const podfile = await runPodFilesMod(createProject(), false);

		expect(countTargets(podfile, NSE_TARGET_NAME)).toBe(1);
		expect(countTargets(podfile, NCE_TARGET_NAME)).toBe(0);
	});

	it('does not duplicate the targets on a repeated prebuild', async () => {
		const projectRoot = createProject();
		const first = await runPodFilesMod(projectRoot, true);
		const second = await runPodFilesMod(projectRoot, true);

		expect(second).toBe(first);
		expect(countTargets(second, NSE_TARGET_NAME)).toBe(1);
		expect(countTargets(second, NCE_TARGET_NAME)).toBe(1);
	});

	it('adds the content extension target to a Podfile that already has the service extension target', async () => {
		const projectRoot = createProject();
		await runPodFilesMod(projectRoot, false);
		const podfile = await runPodFilesMod(projectRoot, true);

		expect(countTargets(podfile, NSE_TARGET_NAME)).toBe(1);
		expect(countTargets(podfile, NCE_TARGET_NAME)).toBe(1);
	});
});
