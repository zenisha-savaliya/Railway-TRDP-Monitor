import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

  // Write data endpoint - JSON format (works with backends that expect JSON; avoids 400 Bad Request)
  writeData(signalId: number, value: any, datatype: string = 'FLOAT32'): Observable<any> {
    const body = { signalId, value, datatype };
    return this.http.post(`${API_BASE}/writedata`, body, {
      headers: this.getHeaders().set('Content-Type', 'application/json')
    }).pipe(
      map(() => ({ success: true })),
      catchError(error => {
        console.error('Error writing data:', error);
        return throwError(() => error);
      })
    );
  }

  // Batch write data endpoint - JSON format
  writeDataBatch(subsystemId: number, signals: Array<{signalId: number, value: any, datatype: string}>): Observable<any> {
    const body = {
      subsystemId,
      signals: signals.map(s => ({
        signalId: s.signalId,
        value: s.value,
        datatype: s.datatype || 'FLOAT32'
      }))
    };
    return this.http.post(`${API_BASE}/writedata/batch`, body, {
      headers: this.getHeaders().set('Content-Type', 'application/json')
    }).pipe(
      map(() => ({ success: true })),
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

  // Device configuration endpoints (per-subsystem via query param)
  getDeviceConfig(subsystemId?: number): Observable<any> {
    const params = subsystemId != null ? { subsystemId: subsystemId.toString() } : undefined;
    return this.http.get(`${API_BASE}/v1/config/device`, {
      headers: this.getHeaders().set('Accept', 'application/json'),
      params
    }).pipe(
      map((response: any) => {
        // Backend returns { status: 'success', data: {...} }
        return response.data || response;
      }),
      catchError(error => {
        console.error('Error fetching device config:', error);
        return throwError(() => error);
      })
    );
  }

  updateDeviceConfig(config: any, subsystemId?: number): Observable<any> {
    const params = subsystemId != null ? { subsystemId: subsystemId.toString() } : undefined;
    return this.http.put(`${API_BASE}/v1/config/device`, config, {
      headers: this.getHeaders().set('Content-Type', 'application/json'),
      params
    }).pipe(
      catchError(error => {
        console.error('Error updating device config:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Download full device configuration file for all subsystems.
   */
  downloadDeviceConfig(): void {
    window.open(`${API_BASE}/v1/config/device/download`, '_blank');
  }

  /**
   * Upload a device configuration file that contains
   * parameters for all subsystems.
   */
  uploadDeviceConfig(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('config', file);

    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post(`${API_BASE}/v1/config/device/upload`, formData, {
      headers
    }).pipe(
      catchError(error => {
        console.error('Error uploading device config:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Download full signals configuration file.
   * This opens a new browser tab and lets the backend
   * stream the configuration (e.g. JSON) to the user.
   */
  downloadSignalsConfig(): void {
    window.open(`${API_BASE}/v1/config/signals/download`, '_blank');
  }

  /**
   * Upload a signals configuration file and let the backend
   * replace/update the current configuration.
   */
  uploadSignalsConfig(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('config', file);

    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post(`${API_BASE}/v1/config/signals/upload`, formData, {
      headers
    }).pipe(
      catchError(error => {
        console.error('Error uploading signals config:', error);
        return throwError(() => error);
      })
    );
  }
}
