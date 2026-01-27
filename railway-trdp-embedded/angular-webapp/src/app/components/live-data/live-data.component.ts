import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService, Signal } from '../../services/api.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-live-data',
  templateUrl: './live-data.component.html',
  styleUrls: ['./live-data.component.css']
})
export class LiveDataComponent implements OnInit, OnDestroy {
  signals: Signal[] = [];
  subsystems: any[] = [];
  liveData: { [key: string]: any } = {};
  selectedSubsystem = '';
  configuredSubsystemNames: string[] = [];
  
  private dataSubscription?: Subscription;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
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

  startPolling(): void {
    this.dataSubscription = interval(1000).subscribe(() => {
      // Pass signals for proper binary decoding
      this.apiService.getLiveData(this.signals).subscribe({
        next: (response) => {
          this.liveData = response.data || {};
        },
        error: (error) => {
          console.error('Failed to fetch live data:', error);
        }
      });
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
      configuredSubsystemIds.includes(s.subsystemId) &&
      this.getSubsystemName(s.subsystemId) === this.selectedSubsystem &&
      (s.access === 'READ' || s.access === 'READ/WRITE')
    );
  }

  getGroupedSignals(): { [comid: string]: Signal[] } {
    const filtered = this.getFilteredSignals();
    const grouped: { [comid: string]: Signal[] } = {};
    filtered.forEach(signal => {
      const comid = signal.comid.toString();
      if (!grouped[comid]) {
        grouped[comid] = [];
      }
      grouped[comid].push(signal);
    });
    return grouped;
  }
}
