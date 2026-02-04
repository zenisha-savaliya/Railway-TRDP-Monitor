import { Component, OnInit } from '@angular/core';
import { ApiService, Subsystem } from '../../services/api.service';

interface DeviceConfigState {
  ipMode: string;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
}

@Component({
  selector: 'app-device-config',
  templateUrl: './device-config.component.html',
  styleUrls: ['./device-config.component.css']
})
export class DeviceConfigComponent implements OnInit {
  deviceConfig: DeviceConfigState = {
    ipMode: 'static',
    ipAddress: '',
    subnetMask: '',
    gateway: ''
  };
  
  subsystems: Subsystem[] = [];
  configuredSubsystemNames: string[] = [];
  selectedSubsystem: Subsystem | null = null;
  subsystemConfigs: { [id: number]: DeviceConfigState } = {};
  isUploadingConfig: boolean = false;
  
  // Validation errors
  validationErrors = {
    ipAddress: '',
    subnetMask: '',
    gateway: ''
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    console.log('DeviceConfigComponent initialized');
    this.loadSubsystems();
  }

  loadSubsystems(): void {
    console.log('Loading subsystems...');
    this.apiService.getSubsystems().subscribe({
      next: (response) => {
        this.subsystems = response.subsystems || [];
        // Only show configured subsystems
        this.configuredSubsystemNames = this.subsystems.map(s => s.name);
        console.log('Subsystems loaded successfully:', this.subsystems.length, this.subsystems);

        if (this.subsystems.length > 0) {
          this.selectedSubsystem = this.subsystems[0];
          this.loadDeviceConfigForSelected();
        }
      },
      error: (error) => {
        console.error('Error loading subsystems:', error);
        this.subsystems = [];
        this.configuredSubsystemNames = [];
        
        // Provide user feedback based on error type
        if (error.status === 401 || error.status === 403) {
          alert('Authentication error: Please log in again.');
        } else if (error.status === 0) {
          alert('Network error: Cannot connect to server. Please ensure the backend server is running on port 8080.');
        } else {
          alert(`Error loading subsystems: ${error.message || 'Unknown error'}`);
        }
      }
    });
  }

  loadDeviceConfigForSelected(): void {
    if (!this.selectedSubsystem) {
      return;
    }

    const subsystemId = this.selectedSubsystem.id;
    console.log('Loading device configuration for subsystem:', subsystemId, this.selectedSubsystem.name);

    this.apiService.getDeviceConfig(subsystemId).subscribe({
      next: (config) => {
        console.log('Device config loaded successfully for subsystem', subsystemId, config);
        if (config) {
          this.deviceConfig = {
            ipMode: config.ipMode || 'static',
            ipAddress: config.ipAddress || '',
            subnetMask: config.subnetMask || '',
            gateway: config.gateway || ''
          };
          this.subsystemConfigs[subsystemId] = { ...this.deviceConfig };
        }
      },
      error: (error) => {
        console.error('Error loading device config:', error);
        
        // Provide user feedback based on error type
        if (error.status === 401 || error.status === 403) {
          alert('Authentication error: Please log in again.');
        } else if (error.status === 0) {
          alert('Network error: Cannot connect to server. Please ensure the backend server is running on port 8080.');
        } else {
          alert(`Error loading device configuration: ${error.message || 'Unknown error'}`);
        }
      }
    });
  }

  onSubsystemChange(subsystem: Subsystem): void {
    this.selectedSubsystem = subsystem;
    const cached = this.subsystemConfigs[subsystem.id];
    if (cached) {
      this.deviceConfig = { ...cached };
    } else {
      this.loadDeviceConfigForSelected();
    }
  }

