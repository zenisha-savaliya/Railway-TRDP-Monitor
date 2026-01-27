# Railway TRDP Monitor - Angular Application

This is the Angular version of the Railway TRDP Monitor web application with all existing functionality from the Vue.js version.

## Features

- **Authentication**: Login system with token-based authentication
- **Live Data Monitoring**: Real-time data stream from TRDP subsystems (Binary Protocol)
- **Write Data**: Send data to hardware subsystems (Binary Protocol)
- **Real-time Graphs**: Chart.js integration for data visualization
- **Subsystem Configuration**: Manage up to 10 subsystems (enforced limit) - JSON format
- **Signal Configuration**: Configure TRDP signals - JSON format
- **Device Configuration**: Network and device settings
- **File Management**: Download TRDP data files
- **Firmware Updates**: Upload and update device firmware

## Data Format

### Configuration Data (JSON)
- **Subsystems**: `/api/subsystems` - JSON format
- **Signals**: `/api/signals` - JSON format
- **Device Config**: JSON format

### Real-time Data (Binary Protocol)
- **Live Data**: `/api/livedata` - Binary format (application/octet-stream)
- **Write Data**: `/api/writedata` - Binary format (application/octet-stream)
- **Batch Write**: `/api/writedata/batch` - Binary format (application/octet-stream)

### Binary Protocol Format

The binary protocol uses a custom format for efficient data transmission:

**Live Data Packet:**
```
[Packet Type: 1 byte][Subsystem ID: 1 byte][Signal Count: 2 bytes]
[Signal Data: Variable]
  - Signal ID: 2 bytes
  - Data Type: 1 byte
  - Value: Variable (INT32/UINT32/FLOAT32: 4 bytes, BOOLEAN: 1 byte)
```

**Write Data Packet:**
```
[Packet Type: 1 byte][Subsystem ID: 1 byte][Signal Count: 2 bytes]
[Signal Data: Variable]
  - Signal ID: 2 bytes
  - Data Type: 1 byte
  - Value: Variable
```

**Data Type Codes:**
- `0x01`: INT32
- `0x02`: UINT32
- `0x03`: FLOAT32
- `0x04`: BOOLEAN

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (will be installed with dependencies)

## Installation

1. Navigate to the project directory:
```bash
cd railway-trdp-embedded/angular-webapp
```

2. Install dependencies:
```bash
npm install
```

## Development

Run the development server:
```bash
npm start
```

The application will be available at `http://localhost:4200`

## Build

Build for production:
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
angular-webapp/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── login/          # Login component
│   │   │   ├── dashboard/      # Main dashboard with sidebar
│   │   │   ├── live-data/     # Live data monitoring (Binary)
│   │   │   ├── write-data/     # Write data to hardware (Binary)
│   │   │   ├── graphs/         # Real-time graphs (Binary)
│   │   │   ├── subsystems/    # Subsystem configuration (JSON, 10 limit enforced)
│   │   │   ├── signals/       # Signal configuration (JSON)
│   │   │   ├── device-config/ # Device configuration
│   │   │   ├── files/          # File management
│   │   │   └── firmware/       # Firmware updates
│   │   ├── services/
│   │   │   ├── api.service.ts  # API service for backend communication
│   │   │   ├── auth.service.ts # Authentication service
│   │   │   └── binary-protocol.service.ts # Binary protocol encoding/decoding
│   │   ├── guards/
│   │   │   └── auth.guard.ts   # Route protection
│   │   └── app.module.ts       # Main application module
│   ├── styles.css              # Global styles
│   └── index.html
├── angular.json
├── package.json
└── tsconfig.json
```

## Key Features

### Subsystem Configuration
- **Maximum 10 subsystems enforced**: The application prevents adding more than 10 subsystems
- Configuration can be downloaded and uploaded as JSON
- When uploading, if the file contains more than 10 subsystems, only the first 10 are loaded
- **Format**: JSON

### Signal Configuration
- **Format**: JSON
- Only shows signals for configured subsystems
- Access type is set to READ/WRITE by default (READ and WRITE options removed)

### Binary Protocol
- **Live Data**: Automatically decodes binary data using signal mapping
- **Write Data**: Encodes data to binary format before sending
- **Batch Write**: Efficient batch operations for multiple signals
- Supports INT32, UINT32, FLOAT32, and BOOLEAN data types

### API Integration
- Configuration endpoints use JSON format
- Real-time data endpoints use binary format
- Token-based authentication with automatic token management
- Error handling and automatic logout on 401 errors

### Real-time Updates
- Live data polling every 1 second (binary protocol)
- Real-time graph updates
- Connection status monitoring

## Default Credentials

- Username: `admin`
- Password: `railway123`

## API Endpoints

### Configuration (JSON)
- `POST /api/login` - Authentication
- `GET /api/subsystems` - Get subsystems (JSON)
- `POST /api/subsystems` - Save subsystems (JSON)
- `GET /api/signals` - Get signals (JSON)
- `POST /api/signals` - Save signals (JSON)

### Real-time Data (Binary)
- `GET /api/livedata` - Live data stream (Binary, Accept: application/octet-stream)
- `POST /api/writedata` - Write single signal (Binary, Content-Type: application/octet-stream)
- `POST /api/writedata/batch` - Write multiple signals (Binary, Content-Type: application/octet-stream)

### Other
- `GET /api/files` - File management
- `POST /api/firmware` - Firmware upload

## Notes

- The application uses Chart.js for graph visualization
- All forms use Angular's reactive forms and template-driven forms
- The UI matches the Vue.js version for consistency
- The 10 subsystem limit is enforced in both the UI and when loading configuration files
- Binary protocol is used for efficient real-time data transmission
- JSON is used for configuration data for easy editing and debugging
