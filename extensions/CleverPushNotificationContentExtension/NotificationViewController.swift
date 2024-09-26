import UIKit
import UserNotifications
import UserNotificationsUI
import CleverPush

class NotificationViewController: CPNotificationViewController, UNNotificationContentExtension {

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
    }

    func didReceive(_ notification: UNNotification) {
        cleverpushDidReceiveNotification(notification)
    }

    func didReceive(_ response: UNNotificationResponse, completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void) {
        cleverpushDidReceiveNotificationResponse(response, completionHandler: completion)
    }
}