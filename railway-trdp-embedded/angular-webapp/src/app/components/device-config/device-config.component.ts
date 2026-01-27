import { Component, OnInit } from '@angular/core';
import { ApiService, Subsystem } from '../../services/api.service';

@Component({
  selector: 'app-device-config',
  templateUrl: './device-config.component.html',
  styleUrls: ['./device-config.component.css']
})
export class DeviceConfigComponent implements OnInit {
  deviceConfig = {
    ipMode: 'static',
    ipAddress: '',
    subnetMask: '',
    gateway: ''
  };
  
  subsystems: Subsystem[] = [];
  configuredSubsystemNames: string[] = [];
  
  // Validation errors
  validationErrors = {
    ipAddress: '',
    subnetMask: '',
    gateway: ''
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadSubsystems();
  }

  loadSubsystems(): void {
    this.apiService.getSubsystems().subscribe({
      next: (response) => {
        this.subsystems = response.subsystems || [];
        // Only show configured subsystems
        this.configuredSubsystemNames = this.subsystems.map(s => s.name);
      }
    });
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
    if (this.configuredSubsystemNames.length === 0) {
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

    console.log('Sending device configuration:', this.deviceConfig);
    console.log('Configured subsystems:', this.configuredSubsystemNames);
    alert('Device configuration sent!\n\n' + JSON.stringify(this.deviceConfig, null, 2));
  }
}
