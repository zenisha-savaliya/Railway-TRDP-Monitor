import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ApiService, Signal } from '../../services/api.service';

@Component({
  selector: 'app-write-data',
  templateUrl: './write-data.component.html',
  styleUrls: ['./write-data.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WriteDataComponent implements OnInit {
  signals: Signal[] = [];
  subsystems: any[] = [];
  writeData: { [key: number]: any } = {};
  selectedSubsystem = '';
  configuredSubsystemNames: string[] = [];
  
  // Cached computed values to avoid recalculating on every change detection
  writableSignals: Signal[] = [];
  groupedByComId: { [comid: string]: Signal[] } = {};
  isSavingAll = false;

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // Load subsystems first, then signals
    this.apiService.getSubsystems().subscribe({
      next: (response) => {
        this.subsystems = response.subsystems || [];
        // Only show configured subsystems
        this.configuredSubsystemNames = this.subsystems.map(s => s.name);
        // Set default selected subsystem to first configured one
        if (this.configuredSubsystemNames.length > 0 && !this.selectedSubsystem) {
          this.selectedSubsystem = this.configuredSubsystemNames[0];
        }
        // Update cached values when subsystems change
        this.updateWritableSignals();
        this.cdr.markForCheck();
        
        // Now load signals and filter by configured subsystems
        this.apiService.getSignals().subscribe({
          next: (signalResponse) => {
            // Only show signals for configured subsystems
            const configuredSubsystemIds = this.subsystems.map(s => s.id);
            this.signals = (signalResponse.signals || []).filter(s => 
              configuredSubsystemIds.includes(s.subsystemId)
            );
            console.log('Loaded signals:', this.signals);
            console.log('Selected subsystem:', this.selectedSubsystem);
            // Update cached values
            this.updateWritableSignals();
            console.log('Writable signals:', this.writableSignals);
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error loading signals:', err);
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  getSubsystemName(subsystemId: number): string {
    const subsystem = this.subsystems.find(s => s.id === subsystemId);
    return subsystem ? subsystem.name : 'Unknown';
  }

  // Update cached writable signals - call this when data changes
  updateWritableSignals(): void {
    // Only show signals for configured subsystems
    const configuredSubsystemIds = this.subsystems.map(s => s.id);
    this.writableSignals = this.signals.filter(s => {
      const subsystemMatch = configuredSubsystemIds.includes(s.subsystemId);
      const nameMatch = this.getSubsystemName(s.subsystemId) === this.selectedSubsystem;
      const accessMatch = s.access === 'WRITE' || s.access === 'READ/WRITE';
      
      return subsystemMatch && nameMatch && accessMatch;
    });
    
    // Initialize write data with default values for BIT/BOOLEAN types
    this.writableSignals.forEach(signal => {
      if ((signal.datatype === 'BOOLEAN' || signal.datatype === 'BIT') && 
          this.writeData[signal.id] === undefined) {
        this.writeData[signal.id] = false;
      }
    });
    
    // Update grouped by COM ID
    this.groupedByComId = {};
    this.writableSignals.forEach(signal => {
      const comid = signal.comid.toString();
      if (!this.groupedByComId[comid]) {
        this.groupedByComId[comid] = [];
      }
      this.groupedByComId[comid].push(signal);
    });
    
    // Debug logging
    if (this.writableSignals.length === 0 && this.signals.length > 0) {
      console.log('No writable signals found. Debug info:');
      console.log('All signals:', this.signals);
      console.log('Selected subsystem:', this.selectedSubsystem);
      console.log('Configured subsystem IDs:', configuredSubsystemIds);
      this.signals.forEach(s => {
        console.log(`Signal ${s.name}: subsystemId=${s.subsystemId}, subsystemName=${this.getSubsystemName(s.subsystemId)}, access=${s.access}`);
      });
    }
  }
  
  // Method to handle subsystem selection change
  onSubsystemChange(subsystem: string): void {
    this.selectedSubsystem = subsystem;
    this.updateWritableSignals();
    this.cdr.markForCheck();
  }

  writeSignalValue(signalId: number, value: any): void {
    // Get signal datatype
    const signal = this.signals.find(s => s.id === signalId);
    const datatype = signal?.datatype || 'FLOAT32';
    
    this.apiService.writeData(signalId, value, datatype).subscribe({
      next: () => {
        alert('Data written successfully!');
      },
      error: (error) => {
        const status = error?.status;
        const msg = error?.error?.message || error?.error?.error || error?.message;
        if (status === 400) {
          alert('Invalid request: ' + (msg || 'Bad request. The server may expect a different format.'));
        } else if (status === 401 || status === 403) {
          alert('Session expired or access denied. Please log in again.');
        } else if (!status || status === 0 || status >= 500) {
          alert('Cannot reach server or server error. ' + (msg || ''));
        } else {
          alert('Failed to write data: ' + (msg || error?.message || 'Unknown error'));
        }
      }
    });
  }

  sendAllWriteData(): void {
    if (Object.keys(this.writeData).length === 0) {
      alert('No data to send. Enter values first.');
      return;
    }

    const subsystem = this.subsystems.find(s => s.name === this.selectedSubsystem);
    if (!subsystem) {
      alert('Subsystem not found');
      return;
    }

    // Only include signals that belong to current subsystem and have values
    const batchSignals = this.writableSignals
      .filter(s => this.writeData[s.id] !== undefined && this.writeData[s.id] !== null && this.writeData[s.id] !== '')
      .map(s => ({
        signalId: s.id,
        value: this.writeData[s.id],
        datatype: s.datatype || 'FLOAT32'
      }));

    if (batchSignals.length === 0) {
      alert('No data to send. Enter values for the current subsystem first.');
      return;
    }

    this.isSavingAll = true;
    this.cdr.markForCheck();

    this.apiService.writeDataBatch(subsystem.id, batchSignals).subscribe({
      next: () => {
        this.isSavingAll = false;
        this.cdr.markForCheck();
        alert(`Data sent to ${this.selectedSubsystem} successfully!`);
        this.writeData = {};
        this.updateWritableSignals();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isSavingAll = false;
        this.cdr.markForCheck();
        const status = error?.status;
        const msg = error?.error?.message || error?.error?.error || error?.message;
        if (status === 400) {
          alert('Invalid request: ' + (msg || 'Bad request. The server may expect a different format.'));
        } else if (status === 401 || status === 403) {
          alert('Session expired or access denied. Please log in again.');
        } else {
          alert('Failed to write data: ' + (msg || error?.message || 'Unknown error'));
        }
      }
    });
  }

  /**
   * Send write data to all subsystems that have writable signals with values.
   * Groups data by subsystem and sends one batch per subsystem.
   */
  sendAllSubsystems(): void {
    if (Object.keys(this.writeData).length === 0) {
      alert('No data to send. Enter values first.');
      return;
    }

    // Group signals (that have data) by subsystem
    const bySubsystem: { [subsystemId: number]: { name: string; signals: Array<{ signalId: number; value: any; datatype: string }> } } = {};
    this.subsystems.forEach(sub => {
      const signalsWithData = this.signals.filter(s =>
        s.subsystemId === sub.id &&
        (s.access === 'WRITE' || s.access === 'READ/WRITE') &&
        this.writeData[s.id] !== undefined &&
        this.writeData[s.id] !== null &&
        this.writeData[s.id] !== ''
      );
      if (signalsWithData.length > 0) {
        bySubsystem[sub.id] = {
          name: sub.name,
          signals: signalsWithData.map(s => ({
            signalId: s.id,
            value: this.writeData[s.id],
            datatype: s.datatype || 'FLOAT32'
          }))
        };
      }
    });

    const subsystemIds = Object.keys(bySubsystem).map(id => parseInt(id, 10));
    if (subsystemIds.length === 0) {
      alert('No data to send for any subsystem. Enter values first.');
      return;
    }

    this.isSavingAll = true;
    this.cdr.markForCheck();

    let completed = 0;
    let hasError = false;
    subsystemIds.forEach(subsystemId => {
      const batch = bySubsystem[subsystemId];
      this.apiService.writeDataBatch(subsystemId, batch.signals).subscribe({
        next: () => {
          completed++;
          if (completed === subsystemIds.length) {
            this.isSavingAll = false;
            this.cdr.markForCheck();
            if (!hasError) {
              alert(`Data sent to all subsystems successfully! (${subsystemIds.length} subsystem(s))`);
              this.writeData = {};
              this.updateWritableSignals();
              this.cdr.markForCheck();
            }
          }
        },
        error: (error) => {
          hasError = true;
          completed++;
          this.isSavingAll = false;
          this.cdr.markForCheck();
          const msg = error?.error?.message || error?.error?.error || error?.message;
          alert(`Failed to send to ${batch.name}: ` + (msg || error?.message || 'Unknown error'));
        }
      });
    });
  }
}
