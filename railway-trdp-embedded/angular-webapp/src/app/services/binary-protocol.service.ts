import { Injectable } from '@angular/core';

/**
 * Binary Protocol Service
 * Handles encoding and decoding of binary data for TRDP communication
 * 
 * Protocol Format:
 * - Header: 4 bytes (packet type, subsystem ID, signal count)
 * - Signal Data: Variable length (signal ID + data type + value)
 */

export interface SignalData {
  signalId: number;
  value: any;
  datatype: string;
}

@Injectable({
  providedIn: 'root'
})
export class BinaryProtocolService {
  
  // Packet Types
  static readonly PACKET_TYPE_LIVE_DATA = 0x01;
  static readonly PACKET_TYPE_WRITE_DATA = 0x02;
  static readonly PACKET_TYPE_WRITE_BATCH = 0x03;
  static readonly PACKET_TYPE_RESPONSE = 0x04;

  // Data Type Codes
  static readonly DATA_TYPE_INT32 = 0x01;
  static readonly DATA_TYPE_UINT32 = 0x02;
  static readonly DATA_TYPE_FLOAT32 = 0x03;
  static readonly DATA_TYPE_BOOLEAN = 0x04;

  /**
   * Decode live data from binary buffer
   */
  static decodeLiveData(buffer: ArrayBuffer, signalMap: { [signalId: number]: string }): { [signalName: string]: any } {
    const view = new DataView(buffer);
    const decoded: { [signalName: string]: any } = {};
    
    let offset = 0;
    
    // Read header (4 bytes)
    const packetType = view.getUint8(offset++);
    const subsystemId = view.getUint8(offset++);
    const signalCount = view.getUint16(offset, true); // little-endian
    offset += 2;
    
    // Read signal data
    for (let i = 0; i < signalCount; i++) {
      // Signal ID (2 bytes)
      const signalId = view.getUint16(offset, true);
      offset += 2;
      
      // Data type (1 byte)
      const dataTypeCode = view.getUint8(offset++);
      
      // Value (variable length)
      let value: any;
      const dataType = this.getDataTypeFromCode(dataTypeCode);
      
      switch (dataType) {
        case 'INT32':
          value = view.getInt32(offset, true);
          offset += 4;
          break;
        case 'UINT32':
          value = view.getUint32(offset, true);
          offset += 4;
          break;
        case 'FLOAT32':
          value = view.getFloat32(offset, true);
          offset += 4;
          break;
        case 'BOOLEAN':
          value = view.getUint8(offset++) !== 0;
          break;
        default:
          value = 0;
          offset += 4;
      }
      
      // Map signal ID to signal name
      const signalName = signalMap[signalId] || `Signal_${signalId}`;
      decoded[signalName] = value;
    }
    
    return decoded;
  }

  /**
   * Encode signal data to binary format
   */
  static encodeSignalData(signalId: number, value: any, datatype: string): ArrayBuffer {
    const dataTypeCode = this.getDataTypeCode(datatype);
    const valueSize = this.getDataTypeSize(datatype);
    
    // Header (4 bytes) + Signal ID (2 bytes) + Data Type (1 byte) + Value (variable)
    const bufferSize = 4 + 2 + 1 + valueSize;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    let offset = 0;
    
    // Header
    view.setUint8(offset++, this.PACKET_TYPE_WRITE_DATA);
    view.setUint8(offset++, 0); // Subsystem ID (not used for single writes)
    view.setUint16(offset, 1, true); // Signal count = 1
    offset += 2;
    
    // Signal ID
    view.setUint16(offset, signalId, true);
    offset += 2;
    
    // Data Type
    view.setUint8(offset++, dataTypeCode);
    
    // Value
    switch (datatype) {
      case 'INT32':
        view.setInt32(offset, parseInt(value) || 0, true);
        break;
      case 'UINT32':
        view.setUint32(offset, parseInt(value) || 0, true);
        break;
      case 'FLOAT32':
        view.setFloat32(offset, parseFloat(value) || 0, true);
        break;
      case 'BOOLEAN':
        view.setUint8(offset, value ? 1 : 0);
        break;
    }
    
    return buffer;
  }

  /**
   * Encode batch write packet
   */
  static encodePacket(subsystemId: number, signalData: SignalData[], datatypes: { [signalId: number]: string }): ArrayBuffer {
    // Calculate buffer size
    let bufferSize = 4; // Header
    
    signalData.forEach(signal => {
      const datatype = datatypes[signal.signalId] || 'FLOAT32';
      bufferSize += 2; // Signal ID
      bufferSize += 1; // Data Type
      bufferSize += this.getDataTypeSize(datatype); // Value
    });
    
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    let offset = 0;
    
    // Header
    view.setUint8(offset++, this.PACKET_TYPE_WRITE_BATCH);
    view.setUint8(offset++, subsystemId);
    view.setUint16(offset, signalData.length, true);
    offset += 2;
    
    // Signal data
    signalData.forEach(signal => {
      const datatype = datatypes[signal.signalId] || 'FLOAT32';
      const dataTypeCode = this.getDataTypeCode(datatype);
      
      // Signal ID
      view.setUint16(offset, signal.signalId, true);
      offset += 2;
      
      // Data Type
      view.setUint8(offset++, dataTypeCode);
      
      // Value
      switch (datatype) {
        case 'INT32':
          view.setInt32(offset, parseInt(signal.value) || 0, true);
          offset += 4;
          break;
        case 'UINT32':
          view.setUint32(offset, parseInt(signal.value) || 0, true);
          offset += 4;
          break;
        case 'FLOAT32':
          view.setFloat32(offset, parseFloat(signal.value) || 0, true);
          offset += 4;
          break;
        case 'BOOLEAN':
          view.setUint8(offset++, signal.value ? 1 : 0);
          break;
      }
    });
    
    return buffer;
  }

  /**
   * Get data type code from string
   */
  private static getDataTypeCode(datatype: string): number {
    switch (datatype.toUpperCase()) {
      case 'INT32':
        return this.DATA_TYPE_INT32;
      case 'UINT32':
        return this.DATA_TYPE_UINT32;
      case 'FLOAT32':
        return this.DATA_TYPE_FLOAT32;
      case 'BOOLEAN':
        return this.DATA_TYPE_BOOLEAN;
      default:
        return this.DATA_TYPE_FLOAT32;
    }
  }

  /**
   * Get data type string from code
   */
  private static getDataTypeFromCode(code: number): string {
    switch (code) {
      case this.DATA_TYPE_INT32:
        return 'INT32';
      case this.DATA_TYPE_UINT32:
        return 'UINT32';
      case this.DATA_TYPE_FLOAT32:
        return 'FLOAT32';
      case this.DATA_TYPE_BOOLEAN:
        return 'BOOLEAN';
      default:
        return 'FLOAT32';
    }
  }

  /**
   * Get size of data type in bytes
   */
  private static getDataTypeSize(datatype: string): number {
    switch (datatype.toUpperCase()) {
      case 'INT32':
      case 'UINT32':
      case 'FLOAT32':
        return 4;
      case 'BOOLEAN':
        return 1;
      default:
        return 4;
    }
  }

  /**
   * Create signal map from signals array
   */
  static createSignalMap(signals: Array<{ id: number; name: string }>): { [signalId: number]: string } {
    const map: { [signalId: number]: string } = {};
    signals.forEach(signal => {
      map[signal.id] = signal.name;
    });
    return map;
  }
}
