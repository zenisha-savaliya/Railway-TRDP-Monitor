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
  DATATYPE_OPTIONS = ['INT32', 'UINT32', 'FLOAT32', 'BOOLEAN'];
  MSGTYPE_OPTIONS = ['PD', 'MD'];
  ACCESS_OPTIONS = ['READ/WRITE'];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // Load subsystems first, then signals
    this.apiService.getSubsystems().subscribe({
      next: (response) => {
        this.subsystems = response.subsystems || [];
        if (this.subsystems.length > 0) {
          this.newSignal.subsystemId = this.subsystems[0].id;
        }
        
        // Now load signals and filter by configured subsystems
        this.apiService.getSignals().subscribe({
          next: (signalResponse) => {
            // Only show signals for configured subsystems
            const configuredSubsystemIds = this.subsystems.map(s => s.id);
            this.signals = (signalResponse.signals || []).filter(s => 
              configuredSubsystemIds.includes(s.subsystemId)
            );
          }
        });
      }
    });
  }

  addSignal(): void {
    // Validate that subsystem is configured
    const configuredSubsystemIds = this.subsystems.map(s => s.id);
    if (!this.newSignal.subsystemId || !configuredSubsystemIds.includes(this.newSignal.subsystemId)) {
      alert('Please select a configured subsystem. Configure subsystems first if none are available.');
      return;
    }

    if (this.newSignal.name && this.newSignal.comid) {
      const newId = Math.max(...this.signals.map(s => s.id), 0) + 1;
      const signal: Signal = {
        id: newId,
        name: this.newSignal.name!,
        subsystemId: this.newSignal.subsystemId!,
        datatype: this.newSignal.datatype!,
        comid: this.newSignal.comid!,
        scaling: this.newSignal.scaling || 1.0,
        cycletime: this.newSignal.cycletime || 100,
        msgtype: this.newSignal.msgtype!,
        fragmentation: this.newSignal.fragmentation || false,
        access: this.newSignal.access!
      };
      
      this.signals.push(signal);
      
      // Reset form
      this.newSignal = {
        name: '',
        subsystemId: this.subsystems[0]?.id || 1,
        datatype: 'FLOAT32',
        comid: 0,
        scaling: 1.0,
        cycletime: 100,
        msgtype: 'PD',
        fragmentation: false,
        access: 'READ/WRITE'
      };
    }
  }

  deleteSignal(id: number): void {
    this.signals = this.signals.filter(s => s.id !== id);
  }

  saveSignals(): void {
    this.apiService.saveSignals(this.signals).subscribe({
      next: () => {
        alert('Signals saved successfully!');
      },
      error: () => {
        alert('Failed to save signals');
      }
    });
  }

  getSubsystemName(subsystemId: number): string {
    const subsystem = this.subsystems.find(s => s.id === subsystemId);
    return subsystem ? subsystem.name : 'Unknown';
  }

  getFilteredSignals(): Signal[] {
    // Only show signals for configured subsystems
    const configuredSubsystemIds = this.subsystems.map(s => s.id);
    return this.signals.filter(s => 
      configuredSubsystemIds.includes(s.subsystemId)
    );
  }
}
