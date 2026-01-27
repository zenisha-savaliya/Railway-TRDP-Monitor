# Railway TRDP Monitor - Embedded System

Complete embedded web server application for Railway Train Real-time Data Protocol (TRDP) monitoring.

## 🚂 System Overview

**Architecture:** Web UI ↔ Hardware (C Server) ↔ TRDP Devices

**Hardware Requirements:**
- RAM: 200MB (uses ~50MB)
- Flash: 4GB (uses ~100MB)
- Ethernet interface
- SD Card support
- TRDP network interface (MVB/TCN/ETB)

## 📁 Project Structure

```
railway-trdp-embedded/
├── firmware/                    # Embedded C code
│   ├── src/
│   │   ├── main.c              # Main entry point
│   │   ├── webserver.c         # HTTP web server
│   │   ├── trdp_interface.c    # TRDP protocol handler
│   │   ├── config_manager.c    # Configuration storage
│   │   ├── data_logger.c       # Data logging system
│   │   └── file_manager.c      # File operations
│   ├── include/                # Header files
│   └── Makefile
├── webapp/                      # Frontend application
│   ├── src/
│   │   ├── index.html
│   │   ├── app.js              # Vue.js application
│   │   └── style.css
│   └── build/                  # Compiled static files
└── tools/                       # Build and flash tools
    ├── build.sh
    └── flash_update.sh
```

## 🛠️ Build Instructions

### 1. Build Firmware
```bash
cd firmware
make clean
make all
```

### 2. Build Web Application
```bash
cd webapp
npm install
npm run build
```

### 3. Flash to Hardware
```bash
./tools/flash_update.sh
```

## 🌐 Access Web Interface

After flashing, access at: `http://<device-ip>/`

Default credentials:
- Username: `admin`
- Password: `railway123`

## ⚙️ Configuration

Edit `firmware/config/default_config.json` before building to set:
- Network settings (IP, subnet, gateway)
- TRDP interface parameters
- Data logging intervals
- Storage paths

## 📊 Features

✅ User authentication
✅ Dynamic UI based on configuration
✅ Multiple subsystem management (HVAC, Traction, Brake, etc.)
✅ Real-time TRDP data monitoring
✅ Live graphical visualization
✅ Automatic data logging (hourly/daily)
✅ 3-day data retention
✅ File download capability
✅ OTA firmware updates
✅ Stores in 4GB flash, runs on 200MB RAM

## 📝 License

Proprietary - Railway Systems
