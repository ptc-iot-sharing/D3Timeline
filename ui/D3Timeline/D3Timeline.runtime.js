window.BMCollectionViewMashupDefinitionCache = window.BMCollectionViewMashupDefinitionCache || {};

/**
 * An object that renders and controls a timeline.
 * In order to work, the BMTimeline must have a BMTimelineDataSet object associated with it.
 * The BMTimelineDataSet object is responsible for providing the timeline with information about the states it should draw
 * including their start times, durations, color and names.
 */
function BMTimeline() {};

/**
 The prototype for a BMTimelineDataSet object that manages the contents drawn by a BMTimeline
 
 **
 * A property that should provide the timeline with an array of objects that represents the set of states that
 * should be rendered. There is no requirement about the actual contents of the objects in this array - these objects
 * will be provided back to the data set object when the timeline needs any specific information about them.
 *
 get timelineDataArray() // <[AnyObject]>
 
 **
 * Invoked by the timeline to obtain the starting timestamp for the given data point.
 * The data set object should return a Date object or a Number representing the unix timestamp for when this state begins.
 * @param timeline <BMTimeline>				The calling timeline.
 * @param dataPoint <AnyObject>				The data point.
 * {
 *	@param atIndex <Int>					The index of the data point in the data array returned by the timelineDataArray property.
 * }
 * @return <Number>							The data point's starting timestamp.
 *
 function timelineStartingTimestampForDataPoint(timeline, dataPoint, {atIndex: index});
 
 **
 * Invoked by the timeline to obtain the state duration for the given data point.
 * The data set object should return a Number representing the state's duration in miliseconds.
 * @param timeline <BMTimeline>				The calling timeline.
 * @param dataPoint <AnyObject>				The data point.
 * {
 *	@param atIndex <Int>					The index of the data point in the data array returned by the timelineDataArray property.
 * }
 * @return <Number>							The data point's duration.
 *
 function timelineDurationForDataPoint(timeline, dataPoint, {atIndex: index});
 
 **
 * Invoked by the timeline to obtain a unique identifier for a given data point. This will be used by the timeline during updates so it can tell
 * which data points were added, removed or changed.
 * The data set object should return a String or an object that may be converted to a string representing the state's unique identifier.
 * @param timeline <BMTimeline>				The calling timeline.
 * @param dataPoint <AnyObject>				The data point.
 * {
 *	@param atIndex <Int>					The index of the data point in the data array returned by the timelineDataArray property.
 * }
 * @return <String>							The data point's unique identifier.
 *
 function timelineIdentifierForDataPoint(timeline, dataPoint, {atIndex: index});
 
 **
 * Invoked by the timeline to obtain the state color for a given data point.
 * The data set object should return a hex color String that will be used as the color when rendering this data point.
 * @param timeline <BMTimeline>				The calling timeline.
 * @param dataPoint <AnyObject>				The data point.
 * {
 *	@param atIndex <Int>					The index of the data point in the data array returned by the timelineDataArray property.
 * }
 * @return <String>							The data point's color.
 *
 function timelineColorForDataPoint(timeline, dataPoint, {atIndex: index});
 
 */

