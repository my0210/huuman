import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "life.huuman.app",
  appName: "huuman",
  webDir: "public",

  server: {
    // Switch to https://app.huuman.life once the custom domain is configured
    url: "https://huuman.vercel.app",
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
