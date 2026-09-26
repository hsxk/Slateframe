(() => {
	const root = document.documentElement;
	root.classList.add('has-js');

	const colorToggle = document.querySelector('[data-color-toggle]');
	const colorMedia = window.matchMedia('(prefers-color-scheme: dark)');

	const isDarkMode = () => {
		const explicitMode = root.dataset.slateframeColorMode;
		return explicitMode === 'dark' || (!explicitMode && colorMedia.matches);
	};

	const syncColorToggle = () => {
		if (!colorToggle) {
			return;
		}

		colorToggle.setAttribute('aria-pressed', isDarkMode() ? 'true' : 'false');
	};

	const rememberColorMode = (mode) => {
		const secure = window.location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = `slateframe_color_mode=${mode}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
	};

	if (colorToggle) {
		syncColorToggle();

		colorToggle.addEventListener('click', () => {
			const nextMode = isDarkMode() ? 'light' : 'dark';
			root.dataset.slateframeColorMode = nextMode;
			rememberColorMode(nextMode);
			syncColorToggle();
		});

		colorMedia.addEventListener?.('change', () => {
			if (!root.dataset.slateframeColorMode) {
				syncColorToggle();
			}
		});
	}

	const header = document.querySelector('[data-site-header]');
	const toggle = document.querySelector('[data-menu-toggle]');
	const nav = document.querySelector('[data-primary-nav]');

	if (!header || !toggle || !nav) {
		return;
	}

	const mediaQuery = window.matchMedia('(max-width: 900px)');
	const focusableSelector = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[tabindex]:not([tabindex="-1"])',
	].join(',');

	const menuFocusables = () => [toggle, ...nav.querySelectorAll(focusableSelector)]
		.filter((element) => element.offsetParent !== null);

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
			return;
		}

		if (event.key !== 'Tab' || !mediaQuery.matches || !header.classList.contains('is-open')) {
			return;
		}

		const focusables = menuFocusables();

		if (focusables.length < 2) {
			return;
		}

		const first = focusables[0];
		const last = focusables[focusables.length - 1];

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	});

	nav.addEventListener('click', (event) => {
		if (mediaQuery.matches && event.target.closest('a[href]')) {
			closeMenu();
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