BMTimeline.prototype = {

	/**
	 * The container in which this timeline should be rendered
	 */
	_container: undefined, // <D3SVG>
	
	/**
	 * The unique HTML ID used by this timeline.
	 */
	ID: undefined, // <String>
	
	/**
	 * Must be set before assigning a data set.
	 * If set to YES, the states will have a subtle border.
	 */
	drawsBorder: NO, // <Boolean>
	
	/**
	 * The data set from which this timeline derives its data.
	 */
	_dataSet: undefined, // <BMTimelineDataSet>
	get dataSet() { return this._dataSet; },
	set dataSet(dataSet) {
		this._dataSet = dataSet;
		
		if (!this._initialized) {
			this._init();
		}
			
		this._updateAnimated(YES);
	},
	
	/**
	 * The rect in which the timeline should be rendered.
	 * The position of this rect will be relative to the timeline's container element.
	 */
	_frame: undefined, // <BMRect>
	get frame() { return this._frame; },
	set frame(frame) {
		this.setFrame(frame);
	},
	
	/**
	 * Changes the area in which this timeline is rendered.
	 * Optionally, this change may be animated.
	 * This frame does not include the selector and axis.
	 * @param frame <BMRect>					The new frame.
	 * {
	 *	@param animated <Boolean, nullable>		Defaults to NO. If set to YES, this change will be animated, otherwise it will be instant.
	 * }
	 */
	setFrame: function(frame, options) {
		this._frame = frame.copy();
		if (!this._initialized) return;
		
		var animated = options && options.animated;
		
		// Update the clip path to the new frame
		var clip = animated ? this._clip.transition().duration(300) : this._clip;
		clip.attr('width', frame.size.width).attr('height', frame.size.height);
		
		// Move the SVG group to the new origin point
		var group = animated ? this._group.transition().duration(300) : this._group;
		group.attr('transform', 'translate(' + frame.origin.x + ', ' + frame.origin.y + ')');
		
		// Redraw the timeline
		this._updateAnimated(options && options.animated);
	},
	
	_scale: undefined, // <D3TimeScale>
	get scale() { return this._scale; },
	set scale(scale) {
		this.setScale(scale);
	},
	
	/**
	 * Changes the time scale used by this timeline.
	 * Optionally, this change may be animated.
	 * This frame does not include the selector and axis.
	 * @param scale <D3TimeScale>				The new time scale.
	 * {
	 *	@param animated <Boolean, nullable>		Defaults to NO. If set to YES, this change will be animated, otherwise it will be instant.
	 * }
	 */
	setScale: function(scale, options) {
		this._scale = scale;
		if (!this._initialized) return;
		
		var animated = options && options.animated;
		
		
		// Select all the rects that make up this timeline.
		var rects = this._group.selectAll('rect').data(this._dataSet.timelineDataArray, function (d, i) { 
			return self._dataSet.timelineIdentifierForDataPoint(self, d, {atIndex: i}); 
		});
			
		// Create a D3 transition if this change is animated.
		var transition = animated ? rects.transition().duration(300) : rects;
		
		// The scale origin is used to adjust the returned width
		var scaleOrigin = self._scale(0);
		
		transition.attr('height', this._frame.size.height)
			.attr('y', 0)
			.attr('x', function (d, i) { 
				return self._scale(self._dataSet.timelineStartingTimestampForDataPoint(self, d, {atIndex: i}));
			})
			.attr('width', function (d, i) {
				return self._scale(self._dataSet.timelineDurationForDataPoint(self, d, {atIndex: i})) - scaleOrigin;
			});
		
	},
	
	/**
	 * Must be invoked after creation, when the data set becomes available.
	 */
	_init: function () {
		this._createContainers();
		
		this._initialized = YES;
	},
	
	/**
	 * Invoked during initialization to create the SVG group in which this timeline will be rendered.
	 * This will also create the clip rect for the timeline.
	 */
	_createContainers: function () {
		// Construct the clip path
		this._clip = this._container.append('defs').append('clipPath').append('rect');
		this._clip.attr('id', 'clip-' + this.ID)
			.attr('width', this._frame.size.width)
			.attr('height', this._frame.size.height);
		
		// Construct the timeline SVG group
		this._group = this._container.append('g');
		
		this._group.attr('class', 'timeline')
				.attr('transform', 'translate(' + this._frame.origin.x + ', ' + this._frame.origin.y + ')')
				.attr('clip-path', 'url(#clip-' + this.ID + ')');
	},
	
	/**
	 * Updates this timeline.
	 * This method should be called whenever the data set changes.
	 * @param animated <Boolean, nullable>		Defaults to `false`. Controls whether this change should be animated.
	 * {
	 * 	@param updateColors <Boolean, nullable>	Defaults to `false`. Controls whether the colors should be updated.
	 * }
	 */
	_updateAnimated: function (animated, {updateColors = false} = {updateColors: false}) {
		var self = this;
		
		// Select all the rects that make up this timeline
		var rects = this._group.selectAll('rect').data(this._dataSet.timelineDataArray, function (d, i) { 
			return self._dataSet.timelineIdentifierForDataPoint(self, d, {atIndex: i}); 
		});
		
		// The update happens in 3 steps:
		// 1. data points that are no longer in the data set will be removed
		// 2. new data points are added to the timeline
		// 3. existing points that have changed will transition to their new positions and sizes
		
		// First remove the deleted data points - these should animate to a height and opacity of 0.
		// A D3 transition is created if this change should be animated
		var transition = animated ? rects.exit().transition().duration(300) : rects.exit();
		transition.attr('height', 0)
			.attr('y', this._frame.size.height)
			.attr('fillOpacity', 1e-6)
			.remove();
		
		// The scale origin is used to adjust the returned width
		var scaleOrigin = self._scale(0);
			
		// Then create the new data points - these should animate from a height and opacity of 0.
		// In this step, the new data point rects are just created with their initial attributes
		// They will transition to their final state together with the changed data points in a later step.
		var newRects = rects.enter().append('rect')
			.attr('height', 0)
			.attr('y', this._frame.size.height)
			.attr('x', function (d, i) { 
				return self._scale(self._dataSet.timelineStartingTimestampForDataPoint(self, d, {atIndex: i}));
			})
			.attr('width', function (d, i) {
				return self._scale(self._dataSet.timelineDurationForDataPoint(self, d, {atIndex: i})) - scaleOrigin;
			})
			.attr('fillOpacity', 1e-6)
			.attr('fill', function (d, i) {
				return self._dataSet.timelineColorForDataPoint(self, d, {atIndex: i});
			});
			
		if (self.drawsBorder) {
			newRects.style('stroke', self._dataSet.timelineStrokeColor(self)).style('stroke-width', '1px').style('stroke-opacity', .1)
		}
			
		// Finally, both the newly created and all other points should transition to their final state
		transition = animated ? rects.transition().duration(300) : rects;
		
		transition.attr('height', this._frame.size.height)
			.attr('y', 0)
			.attr('x', function (d, i) { 
				return self._scale(self._dataSet.timelineStartingTimestampForDataPoint(self, d, {atIndex: i}));
			})
			.attr('width', function (d, i) {
				return self._scale(self._dataSet.timelineDurationForDataPoint(self, d, {atIndex: i})) - scaleOrigin;
			})
			.attr('fillOpacity', 1);
		
		if (updateColors) {
			transition.attr('fill', function (d, i) {
				return self._dataSet.timelineColorForDataPoint(self, d, {atIndex: i});
			});
		}
		
	},
	
	
	/**
	 * Updates this timeline.
	 * This method should be called whenever the data set changes.
	 * @param animated <Boolean, nullable>		Defaults to `false`. Controls whether this change should be animated.
	 * {
	 * 	@param updateColors <Boolean, nullable>	Defaults to `false`. Controls whether the colors should be updated.
	 * }
	 */
	updateAnimated: function (animated, args) {
		this._updateAnimated(animated, args);
	}
	
};

