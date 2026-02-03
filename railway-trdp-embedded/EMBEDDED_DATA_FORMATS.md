# Embedded Data Formats Specification

This document defines all read/write, graph, and API data formats used by the Railway TRDP web application. Use it to implement compatible firmware or gateway code.

**Byte order:** All multi-byte values use **little-endian** unless noted.

---

## 1. Binary Protocol (TRDP-style)

### 1.1 Packet Types (1 byte)

| Code | Constant | Description |
|------|----------|-------------|
| `0x01` | PACKET_TYPE_LIVE_DATA | Live/read data from device |
| `0x02` | PACKET_TYPE_WRITE_DATA | Single signal write |
| `0x03` | PACKET_TYPE_WRITE_BATCH | Batch write (multiple signals) |
| `0x04` | PACKET_TYPE_RESPONSE | Response packet |

### 1.2 Data Type Codes (1 byte)

| Code | Constant | Type | Size (bytes) |
|------|----------|------|--------------|
| `0x01` | DATA_TYPE_INT32 | INT32 | 4 |
| `0x02` | DATA_TYPE_UINT32 | UINT32 | 4 |
| `0x03` | DATA_TYPE_FLOAT32 | FLOAT32 | 4 |
| `0x04` | DATA_TYPE_BOOLEAN | BOOLEAN | 1 |

---

## 2. Read / Live Data Format (Device → Web)

**Use case:** Embedded device sends current signal values (e.g. over UDP/TRDP or via gateway that returns binary).

### 2.1 Binary packet layout

```
Offset  Size   Field
------  -----  -----
0       1      packetType     = 0x01 (LIVE_DATA)
1       1      subsystemId    = subsystem identifier (0–255)
2       2      signalCount    = number of signal records (uint16, little-endian)
4       ...    signal records (repeated signalCount times)
```

### 2.2 Signal record (per signal)

```
Offset  Size   Field
------  -----  -----
0       2      signalId       = signal ID (uint16, little-endian)
2       1      dataTypeCode   = 0x01..0x04 (see Data Type Codes)
3       N      value          = N bytes (INT32/UINT32/FLOAT32: 4, BOOLEAN: 1)
```

### 2.3 Example: two signals (FLOAT32 + BOOLEAN)

- Header: `01 00 02 00` (type=1, subsystem=0, count=2)
- Signal 1: id=1, FLOAT32: `01 00 03 00 00 20 41` → signalId=1, type=0x03, value=10.0
- Signal 2: id=4, BOOLEAN: `04 00 04 01` → signalId=4, type=0x04, value=true

**Decoding (C-style):** Read header, then for each of `signalCount` records: read signalId (uint16 LE), dataTypeCode (uint8), then value with size from table above.

---

## 3. Write Data Format (Web → Device)

### 3.1 Single signal write (PACKET_TYPE_WRITE_DATA = 0x02)

**HTTP:** `POST /api/writedata`  
**Content-Type:** `application/octet-stream`  
**Headers:** `X-Signal-Id: <id>`, `X-Data-Type: FLOAT32|INT32|UINT32|BOOLEAN`  
**Body:** binary packet below.

**Packet layout:**

```
Offset  Size   Field
------  -----  -----
0       1      packetType     = 0x02 (WRITE_DATA)
1       1      subsystemId    = 0 (not used for single write)
2       2      signalCount    = 1 (uint16, little-endian)
4       2      signalId       (uint16, little-endian)
6       1      dataTypeCode   (0x01..0x04)
7       N      value          (N = 4 for INT32/UINT32/FLOAT32, 1 for BOOLEAN)
```

Total size: **4 + 2 + 1 + valueSize** = 9 bytes (INT32/UINT32/FLOAT32) or 8 bytes (BOOLEAN).

### 3.2 Batch write (PACKET_TYPE_WRITE_BATCH = 0x03)

**HTTP:** `POST /api/writedata/batch`  
**Content-Type:** `application/octet-stream`  
**Header:** `X-Subsystem-Id: <subsystemId>`  
**Body:** binary packet below.

**Packet layout:**

```
Offset  Size   Field
------  -----  -----
0       1      packetType     = 0x03 (WRITE_BATCH)
1       1      subsystemId    = target subsystem ID
2       2      signalCount    = number of signals (uint16, little-endian)
4       ...    signal records (same as in Live Data: signalId, dataTypeCode, value)
```

Each signal record: 2 (signalId) + 1 (dataTypeCode) + value size (4 or 1).

**Embedded handling:** Parse header; for each of `signalCount` records, read signalId, dataTypeCode, value; apply scaling if needed and write to outputs.

---

## 4. Graph Data Format (for logging/plotting)

The web app builds time-series for charts from **live data**. No separate “graph packet” exists on the wire; the graph is built in the UI from the same live data stream.

### 4.1 What the UI expects (internal)

