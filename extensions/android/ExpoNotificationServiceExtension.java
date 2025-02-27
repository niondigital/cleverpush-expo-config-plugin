package com.niondigital.cleverpush;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.cleverpush.NotificationCategory;
import com.cleverpush.NotificationReceivedEvent;
import com.cleverpush.NotificationServiceExtension;

import com.niondigital.cleverpush.R;

public class ExpoNotificationServiceExtension implements NotificationServiceExtension {
	@Override
	public void onNotificationReceived(NotificationReceivedEvent event) {
		// call `event.preventDefault()` to not display notification
		// event.preventDefault();

		// to prevent the `default` notification channel creation, use `event.getNotification().setNotificationChannel()`
        /*if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            NotificationChannel channel;
            String channelId = "channel_id"; // replace with your desired channel id
            CharSequence channelName = "Channel_Name"; // replace with your desired channel name
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            channel = new NotificationChannel(channelId, channelName, importance);
            event.getNotification().setNotificationChannel(channel);
        }*/

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
