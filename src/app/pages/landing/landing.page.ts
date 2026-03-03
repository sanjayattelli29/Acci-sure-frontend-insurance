import { Component, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.css']
})
export class LandingComponent implements AfterViewInit {
  activePolicy: 'individual' | 'family' = 'individual';
  mobileNavOpen = false;

  constructor(private router: Router, private el: ElementRef) { }

  ngAfterViewInit() {
    this.setupScrollAnimations();
  }

  private setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const fadeElements = this.el.nativeElement.querySelectorAll('.fade-in-section');
    fadeElements.forEach((el: HTMLElement) => observer.observe(el));
  }

  goRegister() {
    this.router.navigate(['/register']);
  }

  scrollTo(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}