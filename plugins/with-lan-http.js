const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

function withLanHttp(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest["uses-permission"] = manifest["uses-permission"] ?? [];
    const permissions = new Set(
      manifest["uses-permission"].map((item) => item.$["android:name"]),
    );
    for (const name of [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
    ]) {
      if (!permissions.has(name)) {
        manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.$["android:usesCleartextTraffic"] = "true";
    app.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    return mod;
  });

  config = withDangerousMod(config, [
    "android",
    async (mod) => {
      const dir = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/res/xml",
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "network_security_config.xml"), NETWORK_SECURITY_XML);
      return mod;
    },
  ]);

  return config;
}

module.exports = withLanHttp;
