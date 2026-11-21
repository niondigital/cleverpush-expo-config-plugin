# expo-cleverpush

Expo module with config plugin to add CleverPush extensions on prebuild

# API documentation

- [Documentation for the main branch](https://github.com/expo/expo/blob/main/docs/pages/versions/unversioned/sdk/www.nion-digital.com.md)
- [Documentation for the latest stable release](https://docs.expo.dev/versions/latest/sdk/www.nion-digital.com/)

# Installation in managed Expo projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, please follow the installation instructions in the [API documentation for the latest stable release](#api-documentation). If you follow the link and there is no documentation available then this library is not yet usable within managed projects &mdash; it is likely to be included in an upcoming Expo SDK release.

# Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.

### Add the package to your npm dependencies

```
npm install expo-cleverpush --save-dev
```

Please make sure to also add the react native package to your project for using die CleverPush React Native SDK.
```
npm install cleverpush-react-native --save
```

## Thanks

Inspired by and in parts based on the OneSignal Expo Plugin.


# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide]( https://github.com/expo/expo#contributing).

# Configuration

```json
{
  "expo": {
    "ios": { "deploymentTarget": "17.0" },
    "plugins": [["@niondigital/cleverpush-expo-config-plugin", { "includeContentExtension": true }]]
  }
}
```

- `includeContentExtension` (default `true`): also adds the Notification Content Extension. Changing this option afterwards requires `npx expo prebuild --clean`, a prebuild without `--clean` keeps the targets and Podfile entries of the previous run.
- The extension targets take the iOS deployment target of the app target. Raise it through `expo.ios.deploymentTarget` in the app config (Expo SDK 56+), the extensions follow automatically. The deprecated `ios.deploymentTarget` option of `expo-build-properties` is not picked up reliably: it only reaches the extensions when `expo-build-properties` is listed after this plugin.
- `androidNotificationChannels` (optional): lets the app define the Android notification channels for its pushes in code, as a complement to CleverPush notification categories, which keep working unchanged. Without either, the CleverPush SDK puts every push on its own default channel with the system sound; `soundFilename` is not delivered to Android at all.

  ```json
  {
    "androidNotificationChannels": {
      "customDataKey": "category",
      "channels": { "locked_movement": "locked_movement_v2", "battery_low": "battery_v2" }
    }
  }
  ```

  The Android notification service extension reads the push's `customData[customDataKey]` and posts the push on the mapped channel. The app has to create these channels itself (e.g. with `setNotificationChannelAsync` of `expo-notifications`), the extension never creates one. If the value, its mapping or the channel is missing, the push stays on the default channel. Android never raises the importance or changes the sound of an existing channel, so changing either means a new channel id.

  **Why app-defined channels next to CleverPush categories.** Categories configured in the CleverPush dashboard offer importance, vibration, lights, badge and lock screen visibility, but two properties make them unreliable for channels with a custom sound:

  - The sender has to put the category **id** into each push (`category`), which differs per CleverPush channel and therefore per environment. A category name is discarded.
  - The SDK stores the category's sound in the Android channel as a numeric resource id (`android.resource://<package>/<id>`) and only recreates the channel when the category changes. Resource ids shift between app builds, so after an app update the channel can play a different raw resource of the app.

  Channels created by the app (e.g. by `expo-notifications`) reference the sound by name (`raw/<name>`), support the same settings as a category and are versioned together with the app. The sender only needs a stable value in `customData`.

  **Relation to categories.** Both can be used side by side. A push that carries a CleverPush category uses the category's channel, because the SDK gives the category precedence over the channel set by the extension; the mapping only applies to pushes without a category.
