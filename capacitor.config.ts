import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "life.huuman.app",
  appName: "huuman",
  webDir: "public",

  server: {
    url: "https://app.huuman.life",
    cleartext: false,
  },

  ios: {
    scheme: "huuman",
    contentInset: "always",
    preferredContentMode: "mobile",
    backgroundColor: "#09090b",
  },
};

export default config;
