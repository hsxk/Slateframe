# Core Search cascade and zoom acceptance

Slateframe uses WordPress Core Search markup and behavior. The presentation layer must remain bounded when Core block CSS loads before or after the theme, including the optional semantic HTML5 search wrapper.

The structural Chromium matrix checks four Core-shaped variants at seven viewports (320, 375, 390, 412, 768, 1440, 1920), LTR/RTL, 16px/64px root text, and both CSS orders: 224 combinations. It covers GET semantics, CJK/Arabic values, no horizontal overflow, 44px controls, bounded padding, and mobile input widths.

Structural browser fixtures do not prove Core JavaScript reveal, Gutenberg serialization, or editor validity. Real WordPress/Gutenberg acceptance and exact-SHA screenshots remain separate release gates. No custom search endpoint, JavaScript handler, SEO feature, or plugin behavior is introduced.
