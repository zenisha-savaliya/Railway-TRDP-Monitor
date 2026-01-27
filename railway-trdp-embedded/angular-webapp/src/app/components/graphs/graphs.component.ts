import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService, Signal } from '../../services/api.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-graphs',
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.css']
})
export class GraphsComponent implements OnInit, OnDestroy {
  signals: Signal[] = [];
  selectedParams: string[] = [];
  graphData: any[] = [];
  liveData: { [key: string]: any } = {};
  
  chartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };
  
  chartType: ChartType = 'line';
  
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  
  private dataSubscription?: Subscription;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadSignals();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  loadSignals(): void {
    this.apiService.getSignals().subscribe({
      next: (response) => {
        this.signals = response.signals || [];
        if (this.signals.length > 0 && this.selectedParams.length === 0) {
          this.selectedParams = this.signals.slice(0, 2).map(s => s.name);
        }
        this.updateChart();
      }
    });
  }

  startPolling(): void {
    this.dataSubscription = interval(1000).subscribe(() => {
      // Pass signals for proper binary decoding
      this.apiService.getLiveData(this.signals).subscribe({
        next: (response) => {
          this.liveData = response.data || {};
          if (this.selectedParams.length > 0) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });
            
            this.graphData.push({
              time: timeStr,
              ...this.liveData
            });
            
            if (this.graphData.length > 20) {
              this.graphData = this.graphData.slice(-20);
            }
            
            this.updateChart();
          }
        },
        error: (error) => {
          console.error('Failed to fetch live data:', error);
        }
      });
    });
  }

  toggleParamSelection(paramName: string): void {
    const index = this.selectedParams.indexOf(paramName);
    if (index > -1) {
      this.selectedParams.splice(index, 1);
    } else {
      this.selectedParams.push(paramName);
    }
    this.updateChart();
  }

  updateChart(): void {
    if (this.selectedParams.length === 0) {
      this.chartData = {
        labels: [],
        datasets: []
      };
      return;
    }

    const datasets = this.selectedParams.map((param, idx) => ({
      label: param,
      data: this.graphData.map(d => d[param] || 0),
      borderColor: `hsl(${idx * 60}, 70%, 50%)`,
      backgroundColor: `hsla(${idx * 60}, 70%, 50%, 0.1)`,
      tension: 0.3
    }));

    this.chartData = {
      labels: this.graphData.map(d => d.time),
      datasets
    };
  }
}
