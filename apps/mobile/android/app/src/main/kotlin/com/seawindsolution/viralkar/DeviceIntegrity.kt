package com.seawindsolution.viralkar

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import java.io.File

/**
 * Looks for the usual signs that the phone is rooted or that the app is running on an emulator.
 *
 * This is a signal, not a verdict: anyone who controls the phone can hide these signs, so the backend treats the
 * answer as one input to a risk score and never as proof. It errs towards saying "no" when unsure, because a wrong
 * "yes" holds a real person's withdrawal for review.
 */
object DeviceIntegrity {
    const val CHANNEL = "com.seawindsolution.viralkar/device_integrity"

    /** Where a `su` binary is usually left by rooting tools. */
    private val SU_PATHS = listOf(
        "/system/bin/su",
        "/system/xbin/su",
        "/sbin/su",
        "/system/su",
        "/su/bin/su",
        "/data/local/su",
        "/data/local/bin/su",
        "/data/local/xbin/su",
        "/system/sd/xbin/su",
        "/system/bin/failsafe/su",
    )

    /** Root managers. Also declared under `<queries>` in the manifest, or Android 11 and later hides them from us. */

    val AUTOMATION_PACKAGES = listOf(
        "de.robv.android.xposed.installer",
        "org.meowcat.edxposed.manager",
        "org.lsposed.manager"
    )

    val ROOT_PACKAGES = listOf(
        "com.topjohnwu.magisk",
        "eu.chainfire.supersu",
        "com.noshufou.android.su",
        "com.koushikdutta.superuser",
        "com.thirdparty.superuser",
        "com.yellowes.su",
        "com.kingroot.kinguser",
        "com.kingo.root",
    )

    /** The parts of `android.os.Build` the emulator check reads, so the check itself does not depend on the phone. */
    data class BuildInfo(
        val fingerprint: String,
        val model: String,
        val manufacturer: String,
        val brand: String,
        val device: String,
        val product: String,
        val hardware: String,
    )

    fun check(context: Context): Map<String, Boolean> = mapOf(
        "isRooted" to hasRootMarkers(
            buildTags = Build.TAGS,
            fileExists = { path -> File(path).exists() },
            isInstalled = { name -> isInstalled(context, name) },
        ),

        "isAutomationDetected" to hasAutomationMarkers(
            fileExists = { path -> File(path).exists() },
            isInstalled = { name -> isInstalled(context, name) },
        ),
        "isEmulator" to looksLikeEmulator(
            BuildInfo(
                fingerprint = Build.FINGERPRINT.orEmpty(),
                model = Build.MODEL.orEmpty(),
                manufacturer = Build.MANUFACTURER.orEmpty(),
                brand = Build.BRAND.orEmpty(),
                device = Build.DEVICE.orEmpty(),
                product = Build.PRODUCT.orEmpty(),
                hardware = Build.HARDWARE.orEmpty(),
            ),
        ),
    )

    /** A build signed with the public test keys, a `su` binary, or a root manager installed. */
    fun hasRootMarkers(
        buildTags: String?,
        fileExists: (String) -> Boolean,
        isInstalled: (String) -> Boolean,
    ): Boolean {
        if (buildTags?.contains("test-keys") == true) return true
        if (SU_PATHS.any { runCatching { fileExists(it) }.getOrDefault(false) }) return true
        return ROOT_PACKAGES.any { runCatching { isInstalled(it) }.getOrDefault(false) }
    }

    /** The names the Android emulator, Genymotion and similar tools give themselves. */

    fun hasAutomationMarkers(
        fileExists: (String) -> Boolean,
        isInstalled: (String) -> Boolean,
    ): Boolean {
        val automationPaths = listOf(
            "/data/local/tmp/frida-server",
            "/data/local/tmp/re.frida.server"
        )
        if (automationPaths.any { runCatching { fileExists(it) }.getOrDefault(false) }) return true
        return AUTOMATION_PACKAGES.any { runCatching { isInstalled(it) }.getOrDefault(false) }
    }

    fun looksLikeEmulator(build: BuildInfo): Boolean {
        val fingerprint = build.fingerprint.lowercase()
        val model = build.model.lowercase()
        val product = build.product.lowercase()
        val hardware = build.hardware.lowercase()

        return fingerprint.startsWith("generic") ||
            fingerprint.contains("emulator") ||
            fingerprint.contains("sdk_gphone") ||
            model.contains("emulator") ||
            model.contains("android sdk built for") ||
            model.contains("sdk_gphone") ||
            build.manufacturer.lowercase().contains("genymotion") ||
            hardware == "goldfish" ||
            hardware == "ranchu" ||
            product.contains("sdk_gphone") ||
            product == "sdk" ||
            product == "google_sdk" ||
            (build.brand.lowercase().startsWith("generic") && build.device.lowercase().startsWith("generic"))
    }

    private fun isInstalled(context: Context, packageName: String): Boolean = try {
        context.packageManager.getPackageInfo(packageName, 0)
        true
    } catch (_: PackageManager.NameNotFoundException) {
        false
    }
}
