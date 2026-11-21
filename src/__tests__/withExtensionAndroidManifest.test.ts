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
	customDataKey: 'type',
	channels: { order_shipped: 'orders', chat_message: 'messages' }
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
		expect(entries[NOTIFICATION_CHANNEL_KEY_META_DATA]).toBe('type');
		expect(JSON.parse(entries[NOTIFICATION_CHANNELS_META_DATA]!)).toEqual(CHANNELS!.channels);
	});

	it('writes only the key when the values are used as channel ids directly', async () => {
		const manifest = await applyPlugin(emptyManifest(), {
			androidNotificationChannels: { customDataKey: 'channel' }
		});

		const entries = metaData(manifest);
		expect(entries[NOTIFICATION_CHANNEL_KEY_META_DATA]).toBe('channel');
		expect(entries).not.toHaveProperty(NOTIFICATION_CHANNELS_META_DATA);
	});

	it('updates the channel mapping in place on a repeated prebuild', async () => {
		const first = await applyPlugin(emptyManifest(), { androidNotificationChannels: CHANNELS });
		const second = await applyPlugin(first, {
			androidNotificationChannels: { customDataKey: 'kind', channels: { reminder: 'reminders' } }
		});

		const entries = metaData(second);
		expect(Object.keys(entries)).toHaveLength(3);
		expect(entries[NOTIFICATION_CHANNEL_KEY_META_DATA]).toBe('kind');
		expect(JSON.parse(entries[NOTIFICATION_CHANNELS_META_DATA]!)).toEqual({ reminder: 'reminders' });
	});

	it('removes the mapping when only the channels are dropped', async () => {
		const withChannels = await applyPlugin(emptyManifest(), { androidNotificationChannels: CHANNELS });
		const withoutChannels = await applyPlugin(withChannels, {
			androidNotificationChannels: { customDataKey: 'type' }
		});

		expect(metaData(withoutChannels)).not.toHaveProperty(NOTIFICATION_CHANNELS_META_DATA);
	});

	it('removes the channel mapping when the option is dropped', async () => {
		const withChannels = await applyPlugin(emptyManifest(), { androidNotificationChannels: CHANNELS });
		const withoutChannels = await applyPlugin(withChannels);

		expect(Object.keys(metaData(withoutChannels))).toEqual([NOTIFICATION_SERVICE_EXTENSION_META_DATA]);
	});

	it.each([
		['an empty customDataKey', { customDataKey: ' ' }, /customDataKey/],
		[
			'a channels value that is no object',
			{ customDataKey: 'type', channels: 'orders' },
			/channels must be an object/
		],
		['an array of channels', { customDataKey: 'type', channels: ['orders'] }, /channels must be an object/],
		[
			'an empty channel id',
			{ customDataKey: 'type', channels: { order_shipped: '' } },
			/channels\["order_shipped"\]/
		],
		[
			'a non-string channel id',
			{ customDataKey: 'type', channels: { order_shipped: 2 } },
			/channels\["order_shipped"\]/
		]
	])('fails the prebuild on %s', async (_, androidNotificationChannels, message) => {
		await expect(
			applyPlugin(emptyManifest(), {
				androidNotificationChannels:
					androidNotificationChannels as unknown as CleverPushPluginProps['androidNotificationChannels']
			})
		).rejects.toThrow(message);
	});
});
