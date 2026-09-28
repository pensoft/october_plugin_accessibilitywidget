# Accessibility Widget (Pensoft.AccessibilityWidget)

Self-hosted accessibility toolbar for October CMS sites. Replaces UserWay: no
external requests, no account, no licence.

The plugin adds the widget to every front-end page just before `</head>`, so no
theme or layout changes are needed.

## Features

Contrast (invert / dark / light), highlight links, bigger text, text spacing,
line height, pause animations, hide images, readable / dyslexia-friendly font,
big cursor, reading guide / mask, saturation, highlight focus, read aloud
(browser speech) and a page structure list of headings and landmarks.

Each visitor's choices are kept in their own browser (localStorage) and applied
again on every page.

## Installation

1. Add the repository and requirement to the site's `composer.json`:

   ```json
   "repositories": {
       "pensoft/accessibilitywidget-plugin": {
           "type": "git",
           "url": "git@github.com:pensoft/october_plugin_accessibilitywidget.git"
       }
   },
   "require": {
       "pensoft/accessibilitywidget-plugin": "^1.0"
   }
   ```

2. Run `composer update pensoft/accessibilitywidget-plugin`, then `php artisan october:migrate`.
3. Remove the UserWay `<script>` tag and any `userway` CSS from the theme.

## Settings

Backend > Settings > Accessibility Widget:

- on / off
- button position (bottom right / bottom left)
- button colour (use a dark colour: the icon is always white)
- distance from the side and bottom, e.g. to clear a cookie banner
- features to hide

## Manual use without the plugin

Copy `assets/js/a11y-widget.js` and `assets/css/a11y-widget.css` and add, inside `<head>`:

```html
<link rel="stylesheet" href="/path/a11y-widget.css">
<script src="/path/a11y-widget.js" data-position="right" data-color="#313131"></script>
```

Other attributes: `data-offset-x`, `data-offset-y` (px) and `data-hide`
(comma-separated feature ids, e.g. `speech,cursor`; `structure` hides the Page
structure button).

JavaScript API: `A11yWidget.open()`, `A11yWidget.close()`, `A11yWidget.reset()`,
`A11yWidget.getState()`.
