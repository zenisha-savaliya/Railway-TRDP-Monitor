import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BinaryProtocolService } from './binary-protocol.service';

// Use current window origin to ensure API calls use the same host/port as the page
const API_BASE = `${window.location.origin}/api`;

export interface Subsystem {
  id: number;
  name: string;
  type: string;
  ip: string;
  active?: boolean;
}

export interface Signal {
  id: number;
  name: string;
  subsystemId: number;
  datatype: string;
  comid: number;
  scaling: number;
  cycletime: number;
  msgtype: string;
  fragmentation: boolean;
  access: string;
}

export interface LoginResponse {
  token: string;
}

export interface LiveDataResponse {
  data: { [key: string]: any };
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/login`, 
      { username, password },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        if (error.status === 401) {
          localStorage.removeItem('authToken');
          window.location.reload();
        }
        return throwError(() => error);
      })
    );
  }

  // Configuration endpoints - JSON format
  getSubsystems(): Observable<{ subsystems: Subsystem[] }> {
    return this.http.get<{ subsystems: Subsystem[] }>(`${API_BASE}/subsystems`, {
      headers: this.getHeaders().set('Accept', 'application/json')
    });
  }

  saveSubsystems(subsystems: Subsystem[]): Observable<any> {
    return this.http.post(`${API_BASE}/subsystems`, 
      { subsystems },
      { 
        headers: this.getHeaders().set('Content-Type', 'application/json')
      }
    );
  }

  getSignals(): Observable<{ signals: Signal[] }> {
    return this.http.get<{ signals: Signal[] }>(`${API_BASE}/signals`, {
      headers: this.getHeaders().set('Accept', 'application/json')
    });
  }

  saveSignals(signals: Signal[]): Observable<any> {
    return this.http.post(`${API_BASE}/signals`, 
      { signals },
      { 
        headers: this.getHeaders().set('Content-Type', 'application/json')
      }
    );
  }

  // Live data endpoint - JSON format (backend returns JSON)
  getLiveData(signals?: Signal[]): Observable<LiveDataResponse> {
    // Request JSON data
    return this.http.get<any>(`${API_BASE}/livedata`, {
      headers: this.getHeaders().set('Accept', 'application/json')
    }).pipe(
      map((response: any) => {
        // Backend returns { data: {...}, status: 'Connected' }
        // Transform to match expected format
        const data: { [key: string]: any } = {};
        
        if (response.data) {
          // If response.data is an object with signal names as keys
          Object.keys(response.data).forEach(signalName => {
            const signalData = response.data[signalName];
            // Handle both object format {value, quality, timestamp} and direct value
            if (typeof signalData === 'object' && signalData.value !== undefined) {
              data[signalName] = signalData.value;
            } else {
              data[signalName] = signalData;
            }
          });
        }
        
        return {
          data: data,
          status: response.status || response.connectionStatus || 'Connected'
        } as LiveDataResponse;
      }),
      catchError(error => {
        console.error('Error fetching live data:', error);
        return throwError(() => error);
      })
    );
  }

  // Write data endpoint - Binary format
  writeData(signalId: number, value: any, datatype: string = 'FLOAT32'): Observable<any> {
    // Encode to binary format
    const binaryData = BinaryProtocolService.encodeSignalData(signalId, value, datatype);
    
    // Send as binary
    return this.http.post(`${API_BASE}/writedata`, 
      binaryData,
      { 
        headers: this.getHeaders()
          .set('Content-Type', 'application/octet-stream')
          .set('X-Signal-Id', signalId.toString())
          .set('X-Data-Type', datatype),
        responseType: 'arraybuffer'
      }
    ).pipe(
      map((response: ArrayBuffer) => {
        // Decode response if needed
        return { success: true, response };
      }),
      catchError(error => {
        console.error('Error writing data:', error);
        return throwError(() => error);
      })
    );
  }

  // Batch write data endpoint - Binary format
  writeDataBatch(subsystemId: number, signals: Array<{signalId: number, value: any, datatype: string}>): Observable<any> {
    // Create signal data array
    const signalData = signals.map(s => ({
      signalId: s.signalId,
      value: s.value,
      datatype: s.datatype
    }));
    
    // Create datatype map
    const datatypes: { [signalId: number]: string } = {};
    signals.forEach(s => {
      datatypes[s.signalId] = s.datatype;
    });
    
    // Encode to binary packet
    const binaryPacket = BinaryProtocolService.encodePacket(subsystemId, signalData, datatypes);
    
    // Send as binary
    return this.http.post(`${API_BASE}/writedata/batch`, 
      binaryPacket,
      { 
        headers: this.getHeaders()
          .set('Content-Type', 'application/octet-stream')
          .set('X-Subsystem-Id', subsystemId.toString()),
        responseType: 'arraybuffer'
      }
    ).pipe(
      map((response: ArrayBuffer) => {
        return { success: true, response };
      }),
      catchError(error => {
        console.error('Error writing batch data:', error);
        return throwError(() => error);
      })
    );
  }

  getFiles(): Observable<{ files: any[] }> {
    return this.http.get<{ files: any[] }>(`${API_BASE}/files`, {
      headers: this.getHeaders()
    });
  }

  getVersionInfo(): Observable<{ application: string; firmware: string }> {
    return this.http.get<{ application: string; firmware: string }>(`${API_BASE}/version`, {
      headers: this.getHeaders().set('Accept', 'application/json')
    });
  }

  downloadFile(filename: string): void {
    window.open(`${API_BASE}/download/${filename}`, '_blank');
  }

  uploadFirmware(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('firmware', file);
    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${API_BASE}/firmware`, formData, { headers });
  }
}
