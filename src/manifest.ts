import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  name: 'chrome-ext',
  description: 'A chrome extension boilerplate built by create-chrome-ext',
  version: '2.0.0',
  manifest_version: 3,
  icons: {
    128: 'img/logo-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: 'img/logo-128.png',
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
    "activeTab",
    "storage",
    "contextMenus"
  ]
})
