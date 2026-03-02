import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.page';
import { LearningPage } from './pages/learning/learning.page';
import { CustomerRegisterPage } from './pages/auth/customer-register.page';
import { CustomerLoginPage } from './pages/auth/customer-login.page';
import { AdminLoginPage } from './pages/auth/admin-login.page';
import { AgentLoginPage } from './pages/auth/agent-login.page';
import { ClaimsOfficerLoginPage } from './pages/auth/claims-officer-login.page';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'learning', component: LearningPage },
  { path: 'register', component: CustomerRegisterPage },
  { path: 'customer/login', component: CustomerLoginPage },
  { path: 'admin/login', component: AdminLoginPage },
  { path: 'agent/login', component: AgentLoginPage },
  { path: 'claims-officer/login', component: ClaimsOfficerLoginPage },

  // Dashboard routes (to be implemented)
  { path: 'customer/dashboard', loadComponent: () => import('./pages/dashboard/customer-dashboard.page').then(m => m.CustomerDashboardPage) },
  { path: 'customer/policy/:id', loadComponent: () => import('./pages/details/policy-details.page').then(m => m.PolicyDetailsPage) },
  { path: 'customer/claim/:id', loadComponent: () => import('./pages/details/claim-details.page').then(m => m.ClaimDetailsPage) },
  { path: 'admin/dashboard', loadComponent: () => import('./pages/dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage) },
  { path: 'agent/dashboard', loadComponent: () => import('./pages/dashboard/agent-dashboard.page').then(m => m.AgentDashboardPage) },
  { path: 'claims-officer/dashboard', loadComponent: () => import('./pages/dashboard/claims-officer-dashboard.page').then(m => m.ClaimsOfficerDashboardPage) },
  { path: 'chat/:policyId', loadComponent: () => import('./pages/dashboard/chat.page').then(m => m.ChatPage) },


  { path: '**', redirectTo: '' }
];
