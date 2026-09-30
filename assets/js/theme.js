(() => {
	const root=document.documentElement;
	const q=document.querySelector.bind(document);
	const raf=requestAnimationFrame;
	root.classList.add('has-js');

	const colorToggle = q('[data-color-toggle]');
	const colorMedia = matchMedia('(prefers-color-scheme: dark)');
	const isDark = () => root.dataset.slateframeColorMode === 'dark' ||
		(!root.dataset.slateframeColorMode && colorMedia.matches);
	const syncColor = () => colorToggle?.setAttribute('aria-pressed', isDark() ? 'true' : 'false');
	const remember = (mode) => {
		const secure = window.location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = `slateframe_color_mode=${mode}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
	};

	if (colorToggle) {
		syncColor();
		colorToggle.addEventListener('click', () => {
			const mode = isDark() ? 'light' : 'dark';
			root.dataset.slateframeColorMode = mode;
			remember(mode);
			syncColor();
		});
		colorMedia.addEventListener?.('change', () => {
			if (!root.dataset.slateframeColorMode) syncColor();
		});
	}

	const header = q('[data-site-header]');
	const toggle = q('[data-menu-toggle]');
	const nav = q('[data-primary-nav]');
	if (!header || !toggle || !nav) return;

	const media = matchMedia('(max-width: 1280px)');
	const inner = header.querySelector('.slateframe-header-inner');
	let compact = media.matches;
	const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
	const menuItems = () => [toggle, ...nav.querySelectorAll(focusable)].filter((item) => item.offsetParent !== null);

	const close = (returnFocus = false) => {
		header.classList.remove('is-open');
		toggle.setAttribute('aria-expanded', 'false');
		nav.toggleAttribute('inert', compact);
		if (returnFocus) toggle.focus();
	};
	const open = () => {
		nav.removeAttribute('inert');
		header.classList.add('is-open');
		toggle.setAttribute('aria-expanded', 'true');
		nav.querySelector('a,button')?.focus();
	};

	toggle.addEventListener('click', () => header.classList.contains('is-open') ? close(true) : open());
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && header.classList.contains('is-open')) {
			event.preventDefault();
			close(true);
			return;
		}
		if (event.key !== 'Tab' || !compact || !header.classList.contains('is-open')) return;
		const items = menuItems();
		if (items.length < 2) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	});
	nav.addEventListener('click', (event) => {
		if (compact && event.target.closest('a[href]')) close();
	});
	document.addEventListener('pointerdown', (event) => {
		if (header.classList.contains('is-open') && !header.contains(event.target)) close();
	});

	const needsCompact = () => {
		if (media.matches || !inner) return media.matches;
		const previous = header.classList.contains('is-compact');
		header.classList.remove('is-compact');
		nav.classList.remove('is-compact');
		let wrapped=false;
		for(const link of nav.querySelectorAll(':scope>ul>li>a,.slateframe-language-slot a')){
			const whiteSpace=link.style.whiteSpace;
			link.style.whiteSpace='nowrap';
			wrapped ||= link.scrollWidth>link.clientWidth+1;
			link.style.whiteSpace=whiteSpace;
		}
		const needed=inner.scrollWidth>inner.clientWidth+1||wrapped;
		header.classList.toggle('is-compact', previous);
		nav.classList.toggle('is-compact', previous);
		return needed;
	};
	const syncNav = () => {
		const next = needsCompact();
		if (next === compact && header.classList.contains('is-compact') === next) return;
		compact = next;
		header.classList.toggle('is-compact', compact);
		nav.classList.toggle('is-compact', compact);
		close();
	};

	media.addEventListener?.('change', syncNav);
	if ('ResizeObserver' in window && inner) {
		const observer = new ResizeObserver(() => raf(syncNav));
		observer.observe(inner);
		observer.observe(nav);
	} else {
		window.addEventListener('resize', syncNav, { passive: true });
	}
	if ('MutationObserver' in window) {
		const contentObserver = new MutationObserver(() => raf(() => raf(syncNav)));
		contentObserver.observe(nav, { childList: true, characterData: true, subtree: true });
	}
	syncNav();
	close();
})();