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
- `androidNotificationChannels` (optional): posts Android pushes on notification channels the app defines, so they get the channel's importance, sound and vibration. See [Android notification channels](#android-notification-channels).

# Android notification channels

Without further setup, the CleverPush SDK posts every Android push on its own default channel: default importance, system sound, no heads-up notification. `soundFilename` of the send API doesn't change that, CleverPush documents it as iOS-only and doesn't include it in Android payloads.

With `androidNotificationChannels`, the notification service extension posts a push on a channel of your app instead. It picks the channel from a value in the push's `customData`.

## Setup

1. Create the channels in your app, e.g. with `setNotificationChannelAsync` of `expo-notifications`. The extension only uses existing channels and never creates one.
2. Send the channel id in `customData` of the push, e.g. `"customData": { "notificationChannel": "orders" }`. Avoid a plain `channel` key: in CleverPush, a channel is the project the push is sent from.
3. Tell the plugin which `customData` key to read:

```json
{
  "expo": {
    "plugins": [["@niondigital/cleverpush-expo-config-plugin", { "androidNotificationChannels": { "customDataKey": "notificationChannel" } }]]
  }
}
```

The value is used as the channel id directly. If your pushes already carry a value that isn't a channel id, such as a type, map it with `channels`. Values without an entry are still used as the channel id directly:

```json
{
  "androidNotificationChannels": {
    "customDataKey": "type",
    "channels": { "order_shipped": "orders", "chat_message": "messages" }
  }
}
```

If the value is missing or no channel with that id exists, the push stays on the default channel. An invalid option fails the prebuild.

## Custom sounds

A channel's sound has to be an Android raw resource, because the system plays it, not your app. Add the files with the `sounds` option of `expo-notifications`, which copies them to `res/raw`, and reference them by file name when you create the channel (`sound: 'alert.wav'`). For many files, the list can be built from a folder in `app.config.ts`:

```ts
const soundsDir = './assets/notification-sounds';
const sounds = fs.readdirSync(soundsDir).map((file) => `${soundsDir}/${file}`);
// plugins: [['expo-notifications', { sounds }], …]
```

File names must be valid resource names (lowercase letters, digits, underscores). New sounds need a new native build.

## Things to keep in mind

- Android never raises the importance or changes the sound or vibration of an existing channel. To change them, create a channel with a new id, map the old `customData` value to it with `channels`, and delete the old channel. Never reuse a deleted id: Android restores a deleted channel's settings when the same id is created again.
- The app creates its channels at runtime. After an update that introduces a new channel id, pushes fall back to the default channel until the app has run once.
- Only string values in `customData` are matched. A number arrives as e.g. `1.0`.
- The SDK sets the description of the chosen channel to its name on every push. Sound and importance stay untouched.
- The per-notification presentation options of the CleverPush Android SDK 1.35.37+ (`shouldShowBanner`, `shouldPlaySound`) move a push to SDK-owned channels and override this option. Don't combine them.

## CleverPush notification categories

Categories configured in the CleverPush dashboard keep working unchanged and can be used side by side. A push that carries a category uses the category's channel, because the SDK gives the category precedence over the channel set by the extension.

For channels with a custom sound, categories are less reliable than app channels:

- The sender has to put the category **id** into each push (`category`), and the id differs per CleverPush channel and therefore per environment. CleverPush drops a category given by name.
- The SDK stores a category's sound in the Android channel as a numeric resource id (`android.resource://<package>/<id>`) and only recreates the channel when the category changes. Resource ids shift between app builds, so after an app update the channel can play a different raw resource of the app.
- A category's vibration settings aren't applied to its channel.

Channels created by the app reference their sound by name (`raw/<name>`), support importance, vibration pattern, lights, badge and lock screen visibility, and are versioned together with the app.
