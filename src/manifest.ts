import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  name: 'kk-ext',
  description: 'A chrome extension boilerplate built by create-chrome-ext',
  version: '2.0.3',
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
      "run_at": "document_end",
    },
  ],
  web_accessible_resources: [
    {
      resources: ['js/*','img/*'],
      "matches": ["<all_urls>"],
    },
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; script-src-elem 'self' 'unsafe-inline' https://corp.onlinesbi.sbi"
},
  host_permissions:["https://indusdirect.indusind.com/*","<all_urls>"],
  permissions: [
    "webRequest",
    "webNavigation",
    "declarativeNetRequest",
    "tabs",
    "activeTab",
    "storage",
    "contextMenus",
    "scripting"
  ]
})
