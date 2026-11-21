export type AndroidNotificationChannelsProps = {
	/** Key in the push's `customData` whose value selects the channel, e.g. `notificationChannel`. */
	customDataKey: string;
	/**
	 * Optional map from a `customData` value to the id of an Android notification channel the app has
	 * created. Values without an entry are used as the channel id directly.
	 */
	channels?: Record<string, string>;
};

export type CleverPushPluginProps = {
	includeContentExtension?: boolean;
	androidNotificationChannels?: AndroidNotificationChannelsProps;
};
