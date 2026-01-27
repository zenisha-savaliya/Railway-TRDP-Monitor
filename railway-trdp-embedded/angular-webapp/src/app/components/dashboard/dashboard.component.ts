import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Subscription, interval } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentPage = 'livedata';
  connectionStatus = 'connected';
  username = 'admin';
  storageInfo = {
    flash: { used: 45, total: 4000 },
    sd: { used: 1200, total: 8000 }
  };
  
  versionInfo = {
    application: '1.0.0',
    firmware: '2.1.3'
  };
  
  private liveDataSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Track current route
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      if (url.includes('livedata')) this.currentPage = 'livedata';
      else if (url.includes('writedata')) this.currentPage = 'writedata';
      else if (url.includes('graphs')) this.currentPage = 'graphs';
      else if (url.includes('subsystems')) this.currentPage = 'subsystems';
      else if (url.includes('signals')) this.currentPage = 'signals';
      else if (url.includes('deviceconfig')) this.currentPage = 'deviceconfig';
      else if (url.includes('files')) this.currentPage = 'files';
      else if (url.includes('firmware')) this.currentPage = 'firmware';
    });

    // Load version information
    this.loadVersionInfo();
    
    // Start live data polling
    this.startLiveDataPolling();
  }

  loadVersionInfo(): void {
    // Try to fetch from API, fallback to default values
    this.apiService.getVersionInfo().subscribe({
      next: (response) => {
        this.versionInfo = {
          application: response.application || '1.0.0',
          firmware: response.firmware || '2.1.3'
        };
      },
      error: () => {
        // Fallback to default values if API call fails
        this.versionInfo = {
          application: '1.0.0',
          firmware: '2.1.3'
        };
      }
    });
  }

  ngOnDestroy(): void {
    if (this.liveDataSubscription) {
      this.liveDataSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  startLiveDataPolling(): void {
    this.liveDataSubscription = interval(1000).subscribe(() => {
      this.apiService.getLiveData().subscribe({
        next: (response) => {
          this.connectionStatus = response.status === 'Connected' ? 'connected' : 'disconnected';
        },
        error: () => {
          this.connectionStatus = 'disconnected';
        }
      });
    });
  }

  navigateTo(page: string): void {
    this.router.navigate([`/${page}`]);
  }

  logout(): void {
    this.authService.logout();
  }
}
