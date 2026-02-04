import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

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
    console.log('[LiveData] Loading subsystems and signals...');
    // Load subsystems first, then signals
    this.apiService.getSubsystems().subscribe({
      next: (response) => {
        console.log('[LiveData] Subsystems loaded:', response);
        this.subsystems = response.subsystems || [];
        // Only show configured subsystems
        this.configuredSubsystemNames = this.subsystems.map(s => s.name);
        // Set default selected subsystem to first configured one
        if (this.configuredSubsystemNames.length > 0 && !this.selectedSubsystem) {
          this.selectedSubsystem = this.configuredSubsystemNames[0];
        }
        console.log('[LiveData] Selected subsystem:', this.selectedSubsystem);
        
        // Now load signals and filter by configured subsystems
        this.apiService.getSignals().subscribe({
          next: (signalResponse) => {
            console.log('[LiveData] Signals loaded:', signalResponse);
            // Only show signals for configured subsystems
            const configuredSubsystemIds = this.subsystems.map(s => s.id);
            this.signals = (signalResponse.signals || []).filter(s => 
              configuredSubsystemIds.includes(s.subsystemId)
            );
            console.log('[LiveData] Filtered signals:', this.signals);
            console.log('[LiveData] Filtered signals for display:', this.getFilteredSignals());
          },
          error: (error) => {
            console.error('[LiveData] Error loading signals:', error);
            alert('Failed to load signals: ' + (error.message || 'Unknown error'));
          }
        });
      },
      error: (error) => {
        console.error('[LiveData] Error loading subsystems:', error);
        alert('Failed to load subsystems: ' + (error.message || 'Unknown error'));
      }
    });
  }

  startPolling(): void {
    let pollCount = 0;
    this.dataSubscription = interval(1000).subscribe(() => {
      // Pass signals for proper binary decoding
      this.apiService.getLiveData(this.signals).subscribe({
        next: (response) => {
          pollCount++;
          if (pollCount <= 3) {
            console.log(`[LiveData] Poll #${pollCount} - Live data received:`, response);
            console.log(`[LiveData] Poll #${pollCount} - Live data values:`, response.data);
          }
          
          // Update live data - create new object reference to trigger change detection
          this.liveData = { ...(response.data || {}) };
          
          // Manually trigger change detection to ensure UI updates
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[LiveData] Failed to fetch live data:', error);
          if (error.status === 401 || error.status === 403) {
            console.error('[LiveData] Authentication error - please log in again');
          } else if (error.status === 0) {
            console.error('[LiveData] Network error - cannot connect to server');
          }
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
