import { Component, OnInit } from '@angular/core';
import { ApiService, Signal, Subsystem } from '../../services/api.service';

@Component({
  selector: 'app-signals',
  templateUrl: './signals.component.html',
  styleUrls: ['./signals.component.css']
})
export class SignalsComponent implements OnInit {
  signals: Signal[] = [];
  subsystems: Subsystem[] = [];
  configuredSubsystemNames: string[] = [];
  selectedSubsystem: string | null = null;
  isSaving: boolean = false;
  isUploading: boolean = false;
  bitValue: number = 0; // For BIT/BOOLEAN value (0-255)
  bitBits: boolean[] = new Array(8).fill(false); // individual bits for BIT datatype
  bitIndexes: number[] = [7, 6, 5, 4, 3, 2, 1, 0]; // display order (MSB -> LSB)
  newSignal: Partial<Signal> = {
    name: '',
    subsystemId: 1,
    datatype: 'FLOAT32',
    comid: 0,
    scaling: 1.0,
    cycletime: 100,
    msgtype: 'PD',
    fragmentation: false,
    access: 'READ/WRITE'
  };
  
  SUBSYSTEM_OPTIONS = ['HVAC', 'Traction', 'Auxiliary', 'PAPIS', 'DOOR', 'BRAKE'];
  DATATYPE_OPTIONS = ['INT32', 'UINT32', 'FLOAT32', 'BOOLEAN', 'BIT'];
  MSGTYPE_OPTIONS = ['PD', 'MD'];
  ACCESS_OPTIONS = ['READ', 'WRITE', 'READ/WRITE'];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    console.log('Loading subsystems and signals...');
    // Load subsystems first, then signals
    this.apiService.getSubsystems().subscribe({
      next: (response) => {
        console.log('Subsystems loaded:', response);
        this.subsystems = response.subsystems || [];
        this.configuredSubsystemNames = this.subsystems.map(s => s.name);
        if (this.subsystems.length > 0) {
          this.selectedSubsystem = this.subsystems[0].name;
          this.newSignal.subsystemId = this.subsystems[0].id;
        }
        
        // Now load signals and filter by configured subsystems
        this.apiService.getSignals().subscribe({
          next: (signalResponse) => {
            console.log('Signals loaded:', signalResponse);
            // Only show signals for configured subsystems
            const configuredSubsystemIds = this.subsystems.map(s => s.id);
            this.signals = (signalResponse.signals || []).filter(s => 
              configuredSubsystemIds.includes(s.subsystemId)
            );
            console.log('Filtered signals:', this.signals);
          },
          error: (error) => {
            console.error('Error loading signals:', error);
          }
        });
      },
      error: (error) => {
        console.error('Error loading subsystems:', error);
      }
    });
  }

  addSignal(): void {
    // Ensure at least one subsystem is configured
    if (this.subsystems.length === 0) {
      alert('Please configure at least one subsystem before adding signals.');
      return;
    }

    // Use the first configured subsystem (or currently selected one if available)
    const selectedSubsystem =
      (this.selectedSubsystem && this.subsystems.find(s => s.name === this.selectedSubsystem)) ||
      this.subsystems[0];
    const selectedSubsystemId = selectedSubsystem.id;

    if (!this.newSignal.name || !this.newSignal.comid) {
      alert('Please enter signal name and COM ID.');
      return;
    }

    if (this.newSignal.name && this.newSignal.comid) {
      const newId = Math.max(...this.signals.map(s => s.id), 0) + 1;
      const signal: Signal = {
        id: newId,
        name: this.newSignal.name!,
        subsystemId: selectedSubsystemId,
        datatype: this.newSignal.datatype!,
        comid: this.newSignal.comid!,
        scaling: this.newSignal.scaling || 1.0,
        cycletime: this.newSignal.cycletime || 100,
        msgtype: this.newSignal.msgtype!,
        fragmentation: this.newSignal.fragmentation || false,
        access: this.newSignal.access!
      };
      
      console.log('Adding new signal:', signal);
      this.signals.push(signal);
      alert('Signal added! Click "Save Signals" to persist changes.');
      
      // Reset form
      this.newSignal = {
        name: '',
        subsystemId: selectedSubsystemId,
        datatype: 'FLOAT32',
        comid: 0,
        scaling: 1.0,
        cycletime: 100,
        msgtype: 'PD',
        fragmentation: false,
        access: 'READ/WRITE'
      };
      this.bitValue = 0;
      this.bitBits = new Array(8).fill(false);
    }
  }

  toggleBitValue(): void {
    this.bitValue = this.bitValue === 0 ? 1 : 0;
  }
  
  /**
   * Handle checkbox changes for BIT datatype (8-bit value).
   * Each checkbox represents one bit (0-7), we recompute the numeric value.
   */
  onBitCheckboxChange(bit: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.bitBits[bit] = input.checked;
    this.bitValue = this.bitBits.reduce((acc, checked, idx) => {
      return acc + (checked ? (1 << idx) : 0);
    }, 0);
  }

  deleteSignal(id: number): void {
    this.signals = this.signals.filter(s => s.id !== id);
  }

  /**
   * Download the full signals configuration via backend.
   */
  downloadConfig(): void {
    this.apiService.downloadSignalsConfig();
  }

  /**
   * Handle user selecting a config file to upload.
   */
  onConfigFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.isUploading = true;

    this.apiService.uploadSignalsConfig(file).subscribe({
      next: (response) => {
        console.log('Signals config uploaded successfully:', response);
        this.isUploading = false;
        alert('Signals configuration uploaded successfully.');
        // Reload signals and subsystems from backend to reflect new config
        this.loadData();
        input.value = '';
      },
      error: (error) => {
        console.error('Error uploading signals config:', error);
        this.isUploading = false;

        if (error.status === 401 || error.status === 403) {
          alert('Authentication error: Please log in again.');
        } else if (error.status === 0) {
          alert('Network error: Cannot connect to server. Please ensure the backend server is running.');
        } else {
          alert(`Failed to upload signals configuration: ${error.message || error.statusText || 'Unknown error'}`);
        }
      }
    });
  }

  saveSignals(): void {
    if (this.isSaving) return;
    
    console.log('Saving signals:', this.signals);
    this.isSaving = true;
    
    this.apiService.saveSignals(this.signals).subscribe({
      next: (response) => {
        console.log('Signals saved successfully:', response);
        this.isSaving = false;
        alert('Signals saved successfully!');
        // Reload data to ensure consistency
        this.loadData();
      },
      error: (error) => {
        console.error('Error saving signals:', error);
        this.isSaving = false;
        
        if (error.status === 401 || error.status === 403) {
          alert('Authentication error: Please log in again.');
        } else if (error.status === 0) {
          alert('Network error: Cannot connect to server. Please ensure the backend server is running.');
        } else {
          alert(`Failed to save signals: ${error.message || error.statusText || 'Unknown error'}`);
        }
      }
    });
  }

  /**
   * When user switches subsystem (tabs or dropdown), update selected subsystem and newSignal.subsystemId.
   */
  onSubsystemChange(subsystemName: string): void {
    this.selectedSubsystem = subsystemName;
    const sub = this.subsystems.find(s => s.name === subsystemName);
    if (sub) {
      this.newSignal.subsystemId = sub.id;
    }
  }

  getSubsystemName(subsystemId: number): string {
    const subsystem = this.subsystems.find(s => s.id === subsystemId);
    return subsystem ? subsystem.name : 'Unknown';
  }

  getFilteredSignals(): Signal[] {
    // If no subsystems configured, nothing to show
    if (this.subsystems.length === 0) {
      return [];
    }

    // Always filter by currently selected subsystem (or first one)
    const activeSubsystem =
      (this.selectedSubsystem && this.subsystems.find(s => s.name === this.selectedSubsystem)) ||
      this.subsystems[0];

    return this.signals.filter(s => s.subsystemId === activeSubsystem.id);
  }
}
