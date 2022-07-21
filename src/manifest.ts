import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  name: 'chrome-ext',
  description: 'A chrome extension boilerplate built by create-chrome-ext',
  version: '0.0.0',
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-34.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
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
      resources: ['img/logo-16.png', 'img/logo-34.png', 'img/logo-48.png', 'img/logo-128.png','/js/*','/img/*','js/injected.js','js/vendor.1c9aa43f6bed1fff4f4b1656508073138.js','js/mib020821.js'],
      // resources: ['assets/*'],
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
    "*://*.baidu.com/*",
  ]
})
