# Current Folder Structure Analysis

## 📁 Current Structure

```
project-bolt-sb1-y4z8sygw/
├── project/                          ❌ DELETE - React/Vite project (not Angular)
│   ├── src/                          (React/TypeScript files)
│   └── package.json                  (Vite config)
│
├── railway-trdp-embedded/            ✅ KEEP - Main project folder
│   │
│   ├── angular-webapp/               ✅ KEEP - Your Angular project!
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── components/      (Dashboard, Login, Signals, etc.)
│   │   │   │   ├── guards/          (Auth guard)
│   │   │   │   └── services/        (API, Auth, Binary Protocol)
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── styles.css
│   │   ├── angular.json
│   │   ├── package.json
│   │   ├── proxy.conf.json          (API proxy config)
│   │   └── tsconfig.json
│   │
│   ├── dev-server/                   ✅ KEEP - Mock API server for development
│   │   ├── server.js                 (Express server with API endpoints)
│   │   └── package.json
│   │
│   ├── webapp/                       ❌ DELETE - Vue.js project (not Angular)
│   │   ├── node_modules/            (Vue dependencies)
│   │   ├── dist/                    (Vue build output)
│   │   └── package.json             (Vue config)
│   │
│   ├── firmware/                     ❌ DELETE - Embedded C code (not needed for Angular)
│   │   ├── src/                     (C source files)
│   │   └── include/                 (C header files)
│   │
│   ├── tools/                        ❌ DELETE - Build tools for firmware
│   │
│   ├── webapp.zip                    ❌ DELETE - Archive file
│   │
│   ├── *.md files (20+ files)        ⚠️  KEEP ONE - Keep only README.md, delete rest
│   │   - BUILD_AND_DEPLOY_GUIDE.md
│   │   - CHANGELOG.md
│   │   - COMMUNICATION_PROTOCOL.md
│   │   - DEPLOYMENT.md
│   │   - FEATURES.md
│   │   - README.md                   ✅ KEEP THIS ONE
│   │   - ... (many more)
│   │
│   ├── *.txt files                   ❌ DELETE - Documentation files
│   │   - CHEAT_SHEET.txt
│   │   - FOR_EMBEDDED_ENGINEER.txt
│   │   - PROJECT_STRUCTURE.txt
│   │   - ... (more)
│   │
│   ├── *.bat files                   ❌ DELETE - Windows scripts
│   │   - START_APPLICATION.bat
│   │   - START_DEV_SERVER.bat
│   │   - START_SERVER_PRODUCTION.bat
│   │
│   ├── *.sh files                    ❌ DELETE - Shell scripts
│   │   - START_APPLICATION.sh
│   │   - START_DEV_SERVER.sh
│   │   - create-deployment-package.sh
│   │
│   └── POSTMAN_COLLECTION.json       ⚠️  OPTIONAL - Keep if you use Postman
│
└── *.zip files (root level)          ❌ DELETE - Archive files
    - railway-trdp-embedded.zip
    - railway-trdp-embedded (2).zip
```

## ✅ What to KEEP for Angular Project

1. **`railway-trdp-embedded/angular-webapp/`** - Your Angular application
2. **`railway-trdp-embedded/dev-server/`** - Mock API server for development
3. **`railway-trdp-embedded/README.md`** - Main documentation (we'll update it)

## ❌ What to DELETE

1. **`project/`** folder - React/Vite project
2. **`railway-trdp-embedded/webapp/`** - Vue.js project
3. **`railway-trdp-embedded/firmware/`** - Embedded C code
4. **`railway-trdp-embedded/tools/`** - Firmware build tools
5. **All documentation files** except README.md (20+ .md files)
6. **All .txt files** (documentation)
7. **All .bat and .sh scripts**
8. **All .zip files**
9. **`POSTMAN_COLLECTION.json`** (optional - keep if needed)

## 📋 Clean Structure After Cleanup

```
railway-trdp-embedded/
├── angular-webapp/          ✅ Angular project
│   ├── src/
│   ├── angular.json
│   ├── package.json
│   └── ...
│
├── dev-server/               ✅ Mock API server
│   ├── server.js
│   └── package.json
│
└── README.md                 ✅ Updated documentation
```
