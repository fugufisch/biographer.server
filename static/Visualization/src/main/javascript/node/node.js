(function(bui) {

    var identifier = 'bui.Node';

    var placeholderClass = function(visible) {
        var klass = bui.settings.css.classes.placeholder;

        if (visible === false) {
            klass += ' ' + bui.settings.css.classes.invisible;
        }

        return klass;
    };

    /**
     * @private
     * Function used for the generation of listener identifiers
     * @param {bui.Node} node
     * @return {String} listener identifier
     */
    var listenerIdentifier = function(node) {
        return identifier + node.id();
    };

    /**
     * @private  
     */
    var positionPlaceHolder = function() {
        var privates = this._privates(identifier);
        var htmlPosition = this.htmlTopLeft();
        var correction = bui.settings.style.placeholderCorrection.position;
        privates.placeholder.style.left = (htmlPosition.x +
                correction.x) + 'px';
        privates.placeholder.style.top = (htmlPosition.y +
                correction.y) + 'px';

        correction = bui.settings.style.placeholderCorrection.size;
        privates.placeholder.style.width =  (privates.width +
                correction.width) + 'px';
        privates.placeholder.style.height = (privates.height +
                correction.height) + 'px';
    };

    /**
     * @private position changed listener
     */
    var positionChanged = function() {
        var privates = this._privates(identifier);

        var position = this.absolutePosition();

        var attrValue = ['translate(',
            position.x.toString(),
            ',',
            position.y.toString(),
            ')'].join('');
        privates.nodeGroup.setAttributeNS(null, 'transform', attrValue);

        positionPlaceHolder.call(this);

        this.fire(bui.Node.ListenerType.absolutePosition,
                [this, position.x, position.y]);
    };

    /**
     * @private size changed listener
     */
    var sizeChanged = function() {
        positionPlaceHolder.call(this);
    };

    /**
     * @private jQuery UI drag stop listener
     */
    var placeholderDragStop = function() {
        var privates = this._privates(identifier);
        var placeholderOffset = jQuery(privates.placeholder).offset();
        var x = placeholderOffset.left;
        var y = placeholderOffset.top;

        var parentTopLeft = privates.parent.htmlTopLeft();
        x -= parentTopLeft.x;
        y -= parentTopLeft.y;

        var correction = bui.settings.style.placeholderCorrection.position;
        x += correction.x * -1;
        y += correction.y * -1;

        var suspendHandle = this.graph().suspendRedraw(200);
        this.position(x, y);
        this.graph().unsuspendRedraw(suspendHandle);
    };

    /**
     * @private jQuery UI drag listener
     */
    var placeholderDrag = function() {
        if (this.graph().highPerformance() === true) {
            placeholderDragStop.call(this);
        }
    };

    /**
     * @private jQuery UI resize stop listener
     */
    var placeholderResizeStop = function() {
        var privates = this._privates(identifier);
        var width = jQuery(privates.placeholder).width();
        var height = jQuery(privates.placeholder).height();

        var correction = bui.settings.style.placeholderCorrection.size;

        width += correction.width * -1;
        height += correction.height * -1;

        var suspendHandle = this.graph().suspendRedraw(200);
        this.size(width, height);
        this.graph().unsuspendRedraw(suspendHandle);
    };

    var placeholderResize = function() {
        if (this.graph().highPerformance() === true) {
            placeholderResizeStop.call(this);
        }
    };

    /**
     * @private visibility listener
     */
    var visibilityChanged = function(node, visible) {
        if (visible === true) {
            this.removeClass(bui.settings.css.classes.invisible);
        } else {
            this.addClass(bui.settings.css.classes.invisible);
            this.placeholderVisible(false);
        }
    };

    /**
     * @private remove listener
     */
    var nodeRemoved = function() {
        var privates = this._privates(identifier);
        var nodeGroup = privates.nodeGroup;
        nodeGroup.parentNode.removeChild(nodeGroup);

        var placeholder = privates.placeholder;
        placeholder.parentNode.removeChild(placeholder);
    };

    /**
     * @private parent removed listener
     */
    var parentRemoved = function() {
        this.parent(this.graph());
    };

    /**
     * @private parent listener
     */
    var parentChanged = function(node, newParent, oldParent) {
        oldParent.unbindAll(listenerIdentifier(this));

        newParent.bind(bui.Drawable.ListenerType.remove,
                parentRemoved.createDelegate(this),
                listenerIdentifier(this));
        newParent.bind(bui.Node.ListenerType.absolutePosition,
                positionChanged.createDelegate(this),
                listenerIdentifier(this));

        positionChanged.call(this);
    };

    /**
     * @private class changed listener
     */
    var classesChanged = function(node, classString) {
        var nodeGroup = this._privates(identifier).nodeGroup;
        nodeGroup.setAttributeNS(null, 'class', classString);
    };

    /**
     * @private select changed listener
     */
    var selectChanged = function(node, selected) {
        if (selected === true) {
            this.addClass(bui.settings.css.classes.selected);
        } else {
            this.removeClass(bui.settings.css.classes.selected);
        }
    };

    var mouseClick = function(event) {
        if (event.ctrlKey === true) {
            this.placeholderVisible(!this.placeholderVisible());
        }
    };

     /**
     * @private
     * Initial paint of the placeholder node and group node
     */
    var initialPaint = function() {
        var privates = this._privates(identifier);

        privates.nodeGroup = document.createElementNS(bui.svgns, 'g');
        privates.nodeGroup.setAttributeNS(null, 'id', this.id());
        visibilityChanged.call(this, this, this.visible());
        this.graph().nodeGroup().appendChild(privates.nodeGroup);

        privates.placeholder = document.createElement('div');
        privates.placeholder.setAttribute('class',
                placeholderClass(false));
        this.graph().placeholderContainer().appendChild(privates.placeholder);

        sizeChanged.call(this);
        positionChanged.call(this);

         jQuery(privates.nodeGroup)
                 .add(privates.placeholder)
                 .click(mouseClick.createDelegate(this));

        if (this._enableDragging === true) {
            jQuery(privates.placeholder).draggable({
                stop : placeholderDragStop.createDelegate(this),
                drag : placeholderDrag.createDelegate(this)
            });
        }

        if (this._enableResizing === true) {
            jQuery(privates.placeholder).resizable({
                stop : placeholderResizeStop.createDelegate(this),
                resize : placeholderResize.createDelegate(this),
                aspectRatio : (this._forceRectangular ? 1 : false)
            });
        }
    };

    /**
     * @class
     * Base class for every drawable node. Please note that nodes shouldn't be
     * instantiated directly.
     *
     * @extends bui.Drawable
     * @constructor
     *
     * @param {String} id complete id
     * @param {bui.Graph} graph The graph which this drawable shall be
     *   part of.
     */
    bui.Node = function(args) {
        args.id = bui.settings.idPrefix.node + args.id;
        bui.Node.superClazz.call(this, args);
        this._addType(bui.Node.ListenerType);

        var privates = this._privates(identifier);
        privates.x = 0;
        privates.y = 0;
        privates.width = this._minWidth;
        privates.height = this._minHeight;
        privates.parent = this.graph();
        privates.children = [];
        privates.placeholderVisible = false;

        this.bind(bui.Drawable.ListenerType.remove,
                nodeRemoved.createDelegate(this),
                listenerIdentifier(this));
        this.bind(bui.Drawable.ListenerType.visible,
                visibilityChanged.createDelegate(this),
                listenerIdentifier(this));
        this.bind(bui.Node.ListenerType.parent,
                parentChanged.createDelegate(this),
                listenerIdentifier(this));
        this.bind(bui.Node.ListenerType.position,
                positionChanged.createDelegate(this),
                listenerIdentifier(this));
        this.bind(bui.Node.ListenerType.size,
                positionPlaceHolder.createDelegate(this),
                listenerIdentifier(this));
        this.bind(bui.Drawable.ListenerType.classes,
                classesChanged.createDelegate(this),
                listenerIdentifier(this));
        this.bind(bui.Drawable.ListenerType.select,
                selectChanged.createDelegate(this),
                listenerIdentifier(this));

        initialPaint.call(this);
    };

    bui.Node.prototype = {
        _minWidth : 10,
        _minHeight : 10,
        _forceRectangular : false,
        _enableResizing : true,
        _enableDragging : true,

        /**
         * Use this function to retrieve this node's group. This function
         * is normally only required by sub classes.
         *
         * @return {SVGGElement} node group
         */
        nodeGroup : function() {
            return this._privates(identifier).nodeGroup;
        },

        /**
         * @description
         * Set or retrieve the node's position.
         *
         * You can set the position by passing both, the x- and y-axis value
         * to this function. If you pass only one parameter or none, the
         * current position is returned.
         *
         * @param {Number} [x] The new x-axis position.
         * @param {Number} [y] The new y-axis position.
         * @return {bui.Node|Object} Fluent interface in case both parameters
         *   are given. If only one or no parameter is provided the current
         *   position will be returned as an object with x and y properties.
         */
        position : function(x, y) {
            var privates = this._privates(identifier);

            if (x !== undefined && y !== undefined) {
                var changed = privates.x !== x || privates.y !== y;
                privates.x = x;
                privates.y = y;

                if (changed) {
                    this.fire(bui.Node.ListenerType.position,
                            [this, privates.x, privates.y]);
                }

                return this;
            }

            return {
                x : privates.x,
                y : privates.y
            };
        },

        /**
         * Retrieve the absolute position of this node in the SVG or set it.
         *
         * @param {Number} [x] The new x-axis position.
         * @param {Number} [y] The new y-axis position.
         * @return {Object} Object with x and y properties.
         */
        absolutePosition : function(x, y) {
            var privates = this._privates(identifier);
            var parentTopLeft = privates.parent.absolutePosition();

            if (x !== undefined && y !== undefined) {
                x -= parentTopLeft.x;
                y -= parentTopLeft.y;

                this.position(x, y);
                return this;
            } else {
                return {
                    x : parentTopLeft.x + privates.x,
                    y : parentTopLeft.y + privates.y
                };
            }
        },

        /**
         * Position the node's center on the given coordinate.
         *
         * The positioning is done relatively.
         *
         * @param {Number} x Position on x-coordinate.
         * @param {Number} y Position on y-coordinate.
         * @return {bui.Node} Fluent interface
         */
        positionCenter : function(x, y) {
            var size = this.size();

            this.position(x - size.width / 2, y - size.height / 2);

            return this;
        },

        /**
         * Retrieve the absolute position of this node in the HTML document.
         *
         * @return {Object} Object with x and y properties.
         */
        htmlTopLeft : function() {
            var privates = this._privates(identifier);

            var parentTopLeft = privates.parent.htmlTopLeft();

            return {
                x : parentTopLeft.x + privates.x,
                y : parentTopLeft.y + privates.y
            };
        },

        /**
         * @description
         * Set or retrieve the node's size.
         *
         * You can set the size by passing both, the width and height value
         * to this function. If you pass only one parameter or none, the
         * current size is returned.
         *
         * @param {Number} [width] The new width.
         * @param {Number} [height] The new height.
         * @return {bui.Node|Object} Fluent interface in case both parameters
         *   are given. If only one or no parameter is provided the current
         *   size will be returned as an object with width and height
         *   properties.
         */
        size : function(width, height) {
            var privates = this._privates(identifier);

            if (width !== undefined && height !== undefined) {
                width = Math.max(this._minWidth, width);
                height = Math.max(this._minHeight, height);

                if (this._forceRectangular === true) {
                    height = width;
                }
                var changed = privates.width !== width ||
                        privates.height !== height;
                privates.width = width;
                privates.height = height;

                if (changed) {
                    this.fire(bui.Node.ListenerType.size,
                            [this, privates.width, privates.height]);
                }

                return this;
            }

            return {
                width : privates.width,
                height : privates.height
            };
        },

        /**
         * @description
         * Use this function to retrieve the top-left corner of the node.
         *
         * @return {Object} Object with x and y properties.
         */
        topLeft : function() {
            var privates = this._privates(identifier);

            return {
                x : privates.x,
                y : privates.y
            };
        },

        /**
         * @description
         * Use this function to retrieve the bottom-right corner of the node.
         *
         * @return {Object} Object with x and y properties.
         */
        bottomRight : function() {
            var privates = this._privates(identifier);

            return {
                x : privates.x + privates.width,
                y : privates.y + privates.height
            };
        },

        /**
         * @description
         * Use this function to retrieve the center of the node.
         *
         * @return {Object} Object with x and y properties.
         */
        center : function() {
            var privates = this._privates(identifier);

            return {
                x : privates.x + (privates.width / 2),
                y : privates.y + (privates.height / 2)
            };
        },

        /**
         * @description
         * Use this function to retrieve the absolute center of the node.
         *
         * @return {Object} Object with x and y properties.
         */
        absoluteCenter : function() {
            var privates = this._privates(identifier);

            var position = this.absolutePosition();

            return {
                x : position.x + (privates.width / 2),
                y : position.y + (privates.height / 2)
            };
        },

        /**
         * @description
         * Use this function to move the relative to its current position.
         *
         * @param {Number} x Relative change on the x-axis.
         * @param {Number} y Relative change on the y-axis.
         * @param {Boolean} [duration] Whether this movement should be animated
         *   and how long this animation should run. When omitted or a value
         *   <= 0 is passed the movement will be executed immediately.
         * @return {bui.Node} Fluent interface.
         */
        move : function(x, y, duration) {
            var privates = this._privates(identifier);

            if (duration === undefined || duration <= 0) {
                this.position(privates.x + x, privates.y + y);
            } else {
                throw "Not implemented.";
            }

            return this;
        },

        /**
         * Retrieve the current parent or set it
         *
         * @param {bui.Graph|bui.Node} [parent] The new parameter or
         *   omit to retrieve the current parent.
         * @return {bui.Graph|bui.Node} The current parent in case you didn't
         *   pass a parameter, fluent interface otherwise.
         */
        parent : function(parent) {
            var privates = this._privates(identifier);

            if (parent !== undefined) {
                if (parent !== privates.parent) {
                    var old = privates.parent;

                    privates.parent = parent;

                    if (old !== this.graph()) {
                        old._removeChild(this);
                    }

                    if (parent !== this.graph()) {
                        parent._addChild(this);
                    }

                    this.fire(bui.Node.ListenerType.parent,
                            [this, parent, old]);
                }

                return this;
            }

            return privates.parent;
        },

        /**
         * Add a child node to this node. This function call is synonymous with
         * a child.parent(this) function call.
         *
         * @param {bui.Node} child The new child node
         * @return {bui.Node} Fluent interface
         */
        addChild : function(child) {
            child.parent(this);

            return this;
        },

        /**
         * Remove a child node from this node. This function call is synonymous
         * with a child.parent(this.graph()) function call.
         *
         * @param {bui.Node} child The child node which should be removed
         * @return {bui.Node} Fluent interface
         */
        removeChild : function(child) {
            child.parent(this.graph());

            return this;
        },

        /**
         * @private
         * Internal method for the addition of a child node.
         *
         * @param {bui.Node} child The new child
         */
        _addChild : function(child) {
            this._privates(identifier).children.push(child);
        },

        /**
         * @private
         * Internal method for the removal of child nodes
         *
         * @param {bui.Node} child The child node which should be removed,
         */
        _removeChild : function(child) {
            var children = this._privates(identifier).children;

            var index = children.indexOf(child);

            if (index !== -1) {
                children.splice(index, 1);
            }
        },

        /**
         * Retrieve the node's child elements.
         *
         * @return {bui.Node[]} Child elements.
         */
        children : function() {
            return this._privates(identifier).children;
        },


        /**
         * @private
         * Used to calculate line endpoints. Generally spoken this method
         * will only be used by the class {@link bui.StraightLine}.
         * 
         * @param {bui.Node} otherNode
         * @return {Object} an object with x and y properties
         */
        calculateLineEnd : function(otherNode) {
            if (this.visible() === false) {
                return this.center();
            }

            var position = this.center(),
                    size = this.size(),
                    otherPosition = otherNode.center();

            var padding = bui.settings.style.edgeToNodePadding;
            var widthWithPadding = size.width + padding.leftRight * 2,
                    heightWithPadding = size.height + padding.topBottom * 2;

            var deltaX = otherPosition.x - position.x,
                    deltaY = otherPosition.y - position.y;

            var hitAngle = Math.abs(Math.atan(deltaY / deltaX));
            var sideHitAngle = Math.atan(heightWithPadding / widthWithPadding);

            var adjacent = 0;
            var goesThroughLeftOrRightSide = hitAngle < sideHitAngle;

            if (goesThroughLeftOrRightSide) {
                adjacent = widthWithPadding / 2;
            } else {
                adjacent = heightWithPadding / 2;
                // subtracting 90 degrees
                hitAngle = Math.PI / 2 - hitAngle;
            }

            var hookResult = this._calculationHook(adjacent, hitAngle);
            var opposite = hookResult.opposite;
            adjacent = hookResult.adjacent;

            var xChange = 0, yChange = 0;
            if (goesThroughLeftOrRightSide) {
                xChange = adjacent;
                yChange = opposite;
            } else {
                xChange = opposite;
                yChange = adjacent;
            }

            var hitsTop = position.y > otherPosition.y,
                    hitsLeft = position.x > otherPosition.x;

            xChange *= (hitsLeft ? -1 : 1);
            yChange *= (hitsTop ? -1 : 1);

            return {
                x : position.x + xChange,
                y : position.y + yChange
            };
        },

        /**
         * @private
         * This hook can be used to alter the calculateLineEnd function result.
         *
         * @param {Number} adjacent The length of the adjacent line
         * @param {Number} hitAngle The angle with which the line will 'hit'
         *   the shape in radians.
         * @return {Object} An object with adjacent and opposite properties.
         *   (think of trigonometric functions).
         */
        _calculationHook : function(adjacent, hitAngle) {
            return {
                adjacent : adjacent,
                opposite : Math.tan(hitAngle) * adjacent
            };
        },

        /**
         * Show or hide the placeholder which  is used for modification
         * of the node's position and size.
         *
         * @param {Boolean} [visible] Show or hide the placeholder
         * @return {bui.Node|Boolean} Fluent interface or the current
         *   visibility in case you don't pass a parameter
         */
        placeholderVisible : function(visible) {
            var privates = this._privates(identifier);

            if (visible !== undefined) {
                privates.placeholderVisible = visible;

                if (visible === true) {
                    jQuery(privates.placeholder)
                            .removeClass(bui.settings.css.classes.invisible);
                } else {
                    jQuery(privates.placeholder)
                            .addClass(bui.settings.css.classes.invisible);
                }

                return this;
            }

            return privates.placeholderVisible;
        },

        /**
         * Start the dragging process on the placeholder element at the given
         * position.
         *
         * @param {Number} x X-coordinate on which to start the dragging
         * @param {Number} y Y-coordinate on which to start the dragging
         * @param {Boolean} [correctGraphHTMLOffset] Whether or not the graph's
         *   HTML offset should be taken into account. Defaults to false.
         * @return {bui.Node} Fluent interface.
         */
        startDragging : function(x, y, correctGraphHTMLOffset) {
            if (correctGraphHTMLOffset === true) {
                var htmlTopLeft = this.graph().htmlTopLeft();
                x -= htmlTopLeft.x;
                y -= htmlTopLeft.y;
            }

            this.placeholderVisible(true);

            var placeholder = this._privates(identifier).placeholder;
            jQuery(placeholder).simulate("mousedown", {
                clientX : x,
                clientY : y
            });

            return this;
        }
    };

    bui.util.setSuperClass(bui.Node, bui.Drawable);

    /**
     * @namespace
     * Observable properties which all nodes share
     */
    bui.Node.ListenerType = {
        /** @field */
        parent : bui.util.createListenerTypeId(),
        /** @field */
        position : bui.util.createListenerTypeId(),
        /** @field */
        absolutePosition : bui.util.createListenerTypeId(),
        /** @field */
        size : bui.util.createListenerTypeId()
    };
})(bui);