/**
 * Constructs and returns a timeline object.
 * The object will render a timeline in the given container when it receives a data set.
 * @param container <D3SVGNode>			The D3 SVG node in which the timeline will be rendered.
 * {
 *	@param frame <BMRect>				The area relative to the container in which the timeline will be rendered.
 *	@param ID <String>					The unique HTML ID used by this timeline.
 * }
 * @return <BMTimeline>					A timeline.
 */
function BMTimelineMakeWithContainer(container, options) {
	var timeline = new BMTimeline();
	
	timeline._container = container;
	timeline._frame = options.frame;
	timeline.ID = options.ID;
	
	return timeline;
};

// A color used for negative states.
var _BMTimelineNegativeColor = "#F44336";

// A color used for positive states.
var _BMTimelinePositiveColor = "#4CAF50";


TW.Runtime.Widgets.D3Timeline = function () { // <BMTimelineDataSet>

	var self = this;
	
	/**
	 * The D3 SVG node containing the timeline and all of its accessory views.
	 */
	var svg = undefined; // <D3SVG>
	
	/**
	 * The duration used for all animations, in miliseconds.
	 */
	var animationDuration = 300; // <Number>
	
	/**
	 * The timeline object managed by this widget.
	 */
	var timeline = undefined; // <BMTimeline>
	
	/**
	 * The D3 time scale used for the timeline.
	 */
	var scale = undefined;
	
	/**
	 * Controls whether or not the X axis will be drawn below the timeline.
	 */
	var showsXAxis = NO; // <Boolean>
	
	/**
	 * Controls whether or not the tooltips will be visible when hovering over the timeline.
	 */
	var showsTooltips = NO; // <Boolean>
	
	/**
	 * The axis components.
	 */
	var axis, axisSVGGroup; // <D3Axis>, <D3SVGGroup>
	
	/**
	 * The tooltip components.
	 */
	var hoverOverlayRect, hoverGroup; // <D3Rect>, <D3SVGGroup>
	
	/**
	 * These variables contain the various field names as selected by the user when configuring the D3 Timeline widget.
	 */
	var stateField, XField, durationField; // <String>, <String>, <String>
	
	/**
	 * The color map used to match states to colors when rendering the timeline.
	 */
	var colorMap; // <Object<String, String>

	/**
	 * An auto-generated color map containing colors for the states which do not have a specific color associated.
	 */
	var defaultColorMap; // <Object<String, String>>

	defaultColorMap = {
		YES: _BMTimelinePositiveColor,
		Yes: _BMTimelinePositiveColor,
		yes: _BMTimelinePositiveColor,
		TRUE: _BMTimelinePositiveColor,
		True: _BMTimelinePositiveColor,
		true: _BMTimelinePositiveColor,
		ON: _BMTimelinePositiveColor,
		On: _BMTimelinePositiveColor,
		on: _BMTimelinePositiveColor,
		OK: _BMTimelinePositiveColor,
		Ok: _BMTimelinePositiveColor,
		ok: _BMTimelinePositiveColor,
		RUNNING: _BMTimelinePositiveColor,
		Running: _BMTimelinePositiveColor,
		running: _BMTimelinePositiveColor,
		ONLINE: _BMTimelinePositiveColor,
		Online: _BMTimelinePositiveColor,
		online: _BMTimelinePositiveColor,
		NO: _BMTimelineNegativeColor,
		No: _BMTimelineNegativeColor,
		no: _BMTimelineNegativeColor,
		FALSE: _BMTimelineNegativeColor,
		False: _BMTimelineNegativeColor,
		false: _BMTimelineNegativeColor,
		OFF: _BMTimelineNegativeColor,
		Off: _BMTimelineNegativeColor,
		off: _BMTimelineNegativeColor,
		ERROR: _BMTimelineNegativeColor,
		Error: _BMTimelineNegativeColor,
		error: _BMTimelineNegativeColor,
		OFFLINE: _BMTimelineNegativeColor,
		Offline: _BMTimelineNegativeColor,
		offline: _BMTimelineNegativeColor
	}

	/**
	 * The index of the last used default color.
	 */
	var defaultColorsIndex = -1; // <Int>

	/**
	 * An array containing a list of default colors.
	 */
	var defaultColors = ["#3F51B5", "#FFC107", "#9C27B0", "#795548", "#607D8B", "#03A9F4", "#009688", "#E91E63", "#CDDC39", "#FF5722"]; // <[String]>
	
	/**
	 * The current data array.
	 */
	var data; // <[AnyObject]>

	/**
	 * The date bisector is a D3 component that finds the closest left or right index in the data set that corresponds to a given date.
	 */
	var eventHandlerDateBisector = d3.bisector(function(d) { return d[XField]; });
	
	/**
	 * The tooltip mashup attributes.
	 */
	var tooltipMashupName, tooltipMashupPropertyBinding, tooltipMashupSize; // <String>, <Object<String, String>>, <BMSize>
	
	/**
	 * The tooltip mashup components.
	 */
	var tooltipMashupContainer, tooltipMashup, tooltipMashupKnob; // <$>, <TWMashup>, <$>
	
	/**
	 * The tooltip mashup's position relative to the timeline.
	 */
	var tooltipMashupGravity = 'above'; // <String>
		
	/**
	 * Invoked by the runtime to get the base contents of the widget.
	 * @return <String>		The HTML content.
	 */
    this.renderHtml = function () {
		return '<div class="widget-content BMD3Timeline" style="overflow: hidden;"></div>';
    };
    
    /**
	 * Extracts the actual text size in pixels from the given Thingworx text size style attribute.
	 * @param textSize <String>		The Thingworx text size.
	 */
    function textSizeWithTWTextSize(textSize) {
		var textSize = TW.getTextSize(textSize);
		textSize = textSize.substring(textSize.indexOf(':') + 1, textSize.length - 1);
		return textSize;
    };

	/**
	 * Invoked by the runtime after the HTML content has been added to the page.
	 */
	this.afterRender = function() {
		showsXAxis = self.getProperty('TimelineShowsXAxis');
		
		// Get the field name properties
		stateField = self.getProperty('TimelineStateField');
		XField = self.getProperty('TimelineXField');
		durationField = self.getProperty('TimelineDurationField');
		
		// Get the color map property
		try {
			colorMap = JSON.parse(self.getProperty('TimelineColorMap'));
		}
		catch (e) {
			colorMap = {};
		}
		
		// Construct the frame for the timeline
		var frame = BMRectMake(0, 0, self.getProperty('Width'), self.getProperty('Height'));
		if (showsXAxis) {
			// If the X axis is visible, 20 pixels will be reserved at the bottom of the screen for it.
			frame.size.height -= 20;
		}
		
		// Construct the time scale
		scale = d3.time.scale().range([0, frame.size.width]);
		
		svg = d3.select('#' + self.jqElementId).append('svg');
		svg.attr('class', 'graphRoot')
			.attr('width', self.getProperty('Width'))
			.attr('height', self.getProperty('Height'));
		
		// Construct the timeline object
		timeline = BMTimelineMakeWithContainer(svg, {frame: frame, ID: self.jqElementId});
		timeline.scale = scale;
		self.timeline = timeline;
		
		timeline.drawsBorder = self.getProperty('Bordered') || NO;
		
		if (showsXAxis) {
			// Construct the axis components if needed
			axisSVGGroup = svg.append('g');
			axisSVGGroup.attr('class', 'x axis axis3')
					.attr('transform', 'translate(' + frame.origin.x + ', ' + frame.bottom + ')')
					.style('font-family', '"Open Sans"')
					.style('font-size', 14);
					
			axis = d3.svg.axis().scale(scale).orient('bottom');
		}
		
		if (tooltipMashupName = self.getProperty('TooltipMashupName')) {
			showsTooltips = YES;
			
			try {
				tooltipMashupPropertyBinding = JSON.parse(self.getProperty('TooltipMashupPropertyBinding'));
			}
			catch (e) {
				tooltipMashupPropertyBinding = {};
			}
			
			tooltipMashupSize = BMSizeMake(self.getProperty('TooltipMashupWidth'), self.getProperty('TooltipMashupHeight'));
			
			// Construct the tooltip elements
			tooltipMashupContainer = $('<div class="D3TimelineTooltip" style="position: absolute; width: ' + tooltipMashupSize.width + 'px; height: ' + tooltipMashupSize.height + 'px; border-radius: 4px; background: white; visibility: hidden; left: 0px; top: 0px; z-index: 4000;"></div>');
			
			tooltipMashupContainer.css({boxShadow: BMShadowForElevation(3, {drawOutline: YES})});
			BMHook(tooltipMashupContainer, {transformOriginX: '50%', transformOriginY: '100%', scaleX: .9, scaleY: .9, opacity: 0});
			
			// Add a knob to the tooltip balloon
			tooltipMashupGravity = self.getProperty('TooltipMashupGravity') || 'above';
			tooltipMashupKnob = $('<div id="knob-' + self.jqElementId + '" class="GravityKnob" style="width: 16px; height: 16px; background: white;"></div>');
			
			if (tooltipMashupGravity == 'above') {
				tooltipMashupKnob.addClass('GravityKnobAbove');
			}
			else {
				tooltipMashupKnob.addClass('GravityKnobBelow');
			}
			
			tooltipMashupContainer.append(tooltipMashupKnob);
			
			// Add the tooltip balloon to the mashup
			$(document.body).append(tooltipMashupContainer);
			
			// Load the mashup
			tooltipMashup = self.renderMashupNamed(tooltipMashupName, {inContainer: tooltipMashupContainer});
			
		}
		
		if (showsTooltips) {
			self.initializeTooltips();
		}
	};

	/**
	 * Invoked by the runtime whenever a responsive widget is resized.
	 * @param width <Int>		The new width.
	 * @param height <Int>		The new height.
	 */
	this.resize = function (width, height) {
		// Resize the SVG container
		svg.attr('width', width)
			.attr('height', height);
		
		// Construct the frame for the timeline
		var frame = BMRectMake(0, 0, width, height);
		if (showsXAxis) {
			// If the X axis is visible, 20 pixels will be reserved at the bottom of the screen for it.
			frame.size.height -= 20;
		}
			
		// Resize the scale
		scale.range([0, frame.size.width]);
		
		timeline.frame = frame;
		
		if (showsXAxis) {
			// Update the axis if needed
			axisSVGGroup.attr('transform', 'translate(' + frame.origin.x + ', ' + frame.bottom + ')');
			axisSVGGroup.call(axis);
		}

		if (hoverOverlayRect) {
			hoverOverlayRect.attr('width', timeline.frame.size.width)
				.attr('height', timeline.frame.size.height);
		}
		
		if (showsTooltips) {
			self.initializeTooltips();
		}
	};

	/**
	 * Invoked by the runtime whenever any bound property is updated.
	 * {
	 *	@param TargetProperty <String>				The updated property's name.
	 *	@param SinglePropertyValue <AnyObject>		The updated property's new value.
	 * 	@param RawSinglePropertyValue <AnyObject>	The updated property's new value, as it was sent by the update source, without any type coercions.
	 *	@param ActualDataRows <[Object]>			For infotable properties, the rows array of the infotable.
	 * }
	 */
	this.updateProperty = function(updatePropertyInfo) {
		var property = updatePropertyInfo.TargetProperty;
		
		if (property == 'TimelineData') {
			self.dispatchUpdateWithType(property, {contents: updatePropertyInfo.ActualDataRows});
		}
		else if (property == 'TimelineColorMap') {
			self.dispatchUpdateWithType(property, {contents: updatePropertyInfo.SinglePropertyValue});
		}
	};





	/***************************************** UPDATES ****************************************/

	// For the Timeline widget, updates happen somewhat differently than most widgets.
	// Because it is highly configurable at runtime, there are multiple properties that affect the widget's configuration;
	// Whenever any of these properties are changed, the configuration has to be partially recreated and the data updated to match it.
	// Because of the way that property updates normally happen in Thingworx, there is no way to detect if multiple properties are
	// updated at the same time from the same source and in these cases a lot of extra work has to be done since the configuration and data
	// are repeatedly updated.
	// To optimize this, all property updates are handed off to D3Timeline.dispatchUpdateWithType(type, {contents: contents, delay: delay}) which batches all
	// property updates until the next event processing loop.
	// Additionally, multiple updates on the same property are ignored; only the last update of the same type will be processed

	/**
	 * The list of updates that need to be processed.
	 */
	var pendingUpdates = {};

	/**
	 * A token indicating whether there are already updates waiting to be processed or not.
	 */
	var pendingUpdateToken;

	/**
	 * Dispatches the given update so it is processed on the next run loop.
	 * This allows multiple successive updates to be processed together and in the same order.
	 * For instance, if the same service returns both the data set and the associated y fields, it is possible that
	 * the D3 Range Chart will first receive the new data and attempt to display it even though the old y fields are no longer available.
	 * @param type <String>				The property associated with the update.
	 * {
	 *	@param contents <AnyObject>		The update contents. The actual value contained in this parameter depends on the update type.
	 *	@param delay <Int, nullable>	Defaults to the animation duration, unless this value is greater than 500.
	 *									A delay to wait for other updates before processing them. A delay of 0 means that
	 *									the update processing will happen as soon as the current and other scheduled events have finished processing.
	 *									In practice, this means that the default only handles the cases where all updates come from the same service.
	 *									If updates are already scheduled, this parameter is ignored.
	 * }
	 */
	this.dispatchUpdateWithType = function (type, options) {
		// Add the update to the pending updates
		pendingUpdates[type] = options.contents;

		if (!pendingUpdateToken) {
			// Schedule the update if it wasn't already
			pendingUpdateToken = window.setTimeout(this.handleUpdates, options.delay === undefined ? Math.min(500, animationDuration) : options.delay);
		}
	};

	/**
	 * Invoked when updates should be handled. This function will be invoked on the global context.
	 */
	this.handleUpdates = function () {
		pendingUpdateToken = undefined;

		// These control variables decide which structure/data updates should happen at the end of the update loop
		var dataUpdateNeeded = NO;
		var colorUpdateNeeded = NO;

		if ('TimelineColorMap' in pendingUpdates) {
			dataUpdateNeeded = YES;
			colorUpdateNeeded = YES;
		}
		
		if ('TimelineData' in pendingUpdates) {
			data = pendingUpdates.TimelineData;

			var dataLength = data.length;
			
			// If the duration field is missing, the duration for each state must be computed
			if (!durationField) {
				
				for (var i = 0; i < dataLength; i++) {
					data[i]['__D3Timeline__duration__' + XField] = (i == dataLength - 1 ? Date.now() - data[i][XField] : data[i + 1][XField] - data[i][XField]);
				}
				
			}

			// Create the default color map for missing states
			for (var i = 0; i < dataLength; i++) {
				if (!colorMap[data[i][stateField]] && !defaultColorMap[data[i][stateField]]) {
					defaultColorsIndex++;

					if (defaultColorsIndex == defaultColors.length) defaultColorsIndex = 0;

					defaultColorMap[data[i][stateField]] = defaultColors[defaultColorsIndex];
				}
			}
			
			// Find the data extents
			var startingExtent = d3.min(data, function (d) { return d[XField]; });
			var endingExtent = d3.max(data, durationField ? 
				function (d) { return (+d[XField]) + (+d[durationField]); } : 
				function (d) { return (+d[XField]) + (+d['__D3Timeline__duration__' + XField]); }
			);
			
			// Set the scale domain
			scale.domain([+startingExtent, +endingExtent]);
			
			self.timelineDataArray = data;
			if (!timeline.dataSet) {
				// Set the timeline data set object to self when the data first arrives
				timeline.dataSet = self;
				
				// Draw the axis if needed
				if (showsXAxis) {
					axisSVGGroup.transition().duration(300).call(axis);
				}
				
				// Bring the hover overlay rect back to the front if needed
				if (hoverOverlayRect) {
					svg.node().appendChild(hoverOverlayRect.node());
					//hoverOverlayRect.node().parentNode.appendChild(hoverOverlayRect.node());
				}
				
			}
			else {
				// Otherwise instruct the timeline to re-render
				dataUpdateNeeded = YES;
			}
		}
		
		if (dataUpdateNeeded && data) {
			timeline.updateAnimated(YES, {updateColors: colorUpdateNeeded});
			
			// Update the axis if needed
			if (showsXAxis) {
				axisSVGGroup.transition().duration(300).call(axis);
			}
		}

		// Reset the pending updates
		pendingUpdates = {};
	};
	
	this.initializeTooltips = function () {
		    
		// Add the event receiver
		hoverOverlayRect = svg.append('rect');
		hoverOverlayRect.attr('width', timeline.frame.size.width)
			.attr('height', timeline.frame.size.height)
			.attr('fill', 'none')
			.attr('pointer-events', 'all');
			
		self.eventHandlersInitialize();
	};
	
	this.eventHandlersInitialize = function () {
		var eventHandlerSVGOverlayNode = hoverOverlayRect.node();
	
		// Generic mouse events
		hoverOverlayRect.on('mouseover', function () { self.pointerDidEnterChartWithEvent(d3.event, {coordinates: d3.mouse(this)}); } );
		hoverOverlayRect.on('mousemove', function () {
			var mouseCoordinates = d3.mouse(this);
			self.pointerDidMoveWithEvent(d3.event, {coordinates: mouseCoordinates});
		});
		hoverOverlayRect.on('mouseout', function () { self.pointerDidExitChartWithEvent(d3.event, {coordinates: d3.mouse(this)}); } );
		
		hoverOverlayRect.on('click', function () { self.pointerDidClickWithEvent(d3.event)});
	};


	/**
	 * Invoked when the mouse first enters the chart, or, on a touch device, when the user first touches inside the chart.
	 * @param event <Event>				The DOM event that triggered this callback.
	 * {
	 * 	@param coordinates <[x, y]>		An array containing the coordinates. Element 0 is the X coordinate and element 1 is they Y coordinate.
	 * }
	 */
	this.pointerDidEnterChartWithEvent = function (event, options) {
		self.pointerDidMoveWithEvent(event, {coordinates: options.coordinates});
		self.tooltipElementsSetHidden(NO);
	};


	/**
	 * Invoked when the mouse moves over the chart, or, on a touch device, when the user drags inside the chart.
	 * @param event <Event>				The DOM event that triggered this callback.
	 * {
	 * 	@param coordinates <[x, y]>		An array containing the coordinates. Element 0 is the X coordinate and element 1 is they Y coordinate.
	 * }
	 */
	this.pointerDidMoveWithEvent = function (event, options) {
		event.preventDefault();
		self.tooltipElementsUpdateForDeviceX(options.coordinates[0], {withEvent: event});
	};

	/**
	 * Invoked when the mouse exits the chart, or, on a touch device, when the user stops touching the chart.
	 * @param event <Event>				The DOM event that triggered this callback.
	 * {
	 * 	@param coordinates <[x, y]>		An array containing the coordinates. Element 0 is the X coordinate and element 1 is they Y coordinate.
	 * }
	 */
	this.pointerDidExitChartWithEvent = function (event, options) {
		self.tooltipElementsSetHidden(YES);
	};

	/**
	 * Invoked when the mouse clicks the chart, or, on a touch device, when the user taps on the chart.
	 * @param event <Event>				The DOM event that triggered this callback.
	 */
	this.pointerDidClickWithEvent = function (event, options) {
		// Update the selection to the current index
		if (self.currentDataIndex) {
			self.updateSelection('TimelineData', [self.currentDataIndex]);
		}
		
		// Trigger the clicked event
		self.jqElement.triggerHandler('Clicked');
	};


	/**
	 * Hides or shows all the tooltip elements.
	 * @param hidden <Boolean, nullable>		Defaults to YES. If set to YES, the elements will be hidden, otherwise they will be made visible.
	 */
	this.tooltipElementsSetHidden = function (hidden) {
		if (hidden === undefined) hidden = YES;
		
		tooltipMashupContainer.velocity('stop');
		
		if (hidden) {
			tooltipMashupContainer.velocity({
				scaleX: .9, scaleY: .9, opacity: 0, translateZ: 0
			}, {
				duration: 150, easing: 'easeInQuad', visibility: 'hidden'
			});
		}
		else {
			tooltipMashupContainer.velocity({
				scaleX: 1, scaleY: 1, opacity: 1, translateZ: 0
			}, {
				duration: 150, easing: 'easeOutQuad', visibility: 'visible'
			});
		}
	};


	/**
	 * Updates the tooltip elements to the correct values and positions for the given event.
	 * @param x <Int>				The x pixel position.
	 * {
	 *	@param withEvent <Event>	The event for which the tooltips should be updated.
	 * }
	 */
	this.tooltipElementsUpdateForDeviceX = function (deviceX, options) {

		if (deviceX < 0) deviceX = 0;
		if (deviceX > timeline.frame.size.width) deviceX = timeline.frame.size.width;

		// The date that corresponds to the hovered area
		var date = +scale.invert(deviceX);
				
		var timelineDataIndex = eventHandlerDateBisector.left(data, date) - 1;
		if (isNaN(timelineDataIndex)) timelineDataIndex = 0;

		if (timelineDataIndex < data.length && timelineDataIndex >= 0) {
			var timelineDataPoint = data[timelineDataIndex];
			var label = timelineDataPoint[stateField];
		}
		else {
			label = 'Unknown state';
		}
		
		if (self.currentDataIndex != timelineDataIndex) {
			self.currentDataIndex = timelineDataIndex;
			self.updateTooltipWithDataPointAtIndex(self.currentDataIndex);
		}

		self.positionTooltipWithDeviceX(deviceX);
		
	};
	
	/**
	 * Moves the tooltip balloon to the given device X position.
	 * @param x <Number>			The X position at which to position the tooltip.
	 */
	this.positionTooltipWithDeviceX = function (x) {
		var chartPosition = self.jqElement.offset();
		
		var left = (chartPosition.left + x - tooltipMashupSize.width / 2) | 0;
		var knobTranslation = 0;
		
		// If the left position moves outside the visible area, translate the knob instead
		if (left < 8) {
			knobTranslation = left - 5;
			left = 8;
		}
		
		if (left + tooltipMashupSize.width > window.innerWidth - 8) {
			knobTranslation = left + tooltipMashupSize.width - window.innerWidth + 8;	
			left = window.innerWidth - tooltipMashupSize.width - 8;
		}
		
		var chartTopPosition = chartPosition.top;
		
		var tooltipTopPosition = tooltipMashupGravity == 'above' ? (chartTopPosition - tooltipMashupSize.height - 8) + 'px' : (chartTopPosition + self.getProperty('Height') + 8) + 'px';
		
		// Position the tooltip balloon
		BMHook(tooltipMashupContainer, {left: left + 'px', top: tooltipTopPosition, transformOriginX: 'calc(50% + (' + knobTranslation + ')px)'});
		
		// Position the balloon's knob
		tooltipMashupKnob.css({left: 'calc(50% + ' + knobTranslation + 'px)'})
	};
	
	/**
	 * Updates the parameters of the tooltip mashup with the values from the data point at the specified index.
	 * @param index <Int>			The index of the data point to use.
	 */
	this.updateTooltipWithDataPointAtIndex = function (index) {
		var dataPoint = data[index];
		if (!dataPoint) return;
		
		try {
			for (var key in tooltipMashupPropertyBinding) {
				tooltipMashup.setParameter(tooltipMashupPropertyBinding[key], dataPoint[key]);
			}
		}
		catch (e) {
			
		}
	};
	
	/**
	 * Should be invoked to construct the mashup with the given name within the specified container.
	 * @param name <String>													The mashup's name.
	 * {
	 *	@param inContainer <$>												The container in which the mashup should be rendered.
	 *	@param withParameters <Dictionary<String, AnyObject>, nullable>		An optional list of parameters to pass to the mashup.
	 * }
	 * @return <TWMashup>													The created mashup object.
	 */
	this.renderMashupNamed = function (name, options) {
		var mashupDefinition;
		if (mashupDefinition = BMCollectionViewMashupDefinitionCache[name]) {
			return self.renderMashupWithDefinition(mashupDefinition, {inContainer: options.inContainer, parameters: options.withParameters});
		}
		else {
			// Load the mashup's definition if it doesn't already exist 
			// TODO maybe make asnyc?
			var request = new XMLHttpRequest();
			
			request.open('GET', "/Thingworx/Mashups/" + TW.encodeEntityName(name), NO);
			
			request.setRequestHeader('Content-Type', 'application/json');
			request.setRequestHeader('Accept', 'application/json');
			request.setRequestHeader('x-thingworx-session', 'true');
			
			// This will hold the actual mashup object once the XHR finishes loading
			var mashup;
			
			request.onload = function (data) {
				if (this.status == 200) {
					var mashupDefinition = JSON.parse(request.responseText);
					// Cache the mashup definition
					BMCollectionViewMashupDefinitionCache[name] = mashupDefinition;
					
					// Then render the mashup
					mashup = self.renderMashupWithDefinition(mashupDefinition, {inContainer: options.inContainer, parameters: options.withParameters});
				}
			};
			
			request.onerror = function (error) {
            	TW.Runtime.showStatusText('permission-error', 'Could not load "' + Encoder.htmlEncode(name) + '". Reason: ' + request.status + ' - ' + request.responseText, true);
			};
			
			request.send();
			return mashup;
			
		}
	};
	
	/**
	 * Should be invoked to construct the mashup with the given definition within the specified container.
	 * Invoking this method will cause the container's HTML ID to change to a newly generated unique ID.
	 * @param definition <Object>											The mashup's JSON definition.
	 * {
	 *	@param inContainer <$>												The container in which the mashup should be rendered.
	 *	@param parameters <Dictionary<String, AnyObject>, nullable>			An optional list of parameters to pass to the mashup.
	 * }
	 * @return <TWMashup>													The created mashup object.
	 */
	this.renderMashupWithDefinition = function (definition, options) {
		// Save a reference to the currently loaded mashup and its HTML ID, so it can be restored afterwards
		var currentHTMLID = TW.Runtime.HtmlIdOfCurrentlyLoadedMashup;
		var currentMashup = TW.Runtime.Workspace.Mashups.Current;
		
		var container = options.inContainer;
		
		var mashupContent = definition.mashupContent;
		
		// Construct the mashup object and its associated data object
		var mashup = new TW.MashupDefinition();
		mashup.dataMgr = new DataManager();
		
		// Set up the unique IDs
		// Replace dots with underscores so they don't throw off the jQuery selectors used by Thingworx
		mashup.rootName = definition.name.replace(/\./g, '_') + '-' + self.jqElementId;
		container.attr('id', mashup.rootName);
		mashup.htmlIdOfMashup = '#' + mashup.rootName;
		TW.Runtime.HtmlIdOfCurrentlyLoadedMashup = mashup.htmlIdOfMashup;
		
		mashup.mashupName = definition.name;
		
		// Trigger the mashup load
		mashup.loadFromJSON(mashupContent, definition);
		
		// Construct the bindings
		mashup.dataMgr.migrateAnyBindings(mashup);
		TW.Runtime.Workspace.Mashups.Current = mashup;
			
		// Move the mashup into the container
		mashup.rootWidget.appendTo(container);
			
		mashup.dataMgr.loadFromMashup(mashup);
		
		mashup.parameterDefinitions = definition.parameterDefinitions;
		
		// Store a reference to this mashup in the container's data dictionary
		container.data('mashup', mashup);
		
		// Set up the parameter values
        for (var parameter in options.parameters) {
            mashup.setParameter(parameter, options.parameters[parameter]);
        }
		
		// Fire the MashupLoaded event to signal that loading is complete
        mashup.fireMashupLoadedEvent();
        
        // Restore the previous mashup ID and object
        TW.Runtime.HtmlIdOfCurrentlyLoadedMashup = currentHTMLID;
        TW.Runtime.Workspace.Mashups.Current = currentMashup;
		
		return mashup;
		
	};
	
	// @override - BMTimelineDataSet
	this.timelineStartingTimestampForDataPoint = function (timeline, dataPoint, options) {
		return +dataPoint[XField];
	};
	
	// @override - BMTimelineDataSet
	this.timelineDurationForDataPoint = function (timeline, dataPoint, options) {
		return durationField ? dataPoint[durationField] : dataPoint['__D3Timeline__duration__' + XField];
	};
	
	// @override - BMTimelineDataSet
	this.timelineIdentifierForDataPoint = function (timeline, dataPoint, options) {
		return dataPoint[stateField] + '-' + dataPoint[XField];
	};
	
	// @override - BMTimelineDataSet
	this.timelineColorForDataPoint = function (timeline, dataPoint, options) {
		return colorMap[dataPoint[stateField]] || defaultColorMap[dataPoint[stateField]];
	};
	
	// @override - BMTimelineDataSet
	this.timelineStrokeColor = function () {
		return '#000000';
	};
	
	this.beforeDestroy = function () {
		if (showsTooltips) {
			try {
				tooltipMashup.destroyMashup();
			}
			catch (e) {
				
			}
			
			tooltipMashupContainer.remove();
		}
		
		try {
			self.jqElement.unbind();
		}
		catch (e) {
			
		}
	};

};
