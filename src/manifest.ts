import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  name: 'chrome-ext',
  description: 'A chrome extension boilerplate built by create-chrome-ext',
  version: '0.0.0',
  manifest_version: 3,
  icons: {
    48: 'img/logo-48.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: 'img/logo-48.png',
  },
  options_page: 'options.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['*://*/*'],
      js: ['src/content/index.ts'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['js/*','img/*'],
      "matches": ["<all_urls>"],
    },
  ],
  permissions: [
    "webRequest",
    "declarativeNetRequest",
    "tabs",
    "storage",
    "contextMenus"
  ],
  "host_permissions": [
    "*://*.axisbank.co.in/*",
  ]
})
