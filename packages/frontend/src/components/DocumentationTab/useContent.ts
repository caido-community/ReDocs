interface Section {
  id: string;
  title: string;
}

export const useSections = () => {
  const sections: Section[] = [
    { id: "what-is-redocs", title: "What is ReDocs?" },
    { id: "quick-start", title: "Quick Start" },
    { id: "supported-formats", title: "Supported Formats" },
    { id: "authentication", title: "Authentication" },
    { id: "environment-variables", title: "Environment Variables" },
    { id: "troubleshooting", title: "Troubleshooting" },
    { id: "about", title: "About" },
  ];

  return { sections };
};

export const useDocContent = () => {
  const quickStartSteps = [
    {
      title: "1. Prepare Your File",
      content:
        "Postman: export collection as JSON. OpenAPI: save spec as JSON. Insomnia: Export to get JSON. Bruno: Share → Export as Postman or OpenAPI, then import that file here.",
    },
    {
      title: "2. Import to ReDocs",
      content:
        'Drag and drop your file onto the upload area, or click "Choose File" to browse for it.',
    },
    {
      title: "3. Select Requests",
      content:
        "Choose which API endpoints to import. You can select all or pick specific requests you want to test.",
    },
    {
      title: "4. Configure Authentication",
      content:
        "ReDocs detects authentication methods automatically. Provide your credentials or skip if not needed.",
    },
  ];

  const supportedFormats = [
    {
      title: "Postman Collections",
      color: "text-primary-400",
      items: [
        "Collection v2.1 format (.json)",
        "Environment variables support",
        "Folder organization preserved",
      ],
    },
    {
      title: "OpenAPI Specifications",
      color: "text-primary-400",
      items: [
        "OpenAPI 3.x (.json only)",
        "Swagger 2.0 (.json only)",
        "Security schemes detection",
      ],
    },
    {
      title: "Insomnia",
      color: "text-primary-400",
      items: [
        "Export (e.g. All Data or document) as JSON",
        "Requests and auth detected",
        "Import the exported file directly",
      ],
    },
    {
      title: "Bruno",
      color: "text-primary-400",
      items: [
        "OpenCollection YAML (.yaml, .yml): import directly",
        "Or Share → Export as Postman/OpenAPI, then import",
      ],
    },
    {
      title: "Postman Environments",
      color: "text-primary-400",
      items: [
        "Environment files (.json)",
        "Auto-detection of secrets",
        "Creates Caido environments",
      ],
    },
  ];

  const authMethods = [
    {
      title: "Bearer Token",
      description: "JWT tokens and API keys sent in Authorization header.",
    },
    {
      title: "Basic Authentication",
      description: "Username and password encoded in Authorization header.",
    },
    {
      title: "API Key",
      description: "API keys in custom headers like X-API-Key.",
    },
    {
      title: "Custom Headers",
      description: "Any custom authentication header you need.",
    },
  ];

  const troubleshootingItems = [
    {
      title: "File format not recognized",
      description:
        "Ensure your file is a valid JSON file. YAML files are not currently supported for OpenAPI specs.",
    },
    {
      title: "Sessions not appearing in Replay",
      description:
        "Check the Replay section in Caido and look for a collection named after your imported file. Try refreshing the page.",
    },
    {
      title: "Authentication not working",
      description:
        "Verify your credentials are correct and haven't expired. You can always add authentication manually in Replay.",
    },
  ];

  const aboutInfo = {
    name: "ReDocs",
    version: "1.0.3",
    description:
      "ReDocs helps security professionals quickly import API documentation into Caido for security testing.",
    author: {
      name: "Amr Elsagaei",
      website: "https://amrelsagaei.com",
      email: "info@amrelsagaei.com",
      linkedin: "https://www.linkedin.com/in/amrelsagaei",
      twitter: "https://x.com/amrelsagaei",
    },
  };

  return {
    quickStartSteps,
    supportedFormats,
    authMethods,
    troubleshootingItems,
    aboutInfo,
  };
};
