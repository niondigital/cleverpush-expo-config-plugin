import { CleverPushPluginProps } from './types/types';

import { ConfigPlugin, withAppBuildGradle } from '@expo/config-plugins';

const dependency = `
	implementation('com.cleverpush:cleverpush:1.34.40') {
		exclude group: 'com.google.firebase', module: 'firebase-messaging'
	}`;

/**
 * Expo Config Plugin to add a dependency to android/app/build.gradle
 */
export const withAndroidDependency: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	return withAppBuildGradle(config, (config) => {

		if (!config.modResults.contents.includes(dependency)) {
			config.modResults.contents = config.modResults.contents.replace(
				/dependencies\s?{/,
				`dependencies {${dependency}`
			);
		}

		return config;
	});
};
