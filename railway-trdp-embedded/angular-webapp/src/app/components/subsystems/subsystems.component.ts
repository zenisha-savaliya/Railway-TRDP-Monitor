import { Component, OnInit } from '@angular/core';
import { ApiService, Subsystem } from '../../services/api.service';

@Component({
  selector: 'app-subsystems',
  templateUrl: './subsystems.component.html',
  styleUrls: ['./subsystems.component.css']
})
export class SubsystemsComponent implements OnInit {
  subsystems: Subsystem[] = [];
  SUBSYSTEM_OPTIONS = ['HVAC', 'Traction', 'Auxiliary', 'PAPIS', 'DOOR', 'BRAKE'];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadSubsystems();
  }

  loadSubsystems(): void {
    this.apiService.getSubsystems().subscribe({
      next: (response) => {
        this.subsystems = response.subsystems || [];
      },
      error: (error) => {
        console.error('Failed to load subsystems:', error);
      }
    });
  }

  addSubsystem(): void {
    // Enforce a maximum of 10 subsystems
    if (this.subsystems.length >= 10) {
      alert('Maximum of 10 subsystems are allowed in configuration.');
      return;
    }

    const newId = Math.max(...this.subsystems.map(s => s.id), 0) + 1;
    this.subsystems.push({
      id: newId,
      name: 'HVAC',
      type: 'TCN',
      ip: `192.168.1.${100 + newId}`,
      active: true
    });
  }

  deleteSubsystem(id: number): void {
    if (this.subsystems.length > 1) {
      this.subsystems = this.subsystems.filter(s => s.id !== id);
    }
  }

  updateSubsystem(id: number, field: keyof Subsystem, value: any): void {
    const subsystem = this.subsystems.find(s => s.id === id);
    if (subsystem) {
      (subsystem as any)[field] = value;
    }
  }

  saveSubsystems(): void {
    this.apiService.saveSubsystems(this.subsystems).subscribe({
      next: () => {
        alert('Subsystems saved successfully!');
      },
      error: (err) => {
        console.error('Save subsystems failed:', err);
        const msg = err?.error?.message || err?.error?.error || err?.message;
        const status = err?.status;
        if (status === 401) {
          alert('Session expired or not logged in. Please log in again.');
        } else if (status === 403) {
          alert('Access denied. Please log in again.');
        } else if (status === 400) {
          alert('Invalid data: ' + (msg || 'Bad request'));
        } else if (!status || status === 0 || status === 502 || status === 503 || (err?.message && err.message.includes('Http failure'))) {
          alert('Cannot reach server. Is the backend running? Start it (e.g. node dev-server/server.js on port 8081) and ensure the app proxies /api to it.');
        } else {
          alert('Failed to save subsystems' + (msg ? ': ' + msg : ''));
        }
      }
    });
  }

  downloadConfiguration(): void {
    const config = {
      subsystems: this.subsystems,
      signals: [] // Will be populated from signals component
    };
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `trdp_config_${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  handleConfigUpload(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const config = JSON.parse(e.target.result);
        if (config.subsystems && Array.isArray(config.subsystems)) {
          // Enforce subsystem limit even when loading from file
          if (config.subsystems.length > 10) {
            alert('Configuration file contains more than 10 subsystems. Only the first 10 will be loaded.');
            config.subsystems = config.subsystems.slice(0, 10);
          }
          
          this.subsystems = config.subsystems;
          this.saveSubsystems();
        } else {
          alert('Invalid configuration file');
        }
      } catch (error: any) {
        alert('Error loading configuration: ' + error.message);
      }
    };
    reader.readAsText(file);
  }
}
