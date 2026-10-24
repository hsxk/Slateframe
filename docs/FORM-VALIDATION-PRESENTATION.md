# Native form validation presentation

Slateframe styles **native browser user-invalid** controls and explicit `aria-invalid="true"` fields without owning validation rules, submitting data, or introducing JavaScript. Unvisited required fields stay neutral: the theme does not use `:invalid` to paint errors before the visitor interacts. Authors and plugins remain responsible for accessible error messages, `aria-describedby`, and server-side validation.

The shared danger token and a two-pixel border distinguish invalid inputs, selects and textareas. Native checkbox and radio controls keep their platform appearance and existing 44px label targets. Keyboard focus keeps the separate global focus ring. Forced-colors mode uses the system Highlight border, rather than relying on a custom color or box shadow. Logical layout remains intact in RTL and at 200% text zoom.

`tests/browser/form-validation-states.spec.js` verifies the actual WordPress Search route (where shared form styles are enqueued), untouched versus interacted controls, explicit and native errors, CJK/Arabic labels, 320/390/1440px, LTR/RTL, forced colors, focus, no horizontal overflow, and screenshot evidence. This is presentation only, not a form plugin or client-side validation framework.
