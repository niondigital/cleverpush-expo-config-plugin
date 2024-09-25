import { ConfigPlugin } from '@expo/config-plugins';

import { CleverPushPluginProps } from './types/types';
import { withAppGroup } from './withAppGroup';
import { withCleverPushNSEFiles } from './withCleverPushNSEFiles';
import { withEASExtraConfig } from './withEASExtraConfig';
import { withNSEInXcodeProject } from './withNSEInXcodeProject';
import { withPodFiles } from './withPodFiles';

const withCleverPush: ConfigPlugin<CleverPushPluginProps> = (config, props) => {
	config = withAppGroup(config, props);
	config = withCleverPushNSEFiles(config, props);
	config = withNSEInXcodeProject(config, props);
	config = withPodFiles(config, props);
	config = withEASExtraConfig(config, props);

	return config;
};

export default withCleverPush;