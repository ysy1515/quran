import UIKit
import Capacitor
import StoreKit
import CoreLocation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// Kept in this existing app target source so both Xcode configurations compile
// the bridge without relying on generated Capacitor plugin discovery.
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppReviewPlugin())
        bridge?.registerPluginInstance(QiblaCompassPlugin())
    }
}

@objc(AppReviewPlugin)
public class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openStoreReview", returnType: CAPPluginReturnPromise)
    ]

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard UIApplication.shared.applicationState == .active else {
                call.resolve(["requested": false])
                return
            }
            let scene = self.bridge?.viewController?.view.window?.windowScene
                ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
                    .first { $0.activationState == .foregroundActive }
            if let scene = scene, scene.activationState == .foregroundActive {
                if #available(iOS 16.0, *) {
                    AppStore.requestReview(in: scene)
                } else {
                    SKStoreReviewController.requestReview(in: scene)
                }
            } else {
                // The current AppDelegate lifecycle also supports a legacy window.
                SKStoreReviewController.requestReview()
            }
            // StoreKit decides whether to show the prompt and never reports a rating.
            call.resolve(["requested": true])
        }
    }

    @objc func openStoreReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Fixed destination: this bridge cannot open arbitrary URLs from JS.
            guard let url = URL(string: "https://apps.apple.com/app/id6767634410?action=write-review") else {
                call.resolve(["opened": false])
                return
            }
            UIApplication.shared.open(url, options: [:]) { opened in
                call.resolve(["opened": opened])
            }
        }
    }
}


// True north is required: a magnetic heading alone can point several degrees away.
@objc(QiblaCompassPlugin)
public class QiblaCompassPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "QiblaCompassPlugin"
    public let jsName = "QiblaCompass"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]
    private var manager: CLLocationManager?
    private var heading: CLHeading?
    private var position: CLLocation?

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard CLLocationManager.headingAvailable() else {
                call.reject("Compass unavailable")
                return
            }
            let manager = self.manager ?? CLLocationManager()
            self.manager = manager
            manager.delegate = self
            manager.desiredAccuracy = kCLLocationAccuracyBest
            manager.headingFilter = 1
            // The UI instructs the user to hold the phone upright in portrait.
            manager.headingOrientation = .portrait
            self.heading = nil
            self.position = nil
            manager.requestWhenInUseAuthorization()
            manager.startUpdatingLocation()
            manager.startUpdatingHeading()
            call.resolve()
        }
    }
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.manager?.stopUpdatingHeading()
            self.manager?.stopUpdatingLocation()
            self.heading = nil
            self.position = nil
            call.resolve()
        }
    }
    @objc func read(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard UIApplication.shared.applicationState == .active else {
                call.resolve(["valid": false])
                return
            }
            if let manager = self.manager,
               manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted {
                call.reject("Location permission denied")
                return
            }
            guard let heading = self.heading, let position = self.position,
                  heading.trueHeading >= 0, heading.headingAccuracy >= 0,
                  heading.headingAccuracy <= 20, position.horizontalAccuracy >= 0,
                  position.horizontalAccuracy <= 1000,
                  abs(heading.timestamp.timeIntervalSinceNow) < 10,
                  abs(position.timestamp.timeIntervalSinceNow) < 30 else {
                call.resolve(["valid": false])
                return
            }
            // iPad may present the portrait UI upside down; its screen top is the
            // opposite physical edge from Core Location's fixed portrait heading.
            let upsideDown = self.bridge?.viewController?.view.window?.windowScene?.interfaceOrientation == .portraitUpsideDown
            let screenHeading = (heading.trueHeading + (upsideDown ? 180 : 0)).truncatingRemainder(dividingBy: 360)
            call.resolve(["valid": true, "heading": screenHeading,
                          "accuracy": heading.headingAccuracy,
                          "lat": position.coordinate.latitude, "lng": position.coordinate.longitude,
                          "locationAccuracy": position.horizontalAccuracy])
        }
    }
    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        heading = newHeading
    }
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        position = locations.last
    }
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        position = nil
    }
    public func locationManagerShouldDisplayHeadingCalibration(_ manager: CLLocationManager) -> Bool { true }
}
