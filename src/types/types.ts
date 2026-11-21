export type AndroidNotificationChannelsProps = {
	/** Key in the push's `customData` whose value selects the channel, e.g. `category`. */
	customDataKey: string;
	/** Maps a `customData` value to the id of an Android notification channel the app has created. */
	channels: Record<string, string>;
};

export type CleverPushPluginProps = {
	includeContentExtension?: boolean;
	androidNotificationChannels?: AndroidNotificationChannelsProps;
};
