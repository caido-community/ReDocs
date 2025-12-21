import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

// This is the entry point for the frontend plugin
export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);

  // Load the PrimeVue component library
  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  // Provide the FrontendSDK
  app.use(SDKPlugin, sdk);

  // Create the root element for the app
  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  // Set the ID of the root element to match the plugin ID
  // This is necessary to prevent styling conflicts between plugins
  root.id = `plugin--redocs`;

  // Mount the app to the root element
  app.mount(root);

  // Add the page to the navigation
  sdk.navigation.addPage("/redocs", {
    body: root,
  });

  // Add a sidebar item with Font Awesome icon for API documentation
  sdk.sidebar.registerItem("ReDocs", "/redocs", {
    icon: "fas fa-file-import",
  });
};
