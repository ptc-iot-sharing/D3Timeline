TW.IDE.Widgets.D3Timeline = function () {

    this.widgetProperties = function () {
        return {
            'name': 'D3 Timeline',
            'description': 'D3 Timeline. This widget requires CoreUI and D3 Range Chart.',
            'category': ['Common'],
	        'supportsAutoResize': true,
            'properties': {
                Width: {
                    defaultValue: 500
                },
                Height: {
                    defaultValue: 200
                },
				/********** TIMELINE PROPERTIES **********/
                TimelineData: {
                    baseType: 'INFOTABLE',
                    description: 'The dataset for the event timeline.',
                    isBindingTarget: true,
                    isVisible: true
                },
                TimelineXField: {
                    baseType: 'FIELDNAME',
                    description: 'The x field for the event timeline.',
                    sourcePropertyName: 'TimelineData',
                    isVisible: true
                },
                TimelineStateField: {
                    baseType: 'FIELDNAME',
                    description: 'The state field for the event timeline.',
                    sourcePropertyName: 'TimelineData',
                    isVisible: true
                },
                TimelineDurationField: {
                    baseType: 'FIELDNAME',
                    description: 'The duration field for the event timeline. If this field is not specified, the duration will be assumed to be until the next state starts.',
                    sourcePropertyName: 'TimelineData',
                    isVisible: true
                },
                TimelineShowsXAxis: {
					baseType: 'BOOLEAN',
					description: 'If enabled, the X axis will be duplicated at the bottom of the timeline.',
					defaultValue: false,
					isVisible: true
                },
                TimelineColorMap: {
	                baseType: 'STRING',
	                description: 'A serialized JSON object that matches states to the colors they should be drawn with.',
                    defaultValue: '{}',
                    isBindingTarget: true
                },
                TooltipMashupName: {
	            	baseType: 'MASHUPNAME',
	            	description: 'The mashup to use when displaying tooltips. If set, tooltips will appear when hovering over the chart.',
                },
                TooltipMashupPropertyBinding: {
	                baseType: 'STRING',
	                defaultValue: '{}'
                },
                TooltipMashupWidth: {
	                defaultValue: 300,
	                baseType: 'INTEGER',
	                description: 'The width of the tooltip mashup.'
                },
                TooltipMashupHeight: {
	                defaultValue: 200,
	                baseType: 'INTEGER',
	                description: 'The height of the tooltip mashup.'
                },
                TooltipMashupGravity: {
                    baseType: 'STRING',
                    description: 'Controls where the tooltip will appear relative to the timeline.',
                    defaultValue: 'above',
                    selectOptions: [
                        { value: 'above', text: 'Above' },
                        { value: 'below', text: 'Below' }
                    ]
                },
                Bordered: {
	              	defaultValue: false,
	              	baseType: 'BOOLEAN',
	              	description: 'If enabled, the states will have a subtle border'  
                },
				/********** SELECTOR PROPERTIES **********/
                RangeUpdateType: {
                    baseType: 'STRING',
                    description: 'Controls the selected range changes when new data arrives.',
                    defaultValue: 'break',
                    selectOptions: [
                        { value: 'retain', text: 'Don\'t change range' },
                        { value: 'extend', text: 'Extend when stuck to edge' },
                        { value: 'move', text: 'Move when stuck to edge' },
                        { value: 'release', text: 'Select entire range' }
                    ]
                },
                RangeStart: {
                    baseType: 'DATETIME',
                    isBindingSource: true,
                    isBindingTarget: true,
                    description: 'The currently selected range start time. If bound, the chart will select the given range start.'
                },
                RangeEnd: {
                    baseType: 'DATETIME',
                    isBindingSource: true,
                    isBindingTarget: true,
                    description: 'The currently selected range end time. If bound, the chart will select the given range end.'
                },
                DragToZoom: {
                    baseType: 'BOOLEAN',
                    defaultValue: false,
                    description: 'If enabled, the selector will be disabled and you can instead drag over the chart to zoom in or right click to zoom out.'
                },
                EnableTrackGesturesPadAndWheel: {
                    baseType: 'BOOLEAN',
                    defaultValue: true,
                    description: 'If enabled, the user can zoom and pan the chart using the mouse wheel and two finger events on macs with trackpads.'
                },
                EnableTouchGestures: {
                    baseType: 'BOOLEAN',
                    defaultValue: true,
                    description: 'If enabled, the user can zoom and pan the chart through pinch-zoom and two-finger scroll gestures on touch device.'
                },
                ShowsSelector: {
                    baseType: 'BOOLEAN',
                    description: 'If disabled, the range selector will be hidden.',
                    defaultValue: true
                },
                SelectorHeight: {
                    baseType: 'NUMBER',
                    description: 'If disabled, the range selector will be hidden.',
                    defaultValue: 48
                },
				/********** STYLE PROPERTIES **********/
                AnimationsEnabled: {
                    baseType: 'BOOLEAN',
                    defaultValue: true,
                    description: 'Enables or disables all animations.'
                },
                AnimationDuration: {
	                baseType: 'NUMBER',
	                defaultValue: 300,
	                description: 'Controls how long update animations should last. This will also affect how long the chart will wait to batch property updates together.',
	                isBindingTarget: true
                },
                XAxisStyle: {
                    baseType: 'STYLEDEFINITION',
                    description: 'The style to use for the x axis on both the main chart and the selector.'
                },
                BackgroundStyle: {
                    baseType: 'STYLEDEFINITION',
                    description: 'If set, the chart will use this style\'s background color.'
                },
                ExportFilename: {
                    baseType: 'STRING',
                    description: 'The file name used when exporting this chart as an image.',
                    defaultValue: 'export.png'
                }
			}
        };
    };

    this.widgetEvents = function () {
        return {
             Clicked: {description: 'Dispatched when a data point is clicked.'}
        }
    };

    this.widgetServices = function () {
        return {
            Export: {description: 'Downloads a PNG version of this chart as it appears when this service is invoked.'}
        }
    }

	this.afterSetProperty = function (name, value) {
        var refreshHTML = false;
		switch (name) {
			case 'Width':
			case 'Height':
				refreshHTML = true;
                break;
            default:
                break;
        }
        return refreshHTML;
    };

    this.renderHtml = function () {
        var html = '<div class="widget-content" style="background: #888;"></div>';
        return html;
    };

};
