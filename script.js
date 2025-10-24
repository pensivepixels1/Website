// Modern Agency Website JavaScript
(function() {
	'use strict';

	// DOM Elements
	const header = document.querySelector('.site-header');
	const navToggle = document.querySelector('.nav-toggle');
	const navList = document.querySelector('.nav-list');
	const themeToggle = document.getElementById('themeToggle');
	const scrollIndicator = document.querySelector('.scroll-indicator');
	const portfolioItems = document.querySelectorAll('.portfolio-item');
	const serviceCards = document.querySelectorAll('.service-card');
	const contactForm = document.querySelector('.contact-form');

	// Initialize everything when DOM is loaded
	document.addEventListener('DOMContentLoaded', function() {
		initHeader();
		initNavigation();
		initScrollIndicator();
		initAnimations();
		initForm();
		initYear();
		initAutoCategorizePortfolio();
		initWorkFilter();
		initTheme();
		initInteractiveBg();
		initPosterCarousel();
		initHeaderLogoText();
	});

	// Posters carousel on home page
	function initPosterCarousel(){
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const carousel = document.querySelector('.poster-carousel');
		if(!carousel) return;
		const track = carousel.querySelector('.carousel-track');
		let items = Array.from(track.children);
		let visible = 4;
		let index = 0; // current index relative to the 'real' items
		let isTransitioning = false;
		let timer = null;

		function calcVisible(){
			const width = window.innerWidth;
			if(width <= 480) return 1;
			if(width <= 900) return 2;
			return 4;
		}

		function updateSizes(){
			visible = calcVisible();
			items = Array.from(track.querySelectorAll('.carousel-item'));
			// set initial translate to account for cloned head
			const itemWidth = items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 16);
			track.style.transform = `translateX(${-(index + clonesBefore) * itemWidth}px)`;
		}

		// Create clones on both ends for seamless infinite loop
		const clonesBefore = visible;
		const clonesAfter = visible;
		function createClones(){
			// remove existing clones if any
			track.querySelectorAll('.clone').forEach(n=>n.remove());
			const currentItems = Array.from(track.querySelectorAll('.carousel-item'));
			const head = currentItems.slice(0, clonesAfter).map(n => n.cloneNode(true));
			const tail = currentItems.slice(-clonesBefore).map(n => n.cloneNode(true));
			head.forEach(n => { n.classList.add('clone'); track.appendChild(n); });
			tail.reverse().forEach(n => { n.classList.add('clone'); track.insertBefore(n, track.firstChild); });
		}

		createClones();
		items = Array.from(track.querySelectorAll('.carousel-item'));

		// set starting index to 0 (first real item). We'll offset by clonesBefore when translating.
		index = 0;

		// helper to get item width (including gap)
		function getItemWidth(){
			const w = items[0].getBoundingClientRect().width;
			const gap = parseFloat(getComputedStyle(track).gap || 16);
			return w + gap;
		}

		// move to a specific index (0-based for real items)
		function goTo(i, withTransition = true){
			if(isTransitioning) return;
			isTransitioning = true;
			const itemWidth = getItemWidth();
			if(withTransition) track.style.transition = '';
			// ensure transition is present (CSS controls timing)
			requestAnimationFrame(()=>{
				track.style.transform = `translateX(${-(i + clonesBefore) * itemWidth}px)`;
			});

			// After transition ends, handle wrap-around
			const onEnd = () => {
				track.removeEventListener('transitionend', onEnd);
				isTransitioning = false;
				// if we've moved past the real items, reset without transition
				const realCount = items.length - clonesBefore - clonesAfter;
				if(i >= realCount){
					index = 0;
					track.style.transition = 'none';
					track.style.transform = `translateX(${-(index + clonesBefore) * itemWidth}px)`;
					// force reflow
					void track.offsetWidth;
					track.style.transition = '';
				} else if(i < 0){
					index = realCount - 1;
					track.style.transition = 'none';
					track.style.transform = `translateX(${-(index + clonesBefore) * itemWidth}px)`;
					void track.offsetWidth;
					track.style.transition = '';
				} else {
					index = i;
				}
			};

			track.addEventListener('transitionend', onEnd);
			// safety in case transitionend doesn't fire
			setTimeout(()=>{ if(isTransitioning){ onEnd(); } }, 900);
		}

		function next(){
			goTo(index + 1);
		}

		function prev(){
			goTo(index - 1);
		}

		// autoplay
		function startAutoplay(){
			stopAutoplay();
			timer = setInterval(()=> next(), 5000);
		}

		function stopAutoplay(){
			if(timer) { clearInterval(timer); timer = null; }
		}

		// Wire up controls if present
		const btnPrev = carousel.querySelector('.carousel-prev');
		const btnNext = carousel.querySelector('.carousel-next');
		if(btnPrev && btnNext){
			btnPrev.addEventListener('click', function(){ stopAutoplay(); prev(); startAutoplay(); });
			btnNext.addEventListener('click', function(){ stopAutoplay(); next(); startAutoplay(); });
		}

		// Pause on hover/focus
		carousel.addEventListener('mouseenter', stopAutoplay);
		carousel.addEventListener('mouseleave', startAutoplay);
		carousel.addEventListener('focusin', stopAutoplay);
		carousel.addEventListener('focusout', startAutoplay);

		// handle resize
		let resizeTimer;
		window.addEventListener('resize', function(){
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(()=>{
				// rebuild clones and sizes
				createClones();
				items = Array.from(track.querySelectorAll('.carousel-item'));
				// reposition to current index
				track.style.transition = 'none';
				const itemWidth = getItemWidth();
				track.style.transform = `translateX(${-(index + clonesBefore) * itemWidth}px)`;
				void track.offsetWidth;
				track.style.transition = '';
			}, 200);
		});

		// initial positioning
		requestAnimationFrame(()=>{
			const itemWidth = getItemWidth();
			track.style.transform = `translateX(${-(index + clonesBefore) * itemWidth}px)`;
		});

		startAutoplay();

		// Expose for debugging
		carousel._carouselAPI = { next, prev, startAutoplay, stopAutoplay };
	}


	// Auto-categorize portfolio items by filename tokens (so adding images named with tags auto-assigns categories)
	function initAutoCategorizePortfolio(){
		const items = document.querySelectorAll('.portfolio-item');
		if(!items.length) return;
		const mapping = {
			boutique: ['botique','boutique'],
			bags: ['bag','bags'],
			cafe: ['cafe','coffee'],
			jewellery: ['jewellery','jewelry','jewel'],
			restaurant: ['restuarant','restaurant','resto'],
			vivaha: ['vivaha','vivah','wedding','marriage'],
			lifestyle: ['lifestyle','fashion']
		};

		items.forEach(item => {
			const img = item.querySelector('img');
			if(!img) return;
			const src = (img.getAttribute('src') || '').split('/').pop().toLowerCase();
			const filename = src.replace(/[^a-z0-9]+/g, ' ');
			let current = (item.getAttribute('data-category') || '').toLowerCase();
			// Only auto-assign when the category is missing or generic 'posters'
			if(current && current !== 'posters' && current !== '') return;

			for(const cat in mapping){
				if(mapping[cat].some(k => filename.includes(k))){
					item.setAttribute('data-category', cat);
					item.dataset.autoCategory = cat;
					return;
				}
			}
			// fallback: keep 'posters' if nothing matched
			item.setAttribute('data-category', current || 'posters');
		});
	}

	// Interactive background for internal pages
	function initInteractiveBg(){
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (!document.body.classList.contains('inner-page')) return;

		let lastMove = 0;
		function setVars(xPer, yPer){
			document.documentElement.style.setProperty('--mx', xPer + '%');
			document.documentElement.style.setProperty('--my', yPer + '%');
		}

		window.addEventListener('pointermove', function(e){
			const now = Date.now();
			if (now - lastMove < 16) return; // throttle ~60fps
			lastMove = now;
			const x = e.clientX / window.innerWidth * 100;
			const y = e.clientY / window.innerHeight * 100;
			setVars(x.toFixed(2), y.toFixed(2));
		});

		window.addEventListener('scroll', function(){
			const scroll = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
			document.documentElement.style.setProperty('--scroll-pos', scroll.toFixed(2) + '%');
		});
	}

	// Header scroll effect
	function initHeader() {
		let lastScrollY = window.scrollY;
		
		window.addEventListener('scroll', function() {
			const currentScrollY = window.scrollY;
			
			if (currentScrollY > 100) {
				header.classList.add('scrolled');
			} else {
				header.classList.remove('scrolled');
			}
			
			lastScrollY = currentScrollY;
		});
	}

	// Mobile navigation
	function initNavigation() {
		if (!navToggle || !navList) return;

		navToggle.addEventListener('click', function() {
			const isOpen = navList.classList.toggle('open');
			navToggle.setAttribute('aria-expanded', isOpen);
			
			// Animate hamburger menu
			const bars = navToggle.querySelectorAll('.nav-toggle-bar');
			if (isOpen) {
				bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
				bars[1].style.opacity = '0';
				bars[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
			} else {
				bars[0].style.transform = 'none';
				bars[1].style.opacity = '1';
				bars[2].style.transform = 'none';
			}
		});

		// Close menu when clicking on links
		navList.addEventListener('click', function(e) {
			if (e.target.tagName === 'A') {
				navList.classList.remove('open');
				navToggle.setAttribute('aria-expanded', 'false');
				
				// Reset hamburger menu
				const bars = navToggle.querySelectorAll('.nav-toggle-bar');
				bars[0].style.transform = 'none';
				bars[1].style.opacity = '1';
				bars[2].style.transform = 'none';
			}
		});

		// Smooth scrolling for navigation links
		document.querySelectorAll('a[href^="#"]').forEach(anchor => {
			anchor.addEventListener('click', function(e) {
				e.preventDefault();
				const target = document.querySelector(this.getAttribute('href'));
				if (target) {
					const headerHeight = header.offsetHeight;
					const targetPosition = target.offsetTop - headerHeight;
					
					window.scrollTo({
						top: targetPosition,
						behavior: 'smooth'
					});
				}
			});
		});
	}

	// Scroll indicator
	function initScrollIndicator() {
		if (!scrollIndicator) return;

		scrollIndicator.addEventListener('click', function() {
			const servicesSection = document.querySelector('#services');
			if (servicesSection) {
				const headerHeight = header.offsetHeight;
				const targetPosition = servicesSection.offsetTop - headerHeight;
				
				window.scrollTo({
					top: targetPosition,
					behavior: 'smooth'
				});
			}
		});
	}

	// Intersection Observer for animations
	function initAnimations() {
		const observerOptions = {
			threshold: 0.1,
			rootMargin: '0px 0px -50px 0px'
		};

		const observer = new IntersectionObserver(function(entries) {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.style.opacity = '1';
					entry.target.style.transform = 'translateY(0)';
				}
			});
		}, observerOptions);

		// Observe elements for animation
		const animatedElements = document.querySelectorAll('.service-card, .portfolio-item, .stat, .contact-item');
		animatedElements.forEach(el => {
			el.style.opacity = '0';
			el.style.transform = 'translateY(30px)';
			el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
			observer.observe(el);
		});

		// Portfolio hover effects
		portfolioItems.forEach(item => {
			item.addEventListener('mouseenter', function() {
				this.style.transform = 'translateY(-8px) scale(1.02)';
			});
			
			item.addEventListener('mouseleave', function() {
				this.style.transform = 'translateY(0) scale(1)';
			});
		});

		// Service card hover effects
		serviceCards.forEach(card => {
			card.addEventListener('mouseenter', function() {
				this.style.transform = 'translateY(-8px) scale(1.02)';
			});
			
			card.addEventListener('mouseleave', function() {
				this.style.transform = 'translateY(0) scale(1)';
			});
		});
	}

	// Form handling
	function initForm() {
		if (!contactForm) return;

		contactForm.addEventListener('submit', function(e) {
			e.preventDefault();

			// Get form data
			const formData = new FormData(this);
			const data = Object.fromEntries(formData);

			// Support both a single "name" field or separate first-name / last-name fields
			const name = data.name || ((data['first-name'] || '') + ' ' + (data['last-name'] || '')).trim();

			// Simple validation
			if (!name || !data.email || !data.message) {
				showNotification('Please fill in all required fields.', 'error');
				return;
			}

			const submitBtn = this.querySelector('button[type="submit"]');
			const originalText = submitBtn ? submitBtn.textContent : '';

			// If form action is a mailto:, build the mailto URL and open the user's email client
			const action = (this.getAttribute('action') || '').trim();
			if (action && action.toLowerCase().startsWith('mailto:')) {
				const to = action.slice(7).split('?')[0];
				const subject = encodeURIComponent(`New message from ${name}`);
				const bodyLines = [];
				bodyLines.push(`Name: ${name}`);
				if (data.email) bodyLines.push(`Email: ${data.email}`);
				if (data.phone) bodyLines.push(`Phone: ${data.phone}`);
				if (data.company) bodyLines.push(`Company: ${data.company}`);
				if (data.service) bodyLines.push(`Service: ${data.service}`);
				if (data.budget) bodyLines.push(`Budget: ${data.budget}`);
				if (data.timeline) bodyLines.push(`Timeline: ${data.timeline}`);
				bodyLines.push('');
				bodyLines.push('Message:');
				bodyLines.push(data.message || '');
				const body = encodeURIComponent(bodyLines.join('\n'));

				const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
				if (submitBtn) { submitBtn.textContent = 'Opening email...'; submitBtn.disabled = true; }
				// Open mail client
				window.location.href = mailto;

				setTimeout(() => {
					if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; }
					showNotification('Your email client should now be open to send the message.', 'success');
					this.reset();
				}, 600);
				return;
			}

			// Fallback: simulate form submission (e.g., when not using mailto)
			if (submitBtn) {
				submitBtn.textContent = 'Sending...';
				submitBtn.disabled = true;
			}

			setTimeout(() => {
				showNotification('Thank you! Your message has been sent successfully.', 'success');
				this.reset();
				if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; }
			}, 2000);
		});
	}

	// Notification system
	function showNotification(message, type = 'info') {
		// Remove existing notifications
		const existing = document.querySelector('.notification');
		if (existing) {
			existing.remove();
		}

		// Create notification element
		const notification = document.createElement('div');
		notification.className = `notification notification-${type}`;
		notification.innerHTML = `
			<div class="notification-content">
				<span class="notification-message">${message}</span>
				<button class="notification-close">&times;</button>
			</div>
		`;

		// Add styles
		notification.style.cssText = `
			position: fixed;
			top: 100px;
			right: 20px;
			background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
			color: white;
			padding: 16px 20px;
			border-radius: 8px;
			box-shadow: 0 10px 25px rgba(0,0,0,0.2);
			z-index: 10000;
			transform: translateX(100%);
			transition: transform 0.3s ease;
		`;

		// Add to DOM
		document.body.appendChild(notification);

		// Animate in
		setTimeout(() => {
			notification.style.transform = 'translateX(0)';
		}, 100);

		// Close functionality
		const closeBtn = notification.querySelector('.notification-close');
		closeBtn.addEventListener('click', () => {
			notification.style.transform = 'translateX(100%)';
			setTimeout(() => notification.remove(), 300);
		});

		// Auto remove after 5 seconds
		setTimeout(() => {
			if (notification.parentNode) {
				notification.style.transform = 'translateX(100%)';
				setTimeout(() => notification.remove(), 300);
			}
		}, 5000);
	}

	// Update year in footer
	function initYear() {
		const yearElement = document.getElementById('year');
		if (yearElement) {
			yearElement.textContent = new Date().getFullYear();
		}
	}

	// Work page filter functionality
	function initWorkFilter() {
		const filterButtons = document.querySelectorAll('.filter-btn');
		const portfolioItems = document.querySelectorAll('.portfolio-item');

		if (!filterButtons.length || !portfolioItems.length) return;

		filterButtons.forEach(button => {
			button.addEventListener('click', function() {
				const filter = this.getAttribute('data-filter');

				// Update active button
				filterButtons.forEach(btn => btn.classList.remove('active'));
				this.classList.add('active');

				// Filter portfolio items — support multi-value data-category (space or comma separated)
				portfolioItems.forEach(item => {
					const raw = (item.getAttribute('data-category') || '').toLowerCase();
					const categories = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
					if (filter === 'all' || categories.includes(filter)) {
						item.style.display = 'block';
						item.style.animation = 'fadeIn 0.5s ease';
					} else {
						item.style.display = 'none';
					}
				});
			});
		});
	}

	// Simple lightbox for work page with navigation
	(function initLightbox(){
		const lightbox = document.getElementById('lightbox');
		const lightboxImg = document.getElementById('lightboxImg');
		const lightboxClose = document.getElementById('lightboxClose');
		const btnPrev = document.querySelector('.lightbox-prev');
		const btnNext = document.querySelector('.lightbox-next');
		if (!lightbox || !lightboxImg) return;

		const galleryImgs = Array.from(document.querySelectorAll('.portfolio-image img'));
		if (!galleryImgs.length) return;

		let currentIndex = -1;

		function showAt(i){
			if(i < 0 || i >= galleryImgs.length) return;
			const src = galleryImgs[i].getAttribute('src');
			lightboxImg.src = src;
			lightbox.classList.add('open');
			lightbox.setAttribute('aria-hidden', 'false');
			currentIndex = i;
			// focus the close button for keyboard users
			lightboxClose && lightboxClose.focus();
		}

		function close(){
			lightbox.classList.remove('open');
			lightbox.setAttribute('aria-hidden', 'true');
			lightboxImg.src = '';
			currentIndex = -1;
		}

		function showNext(){
			if(currentIndex === -1) return;
			const nextIndex = (currentIndex + 1) % galleryImgs.length;
			showAt(nextIndex);
		}

		function showPrev(){
			if(currentIndex === -1) return;
			const prevIndex = (currentIndex - 1 + galleryImgs.length) % galleryImgs.length;
			showAt(prevIndex);
		}

		// wire click on gallery images
		galleryImgs.forEach((img, idx) => {
			img.style.cursor = 'zoom-in';
			img.addEventListener('click', () => showAt(idx));
		});

		// click outside to close
		lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
		lightboxClose && lightboxClose.addEventListener('click', close);

		// wire prev/next buttons
		if(btnPrev){
			btnPrev.addEventListener('click', (e)=>{ e.stopPropagation(); showPrev(); });
		}
		if(btnNext){
			btnNext.addEventListener('click', (e)=>{ e.stopPropagation(); showNext(); });
		}

		// keyboard navigation when lightbox open
		window.addEventListener('keydown', (e) => {
			if(!lightbox.classList.contains('open')) return;
			if (e.key === 'Escape') return close();
			if (e.key === 'ArrowRight') return showNext();
			if (e.key === 'ArrowLeft') return showPrev();
		});
	})();

	// Parallax effect for hero video
	function initParallax() {
		const heroVideo = document.querySelector('.hero-video');
		if (!heroVideo) return;

		window.addEventListener('scroll', function() {
			const scrolled = window.pageYOffset;
			const rate = scrolled * -0.5;
			heroVideo.style.transform = `translateY(${rate}px)`;
		});
	}

	// Initialize parallax on load
	window.addEventListener('load', initParallax);

	// Add loading animation
	window.addEventListener('load', function() {
		document.body.classList.add('loaded');
	});

	// Add CSS for loading state
	const style = document.createElement('style');
	style.textContent = `
		body:not(.loaded) .hero-content > * {
			opacity: 0;
			transform: translateY(30px);
		}
		
		body.loaded .hero-content > * {
			animation: slideInUp 0.8s ease-out forwards;
		}
		
		body.loaded .hero-content > *:nth-child(2) {
			animation-delay: 0.2s;
		}
		
		body.loaded .hero-content > *:nth-child(3) {
			animation-delay: 0.4s;
		}
		
		body.loaded .hero-content > *:nth-child(4) {
			animation-delay: 0.6s;
		}
	`;
	document.head.appendChild(style);

	function initTheme() {
		const storedTheme = localStorage.getItem('theme') || 'light';
		const customPrimary = localStorage.getItem('theme_primary');
		const customSecondary = localStorage.getItem('theme_secondary');
		const customAccent = localStorage.getItem('theme_accent');

		applyTheme(storedTheme);
		if (customPrimary || customSecondary || customAccent) {
			if (customPrimary) document.documentElement.style.setProperty('--primary', customPrimary);
			if (customSecondary) document.documentElement.style.setProperty('--secondary', customSecondary);
			if (customAccent) document.documentElement.style.setProperty('--accent', customAccent);
		}

		if (themeToggle) {
			updateThemeToggleIcon(storedTheme);
			themeToggle.addEventListener('click', () => {
				const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
				applyTheme(nextTheme);
				localStorage.setItem('theme', nextTheme);
				updateThemeToggleIcon(nextTheme);
				swapLogosForTheme(nextTheme);
			});
		}

		swapLogosForTheme(storedTheme);
	}

	function applyTheme(theme) {
		document.documentElement.classList.remove('light', 'dark');
		document.documentElement.classList.add(theme);
	}

	function updateThemeToggleIcon(theme) {
		const sun = document.getElementById('iconSun');
		const moon = document.getElementById('iconMoon');
		if (!sun || !moon) return;
		if (theme === 'dark') {
			sun.style.display = 'none';
			moon.style.display = 'block';
		} else {
			sun.style.display = 'block';
			moon.style.display = 'none';
		}
	}

	function swapLogosForTheme(theme) {
		const logos = document.querySelectorAll('.logo img');
		logos.forEach(img => {
			if (theme === 'dark') {
				img.src = 'logo.png';
				img.alt = 'Pensive Digital logo on dark background';
			} else {
				img.src = 'logo.png';
				img.alt = 'Pensive Digital logo on light background';
			}
		});
	}

	// Add brand text next to the header logo(s) if not already present
	function initHeaderLogoText(){
		const logos = document.querySelectorAll('.site-header .logo');
		if(!logos.length) return;
		logos.forEach(logo => {
			if(logo.querySelector('.logo-text')) return;
			const span = document.createElement('span');
			span.className = 'logo-text';
			span.textContent = 'Pensive Pixels';
			logo.appendChild(span);
		});
	}

})();