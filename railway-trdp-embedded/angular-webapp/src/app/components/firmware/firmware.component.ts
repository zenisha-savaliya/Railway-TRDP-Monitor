import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-firmware',
  templateUrl: './firmware.component.html',
  styleUrls: ['./firmware.component.css']
})
export class FirmwareComponent {
  firmwareProgress = 0;
  isUploading = false;

  constructor(private apiService: ApiService) {}

  handleFirmwareUpload(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading = true;
    this.firmwareProgress = 0;

    const progressInterval = setInterval(() => {
      this.firmwareProgress += 10;
      if (this.firmwareProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 300);

    this.apiService.uploadFirmware(file).subscribe({
      next: () => {
        setTimeout(() => {
          alert('Firmware update completed! System will reboot.');
          this.isUploading = false;
          this.firmwareProgress = 0;
        }, 500);
      },
      error: () => {
        clearInterval(progressInterval);
        alert('Firmware update failed!');
        this.isUploading = false;
        this.firmwareProgress = 0;
      }
    });
  }
}
