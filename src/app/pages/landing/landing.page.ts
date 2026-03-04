import { Component, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

// landing page component for home page
// shows policy info and animations on scroll
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.css']
})
export class LandingComponent implements AfterViewInit {
  // track which policy tab is active
  activePolicy: 'individual' | 'family' = 'individual';
  // mobile nav menu state
  mobileNavOpen = false;

  constructor(private router: Router, private el: ElementRef) { }

  // setup scroll animations after view loads
  ngAfterViewInit() {
    this.setupScrollAnimations();
  }

  // intersection observer to fade in elements on scroll
  private setupScrollAnimations() {
    // create observer that triggers when element is 10% visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // add visible class to animate element
          entry.target.classList.add('visible');
          // stop observing after animation done
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    // find all fade-in elements and observe them
    const fadeElements = this.el.nativeElement.querySelectorAll('.fade-in-section');
    fadeElements.forEach((el: HTMLElement) => observer.observe(el));
  }

  // navigate to registration page
  goRegister() {
    this.router.navigate(['/register']);
  }

  // smooth scroll to section by id
  scrollTo(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}