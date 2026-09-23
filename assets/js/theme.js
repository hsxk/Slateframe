(() => {
	document.documentElement.classList.add('has-js');

	const header = document.querySelector('[data-site-header]');
	const toggle = document.querySelector('[data-menu-toggle]');
	const nav = document.querySelector('[data-primary-nav]');

	if (!header || !toggle || !nav) {
		return;
	}

	const mediaQuery = window.matchMedia('(max-width: 900px)');

	const closeMenu = (returnFocus = false) => {
		header.classList.remove('is-open');
		toggle.setAttribute('aria-expanded', 'false');

		if (mediaQuery.matches) {
			nav.setAttribute('inert', '');
		} else {
			nav.removeAttribute('inert');
		}

		if (returnFocus) {
			toggle.focus();
		}
	};

	const openMenu = () => {
		nav.removeAttribute('inert');
		header.classList.add('is-open');
		toggle.setAttribute('aria-expanded', 'true');
		nav.querySelector('a, button')?.focus();
	};

	toggle.addEventListener('click', () => {
		if (header.classList.contains('is-open')) {
			closeMenu(true);
		} else {
			openMenu();
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && header.classList.contains('is-open')) {
			event.preventDefault();
			closeMenu(true);
		}
	});

	document.addEventListener('pointerdown', (event) => {
		if (header.classList.contains('is-open') && !header.contains(event.target)) {
			closeMenu();
		}
	});

	mediaQuery.addEventListener?.('change', () => closeMenu());
	closeMenu();
})();
