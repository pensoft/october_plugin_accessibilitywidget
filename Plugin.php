<?php

namespace Pensoft\AccessibilityWidget;

use Event;
use Pensoft\AccessibilityWidget\Models\Settings;
use System\Classes\PluginBase;
use Url;

class Plugin extends PluginBase
{
    const ASSET_DIR = 'plugins/pensoft/accessibilitywidget/assets';

    public function pluginDetails()
    {
        return [
            'name'        => 'pensoft.accessibilitywidget::lang.plugin.name',
            'description' => 'pensoft.accessibilitywidget::lang.plugin.description',
            'author'      => 'Pensoft',
            'icon'        => 'icon-universal-access'
        ];
    }

    public function registerPermissions()
    {
        return [
            'pensoft.accessibilitywidget.manage' => [
                'tab'   => 'pensoft.accessibilitywidget::lang.plugin.name',
                'label' => 'pensoft.accessibilitywidget::lang.permissions.manage',
            ],
        ];
    }

    public function registerSettings()
    {
        return [
            'settings' => [
                'label'       => 'pensoft.accessibilitywidget::lang.plugin.name',
                'description' => 'pensoft.accessibilitywidget::lang.settings.description',
                'category'    => 'system::lang.system.categories.cms',
                'icon'        => 'icon-universal-access',
                'class'       => Settings::class,
                'order'       => 500,
                'keywords'    => 'accessibility wcag a11y userway',
                'permissions' => ['pensoft.accessibilitywidget.manage'],
            ],
        ];
    }

    /**
     * Adds the widget to every front-end page, whatever the theme or layout.
     * The tags go just before </head> so saved visitor settings are applied
     * before first paint.
     */
    public function boot()
    {
        Event::listen('cms.page.postprocess', function ($controller, $url, $page, $dataHolder) {
            if (!Settings::get('enabled', true)) {
                return;
            }

            $html = $dataHolder->content;
            if (!is_string($html) || stripos($html, '</head>') === false || strpos($html, 'a11y-widget.js') !== false) {
                return;
            }

            $dataHolder->content = preg_replace('~</head>~i', self::renderTags() . "\n</head>", $html, 1);
        });
    }

    /**
     * @return string
     */
    public static function renderTags()
    {
        $attrs = [
            'data-position' => Settings::get('position', 'right') === 'left' ? 'left' : 'right',
            'data-color'    => self::validColor(Settings::get('color')),
            'data-offset-x' => self::validOffset(Settings::get('offset_x')),
            'data-offset-y' => self::validOffset(Settings::get('offset_y')),
            'data-hide'     => implode(',', array_intersect(
                (array) Settings::get('hidden_features', []),
                array_keys(Settings::featureOptions())
            )),
        ];

        $attrHtml = '';
        foreach ($attrs as $name => $value) {
            if ($value !== null && $value !== '') {
                $attrHtml .= ' ' . $name . '="' . e($value) . '"';
            }
        }

        return '<link rel="stylesheet" href="' . e(self::assetUrl('css/a11y-widget.css')) . '">' . "\n"
            . '<script src="' . e(self::assetUrl('js/a11y-widget.js')) . '"' . $attrHtml . '></script>';
    }

    /**
     * Asset URL with the file's modification time appended, so browsers pick
     * up a new version of the plugin straight away.
     */
    protected static function assetUrl($file)
    {
        $path = self::ASSET_DIR . '/' . $file;
        $mtime = @filemtime(base_path($path));

        return Url::asset($path) . ($mtime ? '?v=' . $mtime : '');
    }

    protected static function validColor($color)
    {
        return is_string($color) && preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6})$/i', $color) ? $color : null;
    }

    protected static function validOffset($value)
    {
        return is_numeric($value) && $value >= 0 && $value <= 400 ? (string) (int) $value : null;
    }
}
