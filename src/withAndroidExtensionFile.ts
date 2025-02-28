import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import { withBuildProperties } from 'expo-build-properties';
import fs from 'fs';
import path from 'path';

import { CleverPushPluginProps } from './types/types';

/**
 * Copies the given extension file to the Android project.
 *
 * @param config
 * @param props
 */
export const withAndroidExtensionFile: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const filename = 'ExpoNotificationServiceExtension.java';

	const packageName = config.android?.package as string;

	config = withDangerousMod(config, [
		'android',
		async (config) => {
			const androidPath = path.join(config.modRequest.projectRoot, 'android');

			const targetExtensionPath = path.join(androidPath, `app/src/main/java/${packageName.replace(/\./g, '/')}`);

			await fs.promises.mkdir(targetExtensionPath, { recursive: true });

			let content = await fs.promises.readFile(`${sourcePath}/${filename}`, 'utf8');
			content = content.replace(/com.niondigital.cleverpush/g, packageName);

			await fs.promises.writeFile(`${targetExtensionPath}/${filename}`, content);

			return config;
		}
	]);

	const sourcePath = path.join(__dirname, `../extensions/android/`);

	// Add Proguard rules
	return withBuildProperties(config, {
		android: {
			extraProguardRules: `
# ProGuard Rules for Cleverpush Notification Service
-keep class com.cleverpush.** { *; }
-keep interface com.cleverpush.** { *; }
-keep class com.firebase.** { *; }
-keep class com.google.firebase.** { *; }
-keep class com.google.gson.internal.LinkedTreeMap { *; }
-keep class ${packageName}.${filename.split('.java')[0]} { *; }`
		}
	});
};
