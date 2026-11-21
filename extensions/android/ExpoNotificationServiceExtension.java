package com.niondigital.cleverpush;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.util.Map;

import com.cleverpush.Notification;
import com.cleverpush.NotificationCategory;
import com.cleverpush.NotificationReceivedEvent;
import com.cleverpush.NotificationServiceExtension;

import com.niondigital.cleverpush.R;

public class ExpoNotificationServiceExtension implements NotificationServiceExtension {
	private static final String TAG = "ExpoNotificationServiceExtension";

	// Written by the config plugin (see src/constants.ts); keep both names in sync with it.
	private static final String CHANNEL_KEY_META_DATA = "com.niondigital.cleverpush.notification_channel_key";
	private static final String CHANNELS_META_DATA = "com.niondigital.cleverpush.notification_channels";

	@Override
	public void onNotificationReceived(NotificationReceivedEvent event) {
		// Without an explicit channel the SDK posts every push on its own "Default" channel, so app-defined
		// channels with their own importance and sound would never be used.
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			NotificationChannel channel = resolveAppChannel(event.getContext().getApplicationContext(), event.getNotification());
			if (channel != null) {
				event.getNotification().setNotificationChannel(channel);
			}
		}

		// modify notification
		event.getNotification().setExtender(new NotificationCompat.Extender() {
			@Override
			public NotificationCompat.Builder extend(NotificationCompat.Builder builder) {
				NotificationCategory category = event.getNotification().getCategory();

				if (category == null || category.getForegroundColor() == null || category.getForegroundColor().length() == 0) {
					builder.setColor(getNotificationColor(event.getContext().getApplicationContext()));
				}

				builder.setSmallIcon(getNotificationIcon(event.getContext().getApplicationContext()));
				return builder;
			}
		});
	}

	/**
	 * Looks up the app channel for the push's customData value: the channel mapped to the value, or else the
	 * channel whose id equals the value. Returns null whenever the value or the channel is missing, so the push
	 * keeps the SDK's default channel instead of being dropped.
	 *
	 * Only existing channels are used: their importance and sound are defined by the app. The SDK still calls
	 * setSound() and createNotificationChannel() on the returned channel, but for a channel that already exists
	 * Android only updates its name and description, never its sound or importance.
	 */
	@RequiresApi(api = Build.VERSION_CODES.O)
	private static NotificationChannel resolveAppChannel(Context context, Notification notification) {
		try {
			ApplicationInfo appInfo = context.getPackageManager()
				.getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
			if (appInfo.metaData == null) {
				return null;
			}

			// Android stores a <meta-data> value such as "1" or "true" as int or boolean, so the key is read untyped.
			Object customDataKeyValue = appInfo.metaData.get(CHANNEL_KEY_META_DATA);
			String customDataKey = customDataKeyValue != null ? customDataKeyValue.toString() : null;
			String channelsJson = appInfo.metaData.getString(CHANNELS_META_DATA);
			Map<?, ?> customData = notification.getCustomData();
			if (customDataKey == null || customData == null) {
				return null;
			}

			Object value = customData.get(customDataKey);
			if (value == null) {
				return null;
			}

			String mappedChannelId = channelsJson != null ? new JSONObject(channelsJson).optString(value.toString(), null) : null;
			String channelId = mappedChannelId != null ? mappedChannelId : value.toString();

			NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
			NotificationChannel channel = notificationManager != null ? notificationManager.getNotificationChannel(channelId) : null;
			if (channel == null) {
				// Without a mapping entry, a value that isn't a channel id is expected and only worth a debug line.
				String message = "Notification channel " + channelId + " for " + value + " does not exist, using the default channel";
				if (mappedChannelId != null) {
					Log.w(TAG, message);
				} else {
					Log.d(TAG, message);
				}
			}
			return channel;
		} catch (Exception e) {
			Log.e(TAG, "Could not resolve the notification channel, using the default channel", e);
			return null;
		}
	}

	private static int getNotificationColor(Context context) {
		try {
			ApplicationInfo appInfo = context.getPackageManager()
				.getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);

			if (appInfo.metaData != null) {
				// int colorResId = appInfo.metaData.getInt("com.google.firebase.messaging.default_notification_color");
				// return ContextCompat.getColor(context, colorResId);

				return ContextCompat.getColor(context, R.color.notification_icon_color);
			}
		} catch (PackageManager.NameNotFoundException e) {
			e.printStackTrace();
		}

		// Return a default color if not found
		return Color.BLACK;
	}

	private static int getNotificationIcon(Context context) {
		try {
			ApplicationInfo appInfo = context.getPackageManager()
				.getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);

			if (appInfo.metaData != null) {
				return appInfo.metaData.getInt("com.google.firebase.messaging.default_notification_icon", 0);
			}
		} catch (PackageManager.NameNotFoundException e) {
			e.printStackTrace();
		}

		// Return a default icon if not found
		return android.R.drawable.ic_dialog_info;
	}
}
