#import "NotificationViewController.h"
#import <UserNotifications/UserNotifications.h>
#import <UserNotificationsUI/UserNotificationsUI.h>

@interface NotificationViewController () <UNNotificationContentExtension>

@end

@implementation NotificationViewController

- (void)viewDidLoad {
	[super viewDidLoad];
}

- (void)viewDidAppear:(BOOL)animated {
	[super viewDidAppear:animated];
}

- (void)didReceiveNotification:(UNNotification *)notification {
	[self cleverpushDidReceiveNotification:notification];
}

- (void)didReceiveNotificationResponse:(UNNotificationResponse *)response completionHandler:(void (^)(UNNotificationContentExtensionResponseOption))completion {
	[self cleverpushDidReceiveNotificationResponse:response completionHandler:completion];
}

@end
