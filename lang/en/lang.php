<?php

return [
    'plugin' => [
        'name' => 'Accessibility Widget',
        'description' => 'Self-hosted accessibility toolbar (replaces UserWay) added to every front-end page'
    ],
    'settings' => [
        'description' => 'Enable the accessibility widget and set its position, colour and features'
    ],
    'permissions' => [
        'manage' => 'Manage accessibility widget settings'
    ],
    'fields' => [
        'enabled' => 'Show the accessibility widget',
        'enabled_comment' => 'Adds the widget to every page of the site. No layout changes are needed.',
        'position' => 'Button position',
        'position_right' => 'Bottom right',
        'position_left' => 'Bottom left',
        'color' => 'Button colour',
        'color_comment' => 'Pick a dark colour: the icon is always white.',
        'offset_x' => 'Distance from the side (px)',
        'offset_y' => 'Distance from the bottom (px)',
        'offset_comment' => 'Increase this if the button overlaps a cookie banner or another fixed button.',
        'hidden_features' => 'Hide these features',
        'hidden_features_comment' => 'Checked features will not appear in the widget. Leave everything unchecked to offer all of them.',
    ],
];
