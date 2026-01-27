import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';

import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LiveDataComponent } from './components/live-data/live-data.component';
import { WriteDataComponent } from './components/write-data/write-data.component';
import { GraphsComponent } from './components/graphs/graphs.component';
import { SubsystemsComponent } from './components/subsystems/subsystems.component';
import { SignalsComponent } from './components/signals/signals.component';
import { DeviceConfigComponent } from './components/device-config/device-config.component';
import { FilesComponent } from './components/files/files.component';
import { FirmwareComponent } from './components/firmware/firmware.component';
import { AuthGuard } from './guards/auth.guard';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    LiveDataComponent,
    WriteDataComponent,
    GraphsComponent,
    SubsystemsComponent,
    SignalsComponent,
    DeviceConfigComponent,
    FilesComponent,
    FirmwareComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgChartsModule,
    RouterModule.forRoot([
      { path: 'login', component: LoginComponent },
      { 
        path: '', 
        component: DashboardComponent,
        canActivate: [AuthGuard],
        children: [
          { path: 'livedata', component: LiveDataComponent },
          { path: 'writedata', component: WriteDataComponent },
          { path: 'graphs', component: GraphsComponent },
          { path: 'subsystems', component: SubsystemsComponent },
          { path: 'signals', component: SignalsComponent },
          { path: 'deviceconfig', component: DeviceConfigComponent },
          { path: 'files', component: FilesComponent },
          { path: 'firmware', component: FirmwareComponent },
          { path: '', redirectTo: 'livedata', pathMatch: 'full' }
        ]
      }
    ])
  ],
  providers: [AuthGuard],
  bootstrap: [AppComponent]
})
export class AppModule { }
