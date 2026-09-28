<?php namespace Pensoft\AccessibilityWidget\Models;

use Model;

class Settings extends Model
{
    public $implement = ['System.Behaviors.SettingsModel'];

    // A unique code
    public $settingsCode = 'pensoft_accessibilitywidget_settings';

    // Reference to field configuration
    public $settingsFields = 'fields.yaml';

    public function initSettingsData()
    {
        $this->enabled = true;
        $this->position = 'right';
        $this->color = '#313131';
        $this->offset_x = 20;
        $this->offset_y = 20;
        $this->hidden_features = [];
    }

    public function getHiddenFeaturesOptions()
    {
        return self::featureOptions();
    }

    /**
     * Feature ids must match the ids in assets/js/a11y-widget.js.
     *
     * @return array
     */
    public static function featureOptions()
    {
        return [
            'contrast'   => 'Contrast',
            'links'      => 'Highlight links',
            'textsize'   => 'Bigger text',
            'spacing'    => 'Text spacing',
            'animations' => 'Pause animations',
            'images'     => 'Hide images',
            'font'       => 'Readable font',
            'cursor'     => 'Big cursor',
            'guide'      => 'Reading guide',
            'lineheight' => 'Line height',
            'saturation' => 'Saturation',
            'focus'      => 'Highlight focus',
            'speech'     => 'Read aloud',
            'structure'  => 'Page structure',
        ];
    }
}
