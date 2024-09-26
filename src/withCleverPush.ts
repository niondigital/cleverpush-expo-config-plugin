import { ConfigPlugin } from '@expo/config-plugins';
import { NCE_FILES, NCE_TARGET_NAME, NSE_FILES, NSE_TARGET_NAME } from './constants';

import { CleverPushPluginProps } from './types/types';
import { withAppGroup } from './withAppGroup';
import { withEASExtraConfig } from './withEASExtraConfig';
import { withExtensionInXcodeProject } from './withExtensionInXcodeProject';
import { withIosExtensionFiles } from './withIosExtensionFiles';
import { withPodFiles } from './withPodFiles';

const withCleverPush: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	// Set default props
	props = {
		includeContentExtension: true,
		...props,
	};

	config = withAppGroup(config, props);

	// Copies the Notification Service Extension files to the iOS project and registers the extension in Xcode
	config = withIosExtensionFiles(config, { extensionName: NSE_TARGET_NAME, files: NSE_FILES });
	config = withExtensionInXcodeProject(config, { targetName: NSE_TARGET_NAME, files: NSE_FILES });

	if (props.includeContentExtension) {
		// Copies the Notification Content Extension files to the iOS project and registers the extension in Xcode
		config = withIosExtensionFiles(config, { extensionName: NCE_TARGET_NAME, files: NCE_FILES });
		config = withExtensionInXcodeProject(config, { targetName: NCE_TARGET_NAME, files: NCE_FILES });
	}

	config = withPodFiles(config, props);
	config = withEASExtraConfig(config, props);

	return config;
};

export default withCleverPush;