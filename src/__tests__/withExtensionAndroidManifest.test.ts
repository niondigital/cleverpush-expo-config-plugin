import { AndroidConfig, ExportedConfig, ExportedConfigWithProps } from 'expo/config-plugins';

import {
	NOTIFICATION_CHANNEL_KEY_META_DATA,
	NOTIFICATION_CHANNELS_META_DATA,
	NOTIFICATION_SERVICE_EXTENSION_META_DATA
} from '../constants';
import { CleverPushPluginProps } from '../types/types';
import { withExtensionAndroidManifest } from '../withExtensionAndroidManifest';

type AndroidManifest = AndroidConfig.Manifest.AndroidManifest;

const emptyManifest = (): AndroidManifest => ({
	manifest: {
		$: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
		queries: [],
		application: [{ $: { 'android:name': '.MainApplication' } }]
	}
});

const applyPlugin = async (manifest: AndroidManifest, props: CleverPushPluginProps = {}): Promise<AndroidManifest> => {
	const config = withExtensionAndroidManifest(
		{ name: 'App', slug: 'app', android: { package: 'com.example.app' } },
		props
	) as ExportedConfig;

	const result = await config.mods!.android!.manifest!({
		...config,
		modRawConfig: config,
		modRequest: {
			projectRoot: '/',
			platformProjectRoot: '/android',
			projectName: 'App',
			modName: 'manifest',
			platform: 'android',
			introspect: false
		},
		modResults: manifest
	} as ExportedConfigWithProps<AndroidManifest>);

	return result.modResults;
};

const metaData = (manifest: AndroidManifest): Record<string, string | undefined> =>
	Object.fromEntries(
		(AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)['meta-data'] ?? []).map((item) => [
			item.$['android:name'],
			item.$['android:value']
		])
	);

const CHANNELS: CleverPushPluginProps['androidNotificationChannels'] = {
	customDataKey: 'category',
	channels: { locked_movement: 'locked_movement_v2', bike_battery_low: 'battery_v2' }
};

describe('withExtensionAndroidManifest', () => {
	it('registers the notification service extension', async () => {
		const manifest = await applyPlugin(emptyManifest());

		expect(metaData(manifest)).toEqual({
			[NOTIFICATION_SERVICE_EXTENSION_META_DATA]: 'com.example.app.ExpoNotificationServiceExtension'
		});
	});

	it('writes the channel mapping for the extension', async () => {
		const manifest = await applyPlugin(emptyManifest(), { androidNotificationChannels: CHANNELS });

		const entries = metaData(manifest);
		expect(entries[NOTIFICATION_CHANNEL_KEY_META_DATA]).toBe('category');
		expect(JSON.parse(entries[NOTIFICATION_CHANNELS_META_DATA]!)).toEqual(CHANNELS!.channels);
	});

	it('updates the channel mapping in place on a repeated prebuild', async () => {
		const first = await applyPlugin(emptyManifest(), { androidNotificationChannels: CHANNELS });
		const second = await applyPlugin(first, {
			androidNotificationChannels: { customDataKey: 'type', channels: { alarm: 'alarm_v3' } }
		});

		const entries = metaData(second);
		expect(Object.keys(entries)).toHaveLength(3);
		expect(entries[NOTIFICATION_CHANNEL_KEY_META_DATA]).toBe('type');
		expect(JSON.parse(entries[NOTIFICATION_CHANNELS_META_DATA]!)).toEqual({ alarm: 'alarm_v3' });
	});

	it('removes the channel mapping when the option is dropped', async () => {
		const withChannels = await applyPlugin(emptyManifest(), { androidNotificationChannels: CHANNELS });
		const withoutChannels = await applyPlugin(withChannels);

		expect(Object.keys(metaData(withoutChannels))).toEqual([NOTIFICATION_SERVICE_EXTENSION_META_DATA]);
	});
});
