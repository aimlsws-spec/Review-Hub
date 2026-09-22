package com.seawindsolution.viralkar

import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

// FlutterFragmentActivity, not FlutterActivity: the app lock's fingerprint prompt needs a FragmentActivity.
class MainActivity : FlutterFragmentActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, DeviceIntegrity.CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "check" -> result.success(DeviceIntegrity.check(this))
                    else -> result.notImplemented()
                }
            }
    }
}