- **Live data** is a map: `{ [signalName: string]: value }`, e.g. `{ "Speed": 42.5, "Pressure": 1.2 }`.
- **Graph series** are built as:
  - **labels:** array of time strings (e.g. `["14:30:01", "14:30:02", ...]`).
  - **datasets:** array of `{ label: signalName, data: number[] }`, where `data[i]` is the value at `labels[i]`.

So for embedded: **you only need to send live data in the binary format of Section 2**. The web app will sample it (e.g. every 1 s), add a timestamp, and build graph series. No special “graph format” is required from the device.

### 4.2 Optional: JSON live data (alternative to binary)

If the backend serves live data as JSON (e.g. gateway that converts binary to JSON):

```json
{
  "data": {
    "Speed": 42.5,
    "Pressure": 1.2,
    "Temperature": 25,
    "Door_Status": true
  },
  "status": "Connected"
}
```

Or with quality/timestamp (backend may normalize to the above):

```json
{
  "data": {
    "Speed": { "value": 42.5, "quality": "VALID", "timestamp": "2025-01-30T12:00:00.000Z", "comid": 1000 }
  },
  "status": "Connected"
}
```

The UI accepts both: if a property is an object with `value`, it uses `value`; otherwise the property itself is the value.

---

## 5. REST/JSON API Formats (Configuration & Auth)

### 5.1 Login

- **Request:** `POST /api/login`  
  `Content-Type: application/json`  
  `{ "username": "string", "password": "string" }`
- **Response:** `{ "token": "string" }`

Subsequent API calls use header: `Authorization: Bearer <token>`.

### 5.2 Subsystems

- **GET /api/subsystems**  
  Response: `{ "subsystems": Subsystem[] }`

- **POST /api/subsystems**  
  Body: `{ "subsystems": Subsystem[] }`

**Subsystem:**

```json
{
  "id": 1,
  "name": "HVAC",
  "type": "TCN",
  "ip": "192.168.1.100",
  "active": true
}
```

### 5.3 Signals (configuration)

- **GET /api/signals**  
  Response: `{ "signals": Signal[] }`

- **POST /api/signals**  
  Body: `{ "signals": Signal[] }`

**Signal:**

```json
{
  "id": 1,
  "name": "Speed",
  "subsystemId": 2,
  "datatype": "FLOAT32",
  "comid": 1000,
  "scaling": 1.0,
  "cycletime": 100,
  "msgtype": "PD",
  "fragmentation": false,
  "access": "READ/WRITE"
}
```

| Field | Type | Notes |
|-------|------|-------|
| id | number | Unique signal ID; used in binary packets as signalId |
| name | string | Display name; used as key in live data map |
| subsystemId | number | Links to Subsystem.id |
| datatype | string | "INT32", "UINT32", "FLOAT32", "BOOLEAN" |
| comid | number | TRDP COM ID (grouping in UI) |
| scaling | number | Scale factor for display/engineering units |
| cycletime | number | Cycle time in ms |
| msgtype | string | e.g. "PD", "MD" |
| fragmentation | boolean | false = no fragmentation |
| access | string | "READ", "WRITE", "READ/WRITE" |

### 5.4 Live data (HTTP JSON alternative)

- **GET /api/livedata**  
  Response: `{ "data": { "<signalName>": <value> or { "value", "quality", "timestamp", "comid" } }, "status": "Connected" }`

### 5.5 Device configuration (JSON)

Used by the Device Config screen. Structure expected by the app:

```json
{
  "ipMode": "static",
  "ipAddress": "192.168.1.100",
  "subnetMask": "255.255.255.0",
  "gateway": "192.168.1.1",
  "dns": "8.8.8.8"
}
```

`ipMode` can be `"static"` or `"dhcp"`. All IPv4 addresses: four octets, 0–255, dot-separated.

### 5.6 Other endpoints

- **GET /api/files** → `{ "files": any[] }`
- **GET /api/version** → `{ "application": "string", "firmware": "string" }`
- **GET /api/download/:filename** → file download
- **POST /api/firmware** → multipart form with field `firmware` (file)

---

## 6. Summary for Embedded Implementation

| Direction | Format | When to use |
|-----------|--------|-------------|
| Device → App (read/live) | Binary: type=0x01, subsystemId, signalCount, then [signalId, dataTypeCode, value] per signal. Little-endian. | Sending live data over UDP/TRDP or to a gateway that forwards to the app |
| App → Device (single write) | Binary: type=0x02, subsystemId=0, count=1, then signalId, dataTypeCode, value | Single signal write |
| App → Device (batch write) | Binary: type=0x03, subsystemId, signalCount, then same signal records as above | Multiple signals in one packet |
| Config / auth | JSON over HTTP | Subsystems, signals, device config, login; optional JSON live data |

**Data type sizes:** INT32, UINT32, FLOAT32 = 4 bytes; BOOLEAN = 1 byte. All multi-byte numeric fields are **little-endian**.

Reference implementation (encoding/decoding): `angular-webapp/src/app/services/binary-protocol.service.ts`.
