import { ConfigPlugin, } from '@expo/config-plugins';
import { APP_GROUP_SUFFIX, NCE_TARGET_NAME, NSE_TARGET_NAME } from './constants';
import { CleverPushPluginProps } from './types/types';

/**
 * Declaring app extensions with extra.eas.build.experimental.ios.appExtensions in your app config makes it possible
 * for EAS CLI to know what app extensions exist before the build starts (before the Xcode project has been generated)
 * to ensure that the required credentials are generated and validated.
 *
 * @param config
 * @param props
 */
export const withEASExtraConfig: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	const newAppExtensions = [{
		targetName: NSE_TARGET_NAME,
		bundleIdentifier: `${config?.ios?.bundleIdentifier}.${NSE_TARGET_NAME}`,
		entitlements: {
			'com.apple.security.application-groups': [
				`group.${config?.ios?.bundleIdentifier}.${APP_GROUP_SUFFIX}`
			]
		}
	}];

	if (props.includeContentExtension) {
		newAppExtensions.push({
			targetName: NCE_TARGET_NAME,
			bundleIdentifier: `${config?.ios?.bundleIdentifier}.${NCE_TARGET_NAME}`,
			entitlements: {
				'com.apple.security.application-groups': [
					`group.${config?.ios?.bundleIdentifier}.${APP_GROUP_SUFFIX}`
				]
			}
		});
	}

	config.extra = {
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
							...newAppExtensions
						]
					}
				}
			}
		}
	};

	return config;
};