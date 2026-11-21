import { ExportedConfig, ExportedConfigWithProps } from 'expo/config-plugins';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { NOTIFICATION_CHANNEL_KEY_META_DATA, NOTIFICATION_CHANNELS_META_DATA } from '../constants';
import { withAndroidExtensionFile } from '../withAndroidExtensionFile';

const projectRoots: string[] = [];

afterEach(() => {
	projectRoots.splice(0).forEach((projectRoot) => fs.rmSync(projectRoot, { recursive: true, force: true }));
});

const copyExtension = async (packageName: string): Promise<string> => {
	const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cleverpush-'));
	projectRoots.push(projectRoot);

	// The Proguard rules added through expo-build-properties are appended to this file.
	fs.mkdirSync(path.join(projectRoot, 'android', 'app'), { recursive: true });
	fs.writeFileSync(path.join(projectRoot, 'android', 'app', 'proguard-rules.pro'), '');

	const config = withAndroidExtensionFile(
		{ name: 'App', slug: 'app', android: { package: packageName } },
		{}
	) as ExportedConfig;

	await config.mods!.android!.dangerous!({
		...config,
		modRawConfig: config,
		modRequest: {
			projectRoot,
			platformProjectRoot: path.join(projectRoot, 'android'),
			projectName: 'App',
			modName: 'dangerous',
			platform: 'android',
			introspect: false
		},
		modResults: {}
	} as ExportedConfigWithProps<unknown>);

	return fs.readFileSync(
		path.join(
			projectRoot,
			'android/app/src/main/java',
			...packageName.split('.'),
			'ExpoNotificationServiceExtension.java'
		),
		'utf8'
	);
};

describe('withAndroidExtensionFile', () => {
	it('moves the extension into the app package', async () => {
		const content = await copyExtension('com.example.app');

		expect(content).toMatch(/^package com\.example\.app;$/m);
		expect(content).toMatch(/^import com\.example\.app\.R;$/m);
	});

	it('keeps the <meta-data> names the config plugin writes', async () => {
		const content = await copyExtension('com.example.app');

		expect(content).toContain(`"${NOTIFICATION_CHANNEL_KEY_META_DATA}"`);
		expect(content).toContain(`"${NOTIFICATION_CHANNELS_META_DATA}"`);
	});
});
