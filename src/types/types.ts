export type CleverPushPluginProps = {
	/**
	 * (optional) Used to configure Apple Team ID. You can find your Apple Team ID by running expo credentials:manager e.g: "91SW8A37CR"
	 */
	devTeam?: string;

	/**
	 * (optional) Target IPHONEOS_DEPLOYMENT_TARGET value to be used when adding the iOS NSE. A deployment target is nothing more than
	 * the minimum version of the operating system the application can run on. This value should match the value in your Podfile e.g: "12.0".
	 */
	iPhoneDeploymentTarget?: string;
};

export const CLEVERPUSH_PLUGIN_PROPS: string[] = ['devTeam', 'iPhoneDeploymentTarget'];