  /**
   * Validate IP address format (each part 0-255)
   */
  validateIPAddress(ip: string): boolean {
    if (!ip || ip.trim() === '') {
      return false;
    }
    
    const parts = ip.trim().split('.');
    
    // Must have exactly 4 parts
    if (parts.length !== 4) {
      return false;
    }
    
    // Each part must be a number between 0-255
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate IP address and set error message
   */
  validateIPAddressField(ip: string, fieldName: 'ipAddress' | 'subnetMask' | 'gateway'): void {
    if (this.deviceConfig.ipMode === 'static') {
      if (!ip || ip.trim() === '') {
        this.validationErrors[fieldName] = `${this.getFieldLabel(fieldName)} is required`;
        return;
      }
      
      if (!this.validateIPAddress(ip)) {
        this.validationErrors[fieldName] = `Invalid ${this.getFieldLabel(fieldName)}. Each part must be 0-255 (e.g., 192.168.1.100)`;
        return;
      }
      
      this.validationErrors[fieldName] = '';
    } else {
      this.validationErrors[fieldName] = '';
    }
  }

  /**
   * Get field label for error messages
   */
  getFieldLabel(fieldName: string): string {
    switch (fieldName) {
      case 'ipAddress':
        return 'IP Address';
      case 'subnetMask':
        return 'Subnet Mask';
      case 'gateway':
        return 'Gateway';
      default:
        return fieldName;
    }
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    if (this.deviceConfig.ipMode !== 'static') {
      return true;
    }
    
    return this.validateIPAddress(this.deviceConfig.ipAddress) &&
           this.validateIPAddress(this.deviceConfig.subnetMask) &&
           this.validateIPAddress(this.deviceConfig.gateway) &&
           this.validationErrors.ipAddress === '' &&
           this.validationErrors.subnetMask === '' &&
           this.validationErrors.gateway === '';
  }

  /**
   * Handle IP address input change
   */
  onIPAddressChange(): void {
    this.validateIPAddressField(this.deviceConfig.ipAddress, 'ipAddress');
  }

  /**
   * Handle subnet mask input change
   */
  onSubnetMaskChange(): void {
    this.validateIPAddressField(this.deviceConfig.subnetMask, 'subnetMask');
  }

  /**
   * Handle gateway input change
   */
  onGatewayChange(): void {
    this.validateIPAddressField(this.deviceConfig.gateway, 'gateway');
  }

  /**
   * Handle IP mode change
   */
  onIPModeChange(): void {
    // Clear validation errors when switching modes
    if (this.deviceConfig.ipMode !== 'static') {
      this.validationErrors = {
        ipAddress: '',
        subnetMask: '',
        gateway: ''
      };
    } else {
      // Re-validate if switching back to static
      this.onIPAddressChange();
      this.onSubnetMaskChange();
      this.onGatewayChange();
    }
  }

  sendConfiguration(): void {
    // Validate that at least one subsystem is configured
    if (!this.selectedSubsystem) {
      alert('Please configure at least one subsystem before sending device configuration.');
      return;
    }

    // Validate IP addresses if static mode
    if (this.deviceConfig.ipMode === 'static') {
      // Re-validate all fields
      this.onIPAddressChange();
      this.onSubnetMaskChange();
      this.onGatewayChange();
      
      if (!this.isFormValid()) {
        alert('Please fix validation errors before sending configuration.');
        return;
      }
    }

    console.log('Sending device configuration for subsystem:', this.selectedSubsystem.id, this.selectedSubsystem.name, this.deviceConfig);
    
    // Send to backend
    this.apiService.updateDeviceConfig(this.deviceConfig, this.selectedSubsystem.id).subscribe({
      next: (response) => {
        console.log('Device configuration saved successfully:', response);
        this.subsystemConfigs[this.selectedSubsystem!.id] = { ...this.deviceConfig };
        alert('Device configuration sent successfully!\n\n' + JSON.stringify(this.deviceConfig, null, 2));
      },
      error: (error) => {
        console.error('Error saving device configuration:', error);
        if (error.status === 401 || error.status === 403) {
          alert('Authentication error: Please log in again.');
        } else if (error.status === 0) {
          alert('Network error: Cannot connect to server. Please ensure the backend server is running on port 8080.');
        } else {
          alert(`Error saving device configuration: ${error.message || 'Unknown error'}`);
        }
      }
    });
  }

  /**
   * Download full device configuration (all subsystems).
   */
  downloadDeviceConfig(): void {
    this.apiService.downloadDeviceConfig();
  }

  /**
   * Upload device configuration file (all subsystems).
   */
  onDeviceConfigFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.isUploadingConfig = true;

    this.apiService.uploadDeviceConfig(file).subscribe({
      next: (response) => {
        console.log('Device config uploaded successfully:', response);
        this.isUploadingConfig = false;
        alert('Device configuration uploaded successfully.');
        // Reload subsystems and configs so UI reflects uploaded data
        this.loadSubsystems();
        input.value = '';
      },
      error: (error) => {
        console.error('Error uploading device configuration:', error);
        this.isUploadingConfig = false;

        if (error.status === 401 || error.status === 403) {
          alert('Authentication error: Please log in again.');
        } else if (error.status === 0) {
          alert('Network error: Cannot connect to server. Please ensure the backend server is running on port 8080.');
        } else {
          alert(`Error uploading device configuration: ${error.message || 'Unknown error'}`);
        }
      }
    });
  }
}
