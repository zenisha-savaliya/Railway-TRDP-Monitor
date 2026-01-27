import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  loginError = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.loginError = '';
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/livedata']);
      },
      error: () => {
        this.loginError = 'Invalid credentials! Use admin/railway123';
      }
    });
  }
}
