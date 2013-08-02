(function(window, document, undefined) {
    var oldL = window.L, L = {};
    L.version = "0.6.3";
    "object" == typeof module && "object" == typeof module.exports ? module.exports = L : "function" == typeof define && define.amd && define(L);
    L.noConflict = function() {
        window.L = oldL;
        return this;
    };
    window.L = L;
    L.Util = {
        extend: function(dest) {
            var i, j, len, src, sources = Array.prototype.slice.call(arguments, 1);
            for (j = 0, len = sources.length; len > j; j++) {
                src = sources[j] || {};
                for (i in src) src.hasOwnProperty(i) && (dest[i] = src[i]);
            }
            return dest;
        },
        bind: function(fn, obj) {
            var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
            return function() {
                return fn.apply(obj, args || arguments);
            };
        },
        stamp: function() {
            var lastId = 0, key = "_leaflet_id";
            return function(obj) {
                obj[key] = obj[key] || ++lastId;
                return obj[key];
            };
        }(),
        invokeEach: function(obj, method, context) {
            var i, args;
            if ("object" == typeof obj) {
                args = Array.prototype.slice.call(arguments, 3);
                for (i in obj) method.apply(context, [ i, obj[i] ].concat(args));
                return true;
            }
            return false;
        },
        limitExecByInterval: function(fn, time, context) {
            var lock, execOnUnlock;
            return function wrapperFn() {
                var args = arguments;
                if (lock) {
                    execOnUnlock = true;
                    return;
                }
                lock = true;
                setTimeout(function() {
                    lock = false;
                    if (execOnUnlock) {
                        wrapperFn.apply(context, args);
                        execOnUnlock = false;
                    }
                }, time);
                fn.apply(context, args);
            };
        },
        falseFn: function() {
            return false;
        },
        formatNum: function(num, digits) {
            var pow = Math.pow(10, digits || 5);
            return Math.round(num * pow) / pow;
        },
        trim: function(str) {
            return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
        },
        splitWords: function(str) {
            return L.Util.trim(str).split(/\s+/);
        },
        setOptions: function(obj, options) {
            obj.options = L.extend({}, obj.options, options);
            return obj.options;
        },
        getParamString: function(obj, existingUrl, uppercase) {
            var params = [];
            for (var i in obj) params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + "=" + encodeURIComponent(obj[i]));
            return (existingUrl && -1 !== existingUrl.indexOf("?") ? "&" : "?") + params.join("&");
        },
        template: function(str, data) {
            return str.replace(/\{ *([\w_]+) *\}/g, function(str, key) {
                var value = data[key];
                if (value === undefined) throw new Error("No value provided for variable " + str);
                "function" == typeof value && (value = value(data));
                return value;
            });
        },
        isArray: function(obj) {
            return "[object Array]" === Object.prototype.toString.call(obj);
        },
        emptyImageUrl: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
    };
    (function() {
        function getPrefixed(name) {
            var i, fn, prefixes = [ "webkit", "moz", "o", "ms" ];
            for (i = 0; prefixes.length > i && !fn; i++) fn = window[prefixes[i] + name];
            return fn;
        }
        function timeoutDefer(fn) {
            var time = +new Date(), timeToCall = Math.max(0, 16 - (time - lastTime));
            lastTime = time + timeToCall;
            return window.setTimeout(fn, timeToCall);
        }
        var lastTime = 0;
        var requestFn = window.requestAnimationFrame || getPrefixed("RequestAnimationFrame") || timeoutDefer;
        var cancelFn = window.cancelAnimationFrame || getPrefixed("CancelAnimationFrame") || getPrefixed("CancelRequestAnimationFrame") || function(id) {
            window.clearTimeout(id);
        };
        L.Util.requestAnimFrame = function(fn, context, immediate, element) {
            fn = L.bind(fn, context);
            if (!immediate || requestFn !== timeoutDefer) return requestFn.call(window, fn, element);
            fn();
        };
        L.Util.cancelAnimFrame = function(id) {
            id && cancelFn.call(window, id);
        };
    })();
    L.extend = L.Util.extend;
    L.bind = L.Util.bind;
    L.stamp = L.Util.stamp;
    L.setOptions = L.Util.setOptions;
    L.Class = function() {};
    L.Class.extend = function(props) {
        var NewClass = function() {
            this.initialize && this.initialize.apply(this, arguments);
            this._initHooks && this.callInitHooks();
        };
        var F = function() {};
        F.prototype = this.prototype;
        var proto = new F();
        proto.constructor = NewClass;
        NewClass.prototype = proto;
        for (var i in this) this.hasOwnProperty(i) && "prototype" !== i && (NewClass[i] = this[i]);
        if (props.statics) {
            L.extend(NewClass, props.statics);
            delete props.statics;
        }
        if (props.includes) {
            L.Util.extend.apply(null, [ proto ].concat(props.includes));
            delete props.includes;
        }
        props.options && proto.options && (props.options = L.extend({}, proto.options, props.options));
        L.extend(proto, props);
        proto._initHooks = [];
        var parent = this;
        NewClass.__super__ = parent.prototype;
        proto.callInitHooks = function() {
            if (this._initHooksCalled) return;
            parent.prototype.callInitHooks && parent.prototype.callInitHooks.call(this);
            this._initHooksCalled = true;
            for (var i = 0, len = proto._initHooks.length; len > i; i++) proto._initHooks[i].call(this);
        };
        return NewClass;
    };
    L.Class.include = function(props) {
        L.extend(this.prototype, props);
    };
    L.Class.mergeOptions = function(options) {
        L.extend(this.prototype.options, options);
    };
    L.Class.addInitHook = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        var init = "function" == typeof fn ? fn : function() {
            this[fn].apply(this, args);
        };
        this.prototype._initHooks = this.prototype._initHooks || [];
        this.prototype._initHooks.push(init);
    };
    var eventsKey = "_leaflet_events";
    L.Mixin = {};
    L.Mixin.Events = {
        addEventListener: function(types, fn, context) {
            if (L.Util.invokeEach(types, this.addEventListener, this, fn, context)) return this;
            var i, len, event, type, indexKey, indexLenKey, typeIndex, events = this[eventsKey] = this[eventsKey] || {}, contextId = context && L.stamp(context);
            types = L.Util.splitWords(types);
            for (i = 0, len = types.length; len > i; i++) {
                event = {
                    action: fn,
                    context: context || this
                };
                type = types[i];
                if (context) {
                    indexKey = type + "_idx";
                    indexLenKey = indexKey + "_len";
                    typeIndex = events[indexKey] = events[indexKey] || {};
                    if (!typeIndex[contextId]) {
                        typeIndex[contextId] = [];
                        events[indexLenKey] = (events[indexLenKey] || 0) + 1;
                    }
                    typeIndex[contextId].push(event);
                } else {
                    events[type] = events[type] || [];
                    events[type].push(event);
                }
            }
            return this;
        },
        hasEventListeners: function(type) {
            var events = this[eventsKey];
            return !!events && (type in events && events[type].length > 0 || type + "_idx" in events && events[type + "_idx_len"] > 0);
        },
        removeEventListener: function(types, fn, context) {
            if (!this[eventsKey]) return this;
            if (!types) return this.clearAllEventListeners();
            if (L.Util.invokeEach(types, this.removeEventListener, this, fn, context)) return this;
            var i, len, type, listeners, j, indexKey, indexLenKey, typeIndex, removed, events = this[eventsKey], contextId = context && L.stamp(context);
            types = L.Util.splitWords(types);
            for (i = 0, len = types.length; len > i; i++) {
                type = types[i];
                indexKey = type + "_idx";
                indexLenKey = indexKey + "_len";
                typeIndex = events[indexKey];
                if (fn) {
                    listeners = context && typeIndex ? typeIndex[contextId] : events[type];
                    if (listeners) {
                        for (j = listeners.length - 1; j >= 0; j--) if (listeners[j].action === fn && (!context || listeners[j].context === context)) {
                            removed = listeners.splice(j, 1);
                            removed[0].action = L.Util.falseFn;
                        }
                        if (context && typeIndex && 0 === listeners.length) {
                            delete typeIndex[contextId];
                            events[indexLenKey]--;
                        }
                    }
                } else {
                    delete events[type];
                    delete events[indexKey];
                }
            }
            return this;
        },
        clearAllEventListeners: function() {
            delete this[eventsKey];
            return this;
        },
        fireEvent: function(type, data) {
            if (!this.hasEventListeners(type)) return this;
            var event = L.Util.extend({}, data, {
                type: type,
                target: this
            });
            var listeners, i, len, typeIndex, contextId, events = this[eventsKey];
            if (events[type]) {
                listeners = events[type].slice();
                for (i = 0, len = listeners.length; len > i; i++) listeners[i].action.call(listeners[i].context || this, event);
            }
            typeIndex = events[type + "_idx"];
            for (contextId in typeIndex) {
                listeners = typeIndex[contextId].slice();
                if (listeners) for (i = 0, len = listeners.length; len > i; i++) listeners[i].action.call(listeners[i].context || this, event);
            }
            return this;
        },
        addOneTimeEventListener: function(types, fn, context) {
            if (L.Util.invokeEach(types, this.addOneTimeEventListener, this, fn, context)) return this;
            var handler = L.bind(function() {
                this.removeEventListener(types, fn, context).removeEventListener(types, handler, context);
            }, this);
            return this.addEventListener(types, fn, context).addEventListener(types, handler, context);
        }
    };
    L.Mixin.Events.on = L.Mixin.Events.addEventListener;
    L.Mixin.Events.off = L.Mixin.Events.removeEventListener;
    L.Mixin.Events.once = L.Mixin.Events.addOneTimeEventListener;
    L.Mixin.Events.fire = L.Mixin.Events.fireEvent;
    (function() {
        var ie = !!window.ActiveXObject, ie6 = ie && !window.XMLHttpRequest, ie7 = ie && !document.querySelector, ielt9 = ie && !document.addEventListener, ua = navigator.userAgent.toLowerCase(), webkit = -1 !== ua.indexOf("webkit"), chrome = -1 !== ua.indexOf("chrome"), phantomjs = -1 !== ua.indexOf("phantom"), android = -1 !== ua.indexOf("android"), android23 = -1 !== ua.search("android [23]"), mobile = typeof orientation != undefined + "", msTouch = window.navigator && window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints, retina = "devicePixelRatio" in window && window.devicePixelRatio > 1 || "matchMedia" in window && window.matchMedia("(min-resolution:144dpi)") && window.matchMedia("(min-resolution:144dpi)").matches, doc = document.documentElement, ie3d = ie && "transition" in doc.style, webkit3d = "WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix(), gecko3d = "MozPerspective" in doc.style, opera3d = "OTransition" in doc.style, any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d || opera3d) && !phantomjs;
        var touch = !window.L_NO_TOUCH && !phantomjs && function() {
            var startName = "ontouchstart";
            if (msTouch || startName in doc) return true;
            var div = document.createElement("div"), supported = false;
            if (!div.setAttribute) return false;
            div.setAttribute(startName, "return;");
            "function" == typeof div[startName] && (supported = true);
            div.removeAttribute(startName);
            div = null;
            return supported;
        }();
        L.Browser = {
            ie: ie,
            ie6: ie6,
            ie7: ie7,
            ielt9: ielt9,
            webkit: webkit,
            android: android,
            android23: android23,
            chrome: chrome,
            ie3d: ie3d,
            webkit3d: webkit3d,
            gecko3d: gecko3d,
            opera3d: opera3d,
            any3d: any3d,
            mobile: mobile,
            mobileWebkit: mobile && webkit,
            mobileWebkit3d: mobile && webkit3d,
            mobileOpera: mobile && window.opera,
            touch: touch,
            msTouch: msTouch,
            retina: retina
        };
    })();
    L.Point = function(x, y, round) {
        this.x = round ? Math.round(x) : x;
        this.y = round ? Math.round(y) : y;
    };
    L.Point.prototype = {
        clone: function() {
            return new L.Point(this.x, this.y);
        },
        add: function(point) {
            return this.clone()._add(L.point(point));
        },
        _add: function(point) {
            this.x += point.x;
            this.y += point.y;
            return this;
        },
        subtract: function(point) {
            return this.clone()._subtract(L.point(point));
        },
        _subtract: function(point) {
            this.x -= point.x;
            this.y -= point.y;
            return this;
        },
        divideBy: function(num) {
            return this.clone()._divideBy(num);
        },
        _divideBy: function(num) {
            this.x /= num;
            this.y /= num;
            return this;
        },
        multiplyBy: function(num) {
            return this.clone()._multiplyBy(num);
        },
        _multiplyBy: function(num) {
            this.x *= num;
            this.y *= num;
            return this;
        },
        round: function() {
            return this.clone()._round();
        },
        _round: function() {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
            return this;
        },
        floor: function() {
            return this.clone()._floor();
        },
        _floor: function() {
            this.x = Math.floor(this.x);
            this.y = Math.floor(this.y);
            return this;
        },
        distanceTo: function(point) {
            point = L.point(point);
            var x = point.x - this.x, y = point.y - this.y;
            return Math.sqrt(x * x + y * y);
        },
        equals: function(point) {
            point = L.point(point);
            return point.x === this.x && point.y === this.y;
        },
        contains: function(point) {
            point = L.point(point);
            return Math.abs(point.x) <= Math.abs(this.x) && Math.abs(point.y) <= Math.abs(this.y);
        },
        toString: function() {
            return "Point(" + L.Util.formatNum(this.x) + ", " + L.Util.formatNum(this.y) + ")";
        }
    };
    L.point = function(x, y, round) {
        if (x instanceof L.Point) return x;
        if (L.Util.isArray(x)) return new L.Point(x[0], x[1]);
        if (x === undefined || null === x) return x;
        return new L.Point(x, y, round);
    };
    L.Bounds = function(a, b) {
        if (!a) return;
        var points = b ? [ a, b ] : a;
        for (var i = 0, len = points.length; len > i; i++) this.extend(points[i]);
    };
    L.Bounds.prototype = {
        extend: function(point) {
            point = L.point(point);
            if (this.min || this.max) {
                this.min.x = Math.min(point.x, this.min.x);
                this.max.x = Math.max(point.x, this.max.x);
                this.min.y = Math.min(point.y, this.min.y);
                this.max.y = Math.max(point.y, this.max.y);
            } else {
                this.min = point.clone();
                this.max = point.clone();
            }
            return this;
        },
        getCenter: function(round) {
            return new L.Point((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, round);
        },
        getBottomLeft: function() {
            return new L.Point(this.min.x, this.max.y);
        },
        getTopRight: function() {
            return new L.Point(this.max.x, this.min.y);
        },
        getSize: function() {
            return this.max.subtract(this.min);
        },
        contains: function(obj) {
            var min, max;
            obj = "number" == typeof obj[0] || obj instanceof L.Point ? L.point(obj) : L.bounds(obj);
            if (obj instanceof L.Bounds) {
                min = obj.min;
                max = obj.max;
            } else min = max = obj;
            return min.x >= this.min.x && max.x <= this.max.x && min.y >= this.min.y && max.y <= this.max.y;
        },
        intersects: function(bounds) {
            bounds = L.bounds(bounds);
            var min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max, xIntersects = max2.x >= min.x && min2.x <= max.x, yIntersects = max2.y >= min.y && min2.y <= max.y;
            return xIntersects && yIntersects;
        },
        isValid: function() {
            return !!(this.min && this.max);
        }
    };
    L.bounds = function(a, b) {
        if (!a || a instanceof L.Bounds) return a;
        return new L.Bounds(a, b);
    };
    L.Transformation = function(a, b, c, d) {
        this._a = a;
        this._b = b;
        this._c = c;
        this._d = d;
    };
    L.Transformation.prototype = {
        transform: function(point, scale) {
            return this._transform(point.clone(), scale);
        },
        _transform: function(point, scale) {
            scale = scale || 1;
            point.x = scale * (this._a * point.x + this._b);
            point.y = scale * (this._c * point.y + this._d);
            return point;
        },
        untransform: function(point, scale) {
            scale = scale || 1;
            return new L.Point((point.x / scale - this._b) / this._a, (point.y / scale - this._d) / this._c);
        }
    };
    L.DomUtil = {
        get: function(id) {
            return "string" == typeof id ? document.getElementById(id) : id;
        },
        getStyle: function(el, style) {
            var value = el.style[style];
            !value && el.currentStyle && (value = el.currentStyle[style]);
            if ((!value || "auto" === value) && document.defaultView) {
                var css = document.defaultView.getComputedStyle(el, null);
                value = css ? css[style] : null;
            }
            return "auto" === value ? null : value;
        },
        getViewportOffset: function(element) {
            var pos, top = 0, left = 0, el = element, docBody = document.body, docEl = document.documentElement, ie7 = L.Browser.ie7;
            do {
                top += el.offsetTop || 0;
                left += el.offsetLeft || 0;
                top += parseInt(L.DomUtil.getStyle(el, "borderTopWidth"), 10) || 0;
                left += parseInt(L.DomUtil.getStyle(el, "borderLeftWidth"), 10) || 0;
                pos = L.DomUtil.getStyle(el, "position");
                if (el.offsetParent === docBody && "absolute" === pos) break;
                if ("fixed" === pos) {
                    top += docBody.scrollTop || docEl.scrollTop || 0;
                    left += docBody.scrollLeft || docEl.scrollLeft || 0;
                    break;
                }
                if ("relative" === pos && !el.offsetLeft) {
                    var width = L.DomUtil.getStyle(el, "width"), maxWidth = L.DomUtil.getStyle(el, "max-width"), r = el.getBoundingClientRect();
                    ("none" !== width || "none" !== maxWidth) && (left += r.left + el.clientLeft);
                    top += r.top + (docBody.scrollTop || docEl.scrollTop || 0);
                    break;
                }
                el = el.offsetParent;
            } while (el);
            el = element;
            do {
                if (el === docBody) break;
                top -= el.scrollTop || 0;
                left -= el.scrollLeft || 0;
                if (!L.DomUtil.documentIsLtr() && (L.Browser.webkit || ie7)) {
                    left += el.scrollWidth - el.clientWidth;
                    ie7 && "hidden" !== L.DomUtil.getStyle(el, "overflow-y") && "hidden" !== L.DomUtil.getStyle(el, "overflow") && (left += 17);
                }
                el = el.parentNode;
            } while (el);
            return new L.Point(left, top);
        },
        documentIsLtr: function() {
            if (!L.DomUtil._docIsLtrCached) {
                L.DomUtil._docIsLtrCached = true;
                L.DomUtil._docIsLtr = "ltr" === L.DomUtil.getStyle(document.body, "direction");
            }
            return L.DomUtil._docIsLtr;
        },
        create: function(tagName, className, container) {
            var el = document.createElement(tagName);
            el.className = className;
            container && container.appendChild(el);
            return el;
        },
        hasClass: function(el, name) {
            return el.className.length > 0 && new RegExp("(^|\\s)" + name + "(\\s|$)").test(el.className);
        },
        addClass: function(el, name) {
            L.DomUtil.hasClass(el, name) || (el.className += (el.className ? " " : "") + name);
        },
        removeClass: function(el, name) {
            el.className = L.Util.trim((" " + el.className + " ").replace(" " + name + " ", " "));
        },
        setOpacity: function(el, value) {
            if ("opacity" in el.style) el.style.opacity = value; else if ("filter" in el.style) {
                var filter = false, filterName = "DXImageTransform.Microsoft.Alpha";
                try {
                    filter = el.filters.item(filterName);
                } catch (e) {
                    if (1 === value) return;
                }
                value = Math.round(100 * value);
                if (filter) {
                    filter.Enabled = 100 !== value;
                    filter.Opacity = value;
                } else el.style.filter += " progid:" + filterName + "(opacity=" + value + ")";
            }
        },
        testProp: function(props) {
            var style = document.documentElement.style;
            for (var i = 0; props.length > i; i++) if (props[i] in style) return props[i];
            return false;
        },
        getTranslateString: function(point) {
            var is3d = L.Browser.webkit3d, open = "translate" + (is3d ? "3d" : "") + "(", close = (is3d ? ",0" : "") + ")";
            return open + point.x + "px," + point.y + "px" + close;
        },
        getScaleString: function(scale, origin) {
            var preTranslateStr = L.DomUtil.getTranslateString(origin.add(origin.multiplyBy(-1 * scale))), scaleStr = " scale(" + scale + ") ";
            return preTranslateStr + scaleStr;
        },
        setPosition: function(el, point, disable3D) {
            el._leaflet_pos = point;
            if (!disable3D && L.Browser.any3d) {
                el.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(point);
                L.Browser.mobileWebkit3d && (el.style.WebkitBackfaceVisibility = "hidden");
            } else {
                el.style.left = point.x + "px";
                el.style.top = point.y + "px";
            }
        },
        getPosition: function(el) {
            return el._leaflet_pos;
        }
    };
    L.DomUtil.TRANSFORM = L.DomUtil.testProp([ "transform", "WebkitTransform", "OTransform", "MozTransform", "msTransform" ]);
    L.DomUtil.TRANSITION = L.DomUtil.testProp([ "webkitTransition", "transition", "OTransition", "MozTransition", "msTransition" ]);
    L.DomUtil.TRANSITION_END = "webkitTransition" === L.DomUtil.TRANSITION || "OTransition" === L.DomUtil.TRANSITION ? L.DomUtil.TRANSITION + "End" : "transitionend";
    (function() {
        var userSelectProperty = L.DomUtil.testProp([ "userSelect", "WebkitUserSelect", "OUserSelect", "MozUserSelect", "msUserSelect" ]);
        L.extend(L.DomUtil, {
            disableTextSelection: function() {
                L.DomEvent.on(window, "selectstart", L.DomEvent.preventDefault);
                if (userSelectProperty) {
                    var style = document.documentElement.style;
                    this._userSelect = style[userSelectProperty];
                    style[userSelectProperty] = "none";
                }
            },
            enableTextSelection: function() {
                L.DomEvent.off(window, "selectstart", L.DomEvent.preventDefault);
                if (userSelectProperty) {
                    document.documentElement.style[userSelectProperty] = this._userSelect;
                    delete this._userSelect;
                }
            },
            disableImageDrag: function() {
                L.DomEvent.on(window, "dragstart", L.DomEvent.preventDefault);
            },
            enableImageDrag: function() {
                L.DomEvent.off(window, "dragstart", L.DomEvent.preventDefault);
            }
        });
    })();
    L.LatLng = function(rawLat, rawLng) {
        var lat = parseFloat(rawLat), lng = parseFloat(rawLng);
        if (isNaN(lat) || isNaN(lng)) throw new Error("Invalid LatLng object: (" + rawLat + ", " + rawLng + ")");
        this.lat = lat;
        this.lng = lng;
    };
    L.extend(L.LatLng, {
        DEG_TO_RAD: Math.PI / 180,
        RAD_TO_DEG: 180 / Math.PI,
        MAX_MARGIN: 1e-9
    });
    L.LatLng.prototype = {
        equals: function(obj) {
            if (!obj) return false;
            obj = L.latLng(obj);
            var margin = Math.max(Math.abs(this.lat - obj.lat), Math.abs(this.lng - obj.lng));
            return L.LatLng.MAX_MARGIN >= margin;
        },
        toString: function(precision) {
            return "LatLng(" + L.Util.formatNum(this.lat, precision) + ", " + L.Util.formatNum(this.lng, precision) + ")";
        },
        distanceTo: function(other) {
            other = L.latLng(other);
            var R = 6378137, d2r = L.LatLng.DEG_TO_RAD, dLat = (other.lat - this.lat) * d2r, dLon = (other.lng - this.lng) * d2r, lat1 = this.lat * d2r, lat2 = other.lat * d2r, sin1 = Math.sin(dLat / 2), sin2 = Math.sin(dLon / 2);
            var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);
            return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        },
        wrap: function(a, b) {
            var lng = this.lng;
            a = a || -180;
            b = b || 180;
            lng = (lng + b) % (b - a) + (a > lng || lng === b ? b : a);
            return new L.LatLng(this.lat, lng);
        }
    };
    L.latLng = function(a, b) {
        if (a instanceof L.LatLng) return a;
        if (L.Util.isArray(a)) return new L.LatLng(a[0], a[1]);
        if (a === undefined || null === a) return a;
        if ("object" == typeof a && "lat" in a) return new L.LatLng(a.lat, "lng" in a ? a.lng : a.lon);
        return new L.LatLng(a, b);
    };
    L.LatLngBounds = function(southWest, northEast) {
        if (!southWest) return;
        var latlngs = northEast ? [ southWest, northEast ] : southWest;
        for (var i = 0, len = latlngs.length; len > i; i++) this.extend(latlngs[i]);
    };
    L.LatLngBounds.prototype = {
        extend: function(obj) {
            if (!obj) return this;
            obj = "number" == typeof obj[0] || "string" == typeof obj[0] || obj instanceof L.LatLng ? L.latLng(obj) : L.latLngBounds(obj);
            if (obj instanceof L.LatLng) if (this._southWest || this._northEast) {
                this._southWest.lat = Math.min(obj.lat, this._southWest.lat);
                this._southWest.lng = Math.min(obj.lng, this._southWest.lng);
                this._northEast.lat = Math.max(obj.lat, this._northEast.lat);
                this._northEast.lng = Math.max(obj.lng, this._northEast.lng);
            } else {
                this._southWest = new L.LatLng(obj.lat, obj.lng);
                this._northEast = new L.LatLng(obj.lat, obj.lng);
            } else if (obj instanceof L.LatLngBounds) {
                this.extend(obj._southWest);
                this.extend(obj._northEast);
            }
            return this;
        },
        pad: function(bufferRatio) {
            var sw = this._southWest, ne = this._northEast, heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio, widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;
            return new L.LatLngBounds(new L.LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer), new L.LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
        },
        getCenter: function() {
            return new L.LatLng((this._southWest.lat + this._northEast.lat) / 2, (this._southWest.lng + this._northEast.lng) / 2);
        },
        getSouthWest: function() {
            return this._southWest;
        },
        getNorthEast: function() {
            return this._northEast;
        },
        getNorthWest: function() {
            return new L.LatLng(this.getNorth(), this.getWest());
        },
        getSouthEast: function() {
            return new L.LatLng(this.getSouth(), this.getEast());
        },
        getWest: function() {
            return this._southWest.lng;
        },
        getSouth: function() {
            return this._southWest.lat;
        },
        getEast: function() {
            return this._northEast.lng;
        },
        getNorth: function() {
            return this._northEast.lat;
        },
        contains: function(obj) {
            obj = "number" == typeof obj[0] || obj instanceof L.LatLng ? L.latLng(obj) : L.latLngBounds(obj);
            var sw2, ne2, sw = this._southWest, ne = this._northEast;
            if (obj instanceof L.LatLngBounds) {
                sw2 = obj.getSouthWest();
                ne2 = obj.getNorthEast();
            } else sw2 = ne2 = obj;
            return sw2.lat >= sw.lat && ne2.lat <= ne.lat && sw2.lng >= sw.lng && ne2.lng <= ne.lng;
        },
        intersects: function(bounds) {
            bounds = L.latLngBounds(bounds);
            var sw = this._southWest, ne = this._northEast, sw2 = bounds.getSouthWest(), ne2 = bounds.getNorthEast(), latIntersects = ne2.lat >= sw.lat && sw2.lat <= ne.lat, lngIntersects = ne2.lng >= sw.lng && sw2.lng <= ne.lng;
            return latIntersects && lngIntersects;
        },
        toBBoxString: function() {
            return [ this.getWest(), this.getSouth(), this.getEast(), this.getNorth() ].join(",");
        },
        equals: function(bounds) {
            if (!bounds) return false;
            bounds = L.latLngBounds(bounds);
            return this._southWest.equals(bounds.getSouthWest()) && this._northEast.equals(bounds.getNorthEast());
        },
        isValid: function() {
            return !!(this._southWest && this._northEast);
        }
    };
    L.latLngBounds = function(a, b) {
        if (!a || a instanceof L.LatLngBounds) return a;
        return new L.LatLngBounds(a, b);
    };
    L.Projection = {};
    L.Projection.SphericalMercator = {
        MAX_LATITUDE: 85.0511287798,
        project: function(latlng) {
            var d = L.LatLng.DEG_TO_RAD, max = this.MAX_LATITUDE, lat = Math.max(Math.min(max, latlng.lat), -max), x = latlng.lng * d, y = lat * d;
            y = Math.log(Math.tan(Math.PI / 4 + y / 2));
            return new L.Point(x, y);
        },
        unproject: function(point) {
            var d = L.LatLng.RAD_TO_DEG, lng = point.x * d, lat = (2 * Math.atan(Math.exp(point.y)) - Math.PI / 2) * d;
            return new L.LatLng(lat, lng);
        }
    };
    L.Projection.LonLat = {
        project: function(latlng) {
            return new L.Point(latlng.lng, latlng.lat);
        },
        unproject: function(point) {
            return new L.LatLng(point.y, point.x);
        }
    };
    L.CRS = {
        latLngToPoint: function(latlng, zoom) {
            var projectedPoint = this.projection.project(latlng), scale = this.scale(zoom);
            return this.transformation._transform(projectedPoint, scale);
        },
        pointToLatLng: function(point, zoom) {
            var scale = this.scale(zoom), untransformedPoint = this.transformation.untransform(point, scale);
            return this.projection.unproject(untransformedPoint);
        },
        project: function(latlng) {
            return this.projection.project(latlng);
        },
        scale: function(zoom) {
            return 256 * Math.pow(2, zoom);
        }
    };
    L.CRS.Simple = L.extend({}, L.CRS, {
        projection: L.Projection.LonLat,
        transformation: new L.Transformation(1, 0, -1, 0),
        scale: function(zoom) {
            return Math.pow(2, zoom);
        }
    });
    L.CRS.EPSG3857 = L.extend({}, L.CRS, {
        code: "EPSG:3857",
        projection: L.Projection.SphericalMercator,
        transformation: new L.Transformation(.5 / Math.PI, .5, -.5 / Math.PI, .5),
        project: function(latlng) {
            var projectedPoint = this.projection.project(latlng), earthRadius = 6378137;
            return projectedPoint.multiplyBy(earthRadius);
        }
    });
    L.CRS.EPSG900913 = L.extend({}, L.CRS.EPSG3857, {
        code: "EPSG:900913"
    });
    L.CRS.EPSG4326 = L.extend({}, L.CRS, {
        code: "EPSG:4326",
        projection: L.Projection.LonLat,
        transformation: new L.Transformation(1 / 360, .5, -1 / 360, .5)
    });
    L.Map = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            crs: L.CRS.EPSG3857,
            fadeAnimation: L.DomUtil.TRANSITION && !L.Browser.android23,
            trackResize: true,
            markerZoomAnimation: L.DomUtil.TRANSITION && L.Browser.any3d
        },
        initialize: function(id, options) {
            options = L.setOptions(this, options);
            this._initContainer(id);
            this._initLayout();
            this._initEvents();
            options.maxBounds && this.setMaxBounds(options.maxBounds);
            options.center && options.zoom !== undefined && this.setView(L.latLng(options.center), options.zoom, {
                reset: true
            });
            this._handlers = [];
            this._layers = {};
            this._zoomBoundLayers = {};
            this._tileLayersNum = 0;
            this.callInitHooks();
            this._addLayers(options.layers);
        },
        setView: function(center, zoom) {
            this._resetView(L.latLng(center), this._limitZoom(zoom));
            return this;
        },
        setZoom: function(zoom, options) {
            return this.setView(this.getCenter(), zoom, {
                zoom: options
            });
        },
        zoomIn: function(delta, options) {
            return this.setZoom(this._zoom + (delta || 1), options);
        },
        zoomOut: function(delta, options) {
            return this.setZoom(this._zoom - (delta || 1), options);
        },
        setZoomAround: function(latlng, zoom, options) {
            var scale = this.getZoomScale(zoom), viewHalf = this.getSize().divideBy(2), containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng), centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale), newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));
            return this.setView(newCenter, zoom, {
                zoom: options
            });
        },
        fitBounds: function(bounds, options) {
            options = options || {};
            bounds = bounds.getBounds ? bounds.getBounds() : L.latLngBounds(bounds);
            var paddingTL = L.point(options.paddingTopLeft || options.padding || [ 0, 0 ]), paddingBR = L.point(options.paddingBottomRight || options.padding || [ 0, 0 ]), zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR)), paddingOffset = paddingBR.subtract(paddingTL).divideBy(2), swPoint = this.project(bounds.getSouthWest(), zoom), nePoint = this.project(bounds.getNorthEast(), zoom), center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);
            return this.setView(center, zoom, options);
        },
        fitWorld: function(options) {
            return this.fitBounds([ [ -90, -180 ], [ 90, 180 ] ], options);
        },
        panTo: function(center, options) {
            return this.setView(center, this._zoom, {
                pan: options
            });
        },
        panBy: function(offset) {
            this.fire("movestart");
            this._rawPanBy(L.point(offset));
            this.fire("move");
            return this.fire("moveend");
        },
        setMaxBounds: function(bounds, options) {
            bounds = L.latLngBounds(bounds);
            this.options.maxBounds = bounds;
            if (!bounds) {
                this._boundsMinZoom = null;
                this.off("moveend", this._panInsideMaxBounds, this);
                return this;
            }
            var minZoom = this.getBoundsZoom(bounds, true);
            this._boundsMinZoom = minZoom;
            this._loaded && (minZoom > this._zoom ? this.setView(bounds.getCenter(), minZoom, options) : this.panInsideBounds(bounds));
            this.on("moveend", this._panInsideMaxBounds, this);
            return this;
        },
        panInsideBounds: function(bounds) {
            bounds = L.latLngBounds(bounds);
            var viewBounds = this.getPixelBounds(), viewSw = viewBounds.getBottomLeft(), viewNe = viewBounds.getTopRight(), sw = this.project(bounds.getSouthWest()), ne = this.project(bounds.getNorthEast()), dx = 0, dy = 0;
            viewNe.y < ne.y && (dy = Math.ceil(ne.y - viewNe.y));
            viewNe.x > ne.x && (dx = Math.floor(ne.x - viewNe.x));
            viewSw.y > sw.y && (dy = Math.floor(sw.y - viewSw.y));
            viewSw.x < sw.x && (dx = Math.ceil(sw.x - viewSw.x));
            if (dx || dy) return this.panBy([ dx, dy ]);
            return this;
        },
        addLayer: function(layer) {
            var id = L.stamp(layer);
            if (this._layers[id]) return this;
            this._layers[id] = layer;
            if (layer.options && (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom))) {
                this._zoomBoundLayers[id] = layer;
                this._updateZoomLevels();
            }
            if (this.options.zoomAnimation && L.TileLayer && layer instanceof L.TileLayer) {
                this._tileLayersNum++;
                this._tileLayersToLoad++;
                layer.on("load", this._onTileLayerLoad, this);
            }
            this._loaded && this._layerAdd(layer);
            return this;
        },
        removeLayer: function(layer) {
            var id = L.stamp(layer);
            if (!this._layers[id]) return;
            this._loaded && layer.onRemove(this);
            delete this._layers[id];
            this._loaded && this.fire("layerremove", {
                layer: layer
            });
            if (this._zoomBoundLayers[id]) {
                delete this._zoomBoundLayers[id];
                this._updateZoomLevels();
            }
            if (this.options.zoomAnimation && L.TileLayer && layer instanceof L.TileLayer) {
                this._tileLayersNum--;
                this._tileLayersToLoad--;
                layer.off("load", this._onTileLayerLoad, this);
            }
            return this;
        },
        hasLayer: function(layer) {
            if (!layer) return false;
            return L.stamp(layer) in this._layers;
        },
        eachLayer: function(method, context) {
            for (var i in this._layers) method.call(context, this._layers[i]);
            return this;
        },
        invalidateSize: function(options) {
            options = L.extend({
                animate: false,
                pan: true
            }, true === options ? {
                animate: true
            } : options);
            var oldSize = this.getSize();
            this._sizeChanged = true;
            this.options.maxBounds && this.setMaxBounds(this.options.maxBounds);
            if (!this._loaded) return this;
            var newSize = this.getSize(), offset = oldSize.subtract(newSize).divideBy(2).round();
            if (!offset.x && !offset.y) return this;
            if (options.animate && options.pan) this.panBy(offset); else {
                options.pan && this._rawPanBy(offset);
                this.fire("move");
                clearTimeout(this._sizeTimer);
                this._sizeTimer = setTimeout(L.bind(this.fire, this, "moveend"), 200);
            }
            return this.fire("resize", {
                oldSize: oldSize,
                newSize: newSize
            });
        },
        addHandler: function(name, HandlerClass) {
            if (!HandlerClass) return;
            var handler = this[name] = new HandlerClass(this);
            this._handlers.push(handler);
            this.options[name] && handler.enable();
            return this;
        },
        remove: function() {
            this._loaded && this.fire("unload");
            this._initEvents("off");
            delete this._container._leaflet;
            this._clearPanes();
            this._clearControlPos && this._clearControlPos();
            this._clearHandlers();
            return this;
        },
        getCenter: function() {
            this._checkIfLoaded();
            if (!this._moved()) return this._initialCenter;
            return this.layerPointToLatLng(this._getCenterLayerPoint());
        },
        getZoom: function() {
            return this._zoom;
        },
        getBounds: function() {
            var bounds = this.getPixelBounds(), sw = this.unproject(bounds.getBottomLeft()), ne = this.unproject(bounds.getTopRight());
            return new L.LatLngBounds(sw, ne);
        },
        getMinZoom: function() {
            var z1 = this._layersMinZoom === undefined ? -1/0 : this._layersMinZoom, z2 = this._boundsMinZoom === undefined ? -1/0 : this._boundsMinZoom;
            return this.options.minZoom === undefined ? Math.max(z1, z2) : this.options.minZoom;
        },
        getMaxZoom: function() {
            return this.options.maxZoom === undefined ? this._layersMaxZoom === undefined ? 1/0 : this._layersMaxZoom : this.options.maxZoom;
        },
        getBoundsZoom: function(bounds, inside, padding) {
            bounds = L.latLngBounds(bounds);
            var boundsSize, zoom = this.getMinZoom() - (inside ? 1 : 0), maxZoom = this.getMaxZoom(), size = this.getSize(), nw = bounds.getNorthWest(), se = bounds.getSouthEast(), zoomNotFound = true;
            padding = L.point(padding || [ 0, 0 ]);
            do {
                zoom++;
                boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding);
                zoomNotFound = inside ? boundsSize.x < size.x || boundsSize.y < size.y : size.contains(boundsSize);
            } while (zoomNotFound && maxZoom >= zoom);
            if (zoomNotFound && inside) return null;
            return inside ? zoom : zoom - 1;
        },
        getSize: function() {
            if (!this._size || this._sizeChanged) {
                this._size = new L.Point(this._container.clientWidth, this._container.clientHeight);
                this._sizeChanged = false;
            }
            return this._size.clone();
        },
        getPixelBounds: function() {
            var topLeftPoint = this._getTopLeftPoint();
            return new L.Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
        },
        getPixelOrigin: function() {
            this._checkIfLoaded();
            return this._initialTopLeftPoint;
        },
        getPanes: function() {
            return this._panes;
        },
        getContainer: function() {
            return this._container;
        },
        getZoomScale: function(toZoom) {
            var crs = this.options.crs;
            return crs.scale(toZoom) / crs.scale(this._zoom);
        },
        getScaleZoom: function(scale) {
            return this._zoom + Math.log(scale) / Math.LN2;
        },
        project: function(latlng, zoom) {
            zoom = zoom === undefined ? this._zoom : zoom;
            return this.options.crs.latLngToPoint(L.latLng(latlng), zoom);
        },
        unproject: function(point, zoom) {
            zoom = zoom === undefined ? this._zoom : zoom;
            return this.options.crs.pointToLatLng(L.point(point), zoom);
        },
        layerPointToLatLng: function(point) {
            var projectedPoint = L.point(point).add(this.getPixelOrigin());
            return this.unproject(projectedPoint);
        },
        latLngToLayerPoint: function(latlng) {
            var projectedPoint = this.project(L.latLng(latlng))._round();
            return projectedPoint._subtract(this.getPixelOrigin());
        },
        containerPointToLayerPoint: function(point) {
            return L.point(point).subtract(this._getMapPanePos());
        },
        layerPointToContainerPoint: function(point) {
            return L.point(point).add(this._getMapPanePos());
        },
        containerPointToLatLng: function(point) {
            var layerPoint = this.containerPointToLayerPoint(L.point(point));
            return this.layerPointToLatLng(layerPoint);
        },
        latLngToContainerPoint: function(latlng) {
            return this.layerPointToContainerPoint(this.latLngToLayerPoint(L.latLng(latlng)));
        },
        mouseEventToContainerPoint: function(e) {
            return L.DomEvent.getMousePosition(e, this._container);
        },
        mouseEventToLayerPoint: function(e) {
            return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
        },
        mouseEventToLatLng: function(e) {
            return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
        },
        _initContainer: function(id) {
            var container = this._container = L.DomUtil.get(id);
            if (!container) throw new Error("Map container not found.");
            if (container._leaflet) throw new Error("Map container is already initialized.");
            container._leaflet = true;
        },
        _initLayout: function() {
            var container = this._container;
            L.DomUtil.addClass(container, "leaflet-container" + (L.Browser.touch ? " leaflet-touch" : "") + (L.Browser.retina ? " leaflet-retina" : "") + (this.options.fadeAnimation ? " leaflet-fade-anim" : ""));
            var position = L.DomUtil.getStyle(container, "position");
            "absolute" !== position && "relative" !== position && "fixed" !== position && (container.style.position = "relative");
            this._initPanes();
            this._initControlPos && this._initControlPos();
        },
        _initPanes: function() {
            var panes = this._panes = {};
            this._mapPane = panes.mapPane = this._createPane("leaflet-map-pane", this._container);
            this._tilePane = panes.tilePane = this._createPane("leaflet-tile-pane", this._mapPane);
            panes.objectsPane = this._createPane("leaflet-objects-pane", this._mapPane);
            panes.shadowPane = this._createPane("leaflet-shadow-pane");
            panes.overlayPane = this._createPane("leaflet-overlay-pane");
            panes.markerPane = this._createPane("leaflet-marker-pane");
            panes.popupPane = this._createPane("leaflet-popup-pane");
            var zoomHide = " leaflet-zoom-hide";
            if (!this.options.markerZoomAnimation) {
                L.DomUtil.addClass(panes.markerPane, zoomHide);
                L.DomUtil.addClass(panes.shadowPane, zoomHide);
                L.DomUtil.addClass(panes.popupPane, zoomHide);
            }
        },
        _createPane: function(className, container) {
            return L.DomUtil.create("div", className, container || this._panes.objectsPane);
        },
        _clearPanes: function() {
            this._container.removeChild(this._mapPane);
        },
        _addLayers: function(layers) {
            layers = layers ? L.Util.isArray(layers) ? layers : [ layers ] : [];
            for (var i = 0, len = layers.length; len > i; i++) this.addLayer(layers[i]);
        },
        _resetView: function(center, zoom, preserveMapOffset, afterZoomAnim) {
            var zoomChanged = this._zoom !== zoom;
            if (!afterZoomAnim) {
                this.fire("movestart");
                zoomChanged && this.fire("zoomstart");
            }
            this._zoom = zoom;
            this._initialCenter = center;
            this._initialTopLeftPoint = this._getNewTopLeftPoint(center);
            preserveMapOffset ? this._initialTopLeftPoint._add(this._getMapPanePos()) : L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));
            this._tileLayersToLoad = this._tileLayersNum;
            var loading = !this._loaded;
            this._loaded = true;
            if (loading) {
                this.fire("load");
                this.eachLayer(this._layerAdd, this);
            }
            this.fire("viewreset", {
                hard: !preserveMapOffset
            });
            this.fire("move");
            (zoomChanged || afterZoomAnim) && this.fire("zoomend");
            this.fire("moveend", {
                hard: !preserveMapOffset
            });
        },
        _rawPanBy: function(offset) {
            L.DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
        },
        _getZoomSpan: function() {
            return this.getMaxZoom() - this.getMinZoom();
        },
        _updateZoomLevels: function() {
            var i, minZoom = 1/0, maxZoom = -1/0, oldZoomSpan = this._getZoomSpan();
            for (i in this._zoomBoundLayers) {
                var layer = this._zoomBoundLayers[i];
                isNaN(layer.options.minZoom) || (minZoom = Math.min(minZoom, layer.options.minZoom));
                isNaN(layer.options.maxZoom) || (maxZoom = Math.max(maxZoom, layer.options.maxZoom));
            }
            if (i === undefined) this._layersMaxZoom = this._layersMinZoom = undefined; else {
                this._layersMaxZoom = maxZoom;
                this._layersMinZoom = minZoom;
            }
            oldZoomSpan !== this._getZoomSpan() && this.fire("zoomlevelschange");
        },
        _panInsideMaxBounds: function() {
            this.panInsideBounds(this.options.maxBounds);
        },
        _checkIfLoaded: function() {
            if (!this._loaded) throw new Error("Set map center and zoom first.");
        },
        _initEvents: function(onOff) {
            if (!L.DomEvent) return;
            onOff = onOff || "on";
            L.DomEvent[onOff](this._container, "click", this._onMouseClick, this);
            var i, len, events = [ "dblclick", "mousedown", "mouseup", "mouseenter", "mouseleave", "mousemove", "contextmenu" ];
            for (i = 0, len = events.length; len > i; i++) L.DomEvent[onOff](this._container, events[i], this._fireMouseEvent, this);
            this.options.trackResize && L.DomEvent[onOff](window, "resize", this._onResize, this);
        },
        _onResize: function() {
            L.Util.cancelAnimFrame(this._resizeRequest);
            this._resizeRequest = L.Util.requestAnimFrame(this.invalidateSize, this, false, this._container);
        },
        _onMouseClick: function(e) {
            if (!this._loaded || !e._simulated && this.dragging && this.dragging.moved() || L.DomEvent._skipped(e)) return;
            this.fire("preclick");
            this._fireMouseEvent(e);
        },
        _fireMouseEvent: function(e) {
            if (!this._loaded || L.DomEvent._skipped(e)) return;
            var type = e.type;
            type = "mouseenter" === type ? "mouseover" : "mouseleave" === type ? "mouseout" : type;
            if (!this.hasEventListeners(type)) return;
            "contextmenu" === type && L.DomEvent.preventDefault(e);
            var containerPoint = this.mouseEventToContainerPoint(e), layerPoint = this.containerPointToLayerPoint(containerPoint), latlng = this.layerPointToLatLng(layerPoint);
            this.fire(type, {
                latlng: latlng,
                layerPoint: layerPoint,
                containerPoint: containerPoint,
                originalEvent: e
            });
        },
        _onTileLayerLoad: function() {
            this._tileLayersToLoad--;
            this._tileLayersNum && !this._tileLayersToLoad && this.fire("tilelayersload");
        },
        _clearHandlers: function() {
            for (var i = 0, len = this._handlers.length; len > i; i++) this._handlers[i].disable();
        },
        whenReady: function(callback, context) {
            this._loaded ? callback.call(context || this, this) : this.on("load", callback, context);
            return this;
        },
        _layerAdd: function(layer) {
            layer.onAdd(this);
            this.fire("layeradd", {
                layer: layer
            });
        },
        _getMapPanePos: function() {
            return L.DomUtil.getPosition(this._mapPane);
        },
        _moved: function() {
            var pos = this._getMapPanePos();
            return pos && !pos.equals([ 0, 0 ]);
        },
        _getTopLeftPoint: function() {
            return this.getPixelOrigin().subtract(this._getMapPanePos());
        },
        _getNewTopLeftPoint: function(center, zoom) {
            var viewHalf = this.getSize()._divideBy(2);
            return this.project(center, zoom)._subtract(viewHalf)._round();
        },
        _latLngToNewLayerPoint: function(latlng, newZoom, newCenter) {
            var topLeft = this._getNewTopLeftPoint(newCenter, newZoom).add(this._getMapPanePos());
            return this.project(latlng, newZoom)._subtract(topLeft);
        },
        _getCenterLayerPoint: function() {
            return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
        },
        _getCenterOffset: function(latlng) {
            return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
        },
        _limitZoom: function(zoom) {
            var min = this.getMinZoom(), max = this.getMaxZoom();
            return Math.max(min, Math.min(max, zoom));
        }
    });
    L.map = function(id, options) {
        return new L.Map(id, options);
    };
    L.Projection.Mercator = {
        MAX_LATITUDE: 85.0840591556,
        R_MINOR: 6356752.314245179,
        R_MAJOR: 6378137,
        project: function(latlng) {
            var d = L.LatLng.DEG_TO_RAD, max = this.MAX_LATITUDE, lat = Math.max(Math.min(max, latlng.lat), -max), r = this.R_MAJOR, r2 = this.R_MINOR, x = latlng.lng * d * r, y = lat * d, tmp = r2 / r, eccent = Math.sqrt(1 - tmp * tmp), con = eccent * Math.sin(y);
            con = Math.pow((1 - con) / (1 + con), .5 * eccent);
            var ts = Math.tan(.5 * (.5 * Math.PI - y)) / con;
            y = -r * Math.log(ts);
            return new L.Point(x, y);
        },
        unproject: function(point) {
            var con, d = L.LatLng.RAD_TO_DEG, r = this.R_MAJOR, r2 = this.R_MINOR, lng = point.x * d / r, tmp = r2 / r, eccent = Math.sqrt(1 - tmp * tmp), ts = Math.exp(-point.y / r), phi = Math.PI / 2 - 2 * Math.atan(ts), numIter = 15, tol = 1e-7, i = numIter, dphi = .1;
            while (Math.abs(dphi) > tol && --i > 0) {
                con = eccent * Math.sin(phi);
                dphi = Math.PI / 2 - 2 * Math.atan(ts * Math.pow((1 - con) / (1 + con), .5 * eccent)) - phi;
                phi += dphi;
            }
            return new L.LatLng(phi * d, lng);
        }
    };
    L.CRS.EPSG3395 = L.extend({}, L.CRS, {
        code: "EPSG:3395",
        projection: L.Projection.Mercator,
        transformation: function() {
            var m = L.Projection.Mercator, r = m.R_MAJOR, r2 = m.R_MINOR;
            return new L.Transformation(.5 / (Math.PI * r), .5, -.5 / (Math.PI * r2), .5);
        }()
    });
    L.TileLayer = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            minZoom: 0,
            maxZoom: 18,
            tileSize: 256,
            subdomains: "abc",
            errorTileUrl: "",
            attribution: "",
            zoomOffset: 0,
            opacity: 1,
            unloadInvisibleTiles: L.Browser.mobile,
            updateWhenIdle: L.Browser.mobile
        },
        initialize: function(url, options) {
            options = L.setOptions(this, options);
            if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {
                options.tileSize = Math.floor(options.tileSize / 2);
                options.zoomOffset++;
                options.minZoom > 0 && options.minZoom--;
                this.options.maxZoom--;
            }
            options.bounds && (options.bounds = L.latLngBounds(options.bounds));
            this._url = url;
            var subdomains = this.options.subdomains;
            "string" == typeof subdomains && (this.options.subdomains = subdomains.split(""));
        },
        onAdd: function(map) {
            this._map = map;
            this._animated = map._zoomAnimated;
            this._initContainer();
            this._createTileProto();
            map.on({
                viewreset: this._reset,
                moveend: this._update
            }, this);
            this._animated && map.on({
                zoomanim: this._animateZoom,
                zoomend: this._endZoomAnim
            }, this);
            if (!this.options.updateWhenIdle) {
                this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
                map.on("move", this._limitedUpdate, this);
            }
            this._reset();
            this._update();
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        onRemove: function(map) {
            this._container.parentNode.removeChild(this._container);
            map.off({
                viewreset: this._reset,
                moveend: this._update
            }, this);
            this._animated && map.off({
                zoomanim: this._animateZoom,
                zoomend: this._endZoomAnim
            }, this);
            this.options.updateWhenIdle || map.off("move", this._limitedUpdate, this);
            this._container = null;
            this._map = null;
        },
        bringToFront: function() {
            var pane = this._map._panes.tilePane;
            if (this._container) {
                pane.appendChild(this._container);
                this._setAutoZIndex(pane, Math.max);
            }
            return this;
        },
        bringToBack: function() {
            var pane = this._map._panes.tilePane;
            if (this._container) {
                pane.insertBefore(this._container, pane.firstChild);
                this._setAutoZIndex(pane, Math.min);
            }
            return this;
        },
        getAttribution: function() {
            return this.options.attribution;
        },
        getContainer: function() {
            return this._container;
        },
        setOpacity: function(opacity) {
            this.options.opacity = opacity;
            this._map && this._updateOpacity();
            return this;
        },
        setZIndex: function(zIndex) {
            this.options.zIndex = zIndex;
            this._updateZIndex();
            return this;
        },
        setUrl: function(url, noRedraw) {
            this._url = url;
            noRedraw || this.redraw();
            return this;
        },
        redraw: function() {
            if (this._map) {
                this._reset({
                    hard: true
                });
                this._update();
            }
            return this;
        },
        _updateZIndex: function() {
            this._container && this.options.zIndex !== undefined && (this._container.style.zIndex = this.options.zIndex);
        },
        _setAutoZIndex: function(pane, compare) {
            var zIndex, i, len, layers = pane.children, edgeZIndex = -compare(1/0, -1/0);
            for (i = 0, len = layers.length; len > i; i++) if (layers[i] !== this._container) {
                zIndex = parseInt(layers[i].style.zIndex, 10);
                isNaN(zIndex) || (edgeZIndex = compare(edgeZIndex, zIndex));
            }
            this.options.zIndex = this._container.style.zIndex = (isFinite(edgeZIndex) ? edgeZIndex : 0) + compare(1, -1);
        },
        _updateOpacity: function() {
            var i, tiles = this._tiles;
            if (L.Browser.ielt9) for (i in tiles) L.DomUtil.setOpacity(tiles[i], this.options.opacity); else L.DomUtil.setOpacity(this._container, this.options.opacity);
        },
        _initContainer: function() {
            var tilePane = this._map._panes.tilePane;
            if (!this._container) {
                this._container = L.DomUtil.create("div", "leaflet-layer");
                this._updateZIndex();
                if (this._animated) {
                    var className = "leaflet-tile-container leaflet-zoom-animated";
                    this._bgBuffer = L.DomUtil.create("div", className, this._container);
                    this._tileContainer = L.DomUtil.create("div", className, this._container);
                } else this._tileContainer = this._container;
                tilePane.appendChild(this._container);
                1 > this.options.opacity && this._updateOpacity();
            }
        },
        _reset: function(e) {
            for (var key in this._tiles) this.fire("tileunload", {
                tile: this._tiles[key]
            });
            this._tiles = {};
            this._tilesToLoad = 0;
            this.options.reuseTiles && (this._unusedTiles = []);
            this._tileContainer.innerHTML = "";
            this._animated && e && e.hard && this._clearBgBuffer();
            this._initContainer();
        },
        _update: function() {
            if (!this._map) return;
            var bounds = this._map.getPixelBounds(), zoom = this._map.getZoom(), tileSize = this.options.tileSize;
            if (zoom > this.options.maxZoom || this.options.minZoom > zoom) return;
            var tileBounds = L.bounds(bounds.min.divideBy(tileSize)._floor(), bounds.max.divideBy(tileSize)._floor());
            this._addTilesFromCenterOut(tileBounds);
            (this.options.unloadInvisibleTiles || this.options.reuseTiles) && this._removeOtherTiles(tileBounds);
        },
        _addTilesFromCenterOut: function(bounds) {
            var queue = [], center = bounds.getCenter();
            var j, i, point;
            for (j = bounds.min.y; bounds.max.y >= j; j++) for (i = bounds.min.x; bounds.max.x >= i; i++) {
                point = new L.Point(i, j);
                this._tileShouldBeLoaded(point) && queue.push(point);
            }
            var tilesToLoad = queue.length;
            if (0 === tilesToLoad) return;
            queue.sort(function(a, b) {
                return a.distanceTo(center) - b.distanceTo(center);
            });
            var fragment = document.createDocumentFragment();
            this._tilesToLoad || this.fire("loading");
            this._tilesToLoad += tilesToLoad;
            for (i = 0; tilesToLoad > i; i++) this._addTile(queue[i], fragment);
            this._tileContainer.appendChild(fragment);
        },
        _tileShouldBeLoaded: function(tilePoint) {
            if (tilePoint.x + ":" + tilePoint.y in this._tiles) return false;
            var options = this.options;
            if (!options.continuousWorld) {
                var limit = this._getWrapTileNum();
                if (options.noWrap && (0 > tilePoint.x || tilePoint.x >= limit) || 0 > tilePoint.y || tilePoint.y >= limit) return false;
            }
            if (options.bounds) {
                var tileSize = options.tileSize, nwPoint = tilePoint.multiplyBy(tileSize), sePoint = nwPoint.add([ tileSize, tileSize ]), nw = this._map.unproject(nwPoint), se = this._map.unproject(sePoint);
                if (!options.continuousWorld && !options.noWrap) {
                    nw = nw.wrap();
                    se = se.wrap();
                }
                if (!options.bounds.intersects([ nw, se ])) return false;
            }
            return true;
        },
        _removeOtherTiles: function(bounds) {
            var kArr, x, y, key;
            for (key in this._tiles) {
                kArr = key.split(":");
                x = parseInt(kArr[0], 10);
                y = parseInt(kArr[1], 10);
                (bounds.min.x > x || x > bounds.max.x || bounds.min.y > y || y > bounds.max.y) && this._removeTile(key);
            }
        },
        _removeTile: function(key) {
            var tile = this._tiles[key];
            this.fire("tileunload", {
                tile: tile,
                url: tile.src
            });
            if (this.options.reuseTiles) {
                L.DomUtil.removeClass(tile, "leaflet-tile-loaded");
                this._unusedTiles.push(tile);
            } else tile.parentNode === this._tileContainer && this._tileContainer.removeChild(tile);
            if (!L.Browser.android) {
                tile.onload = null;
                tile.src = L.Util.emptyImageUrl;
            }
            delete this._tiles[key];
        },
        _addTile: function(tilePoint, container) {
            var tilePos = this._getTilePos(tilePoint);
            var tile = this._getTile();
            L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome || L.Browser.android23);
            this._tiles[tilePoint.x + ":" + tilePoint.y] = tile;
            this._loadTile(tile, tilePoint);
            tile.parentNode !== this._tileContainer && container.appendChild(tile);
        },
        _getZoomForUrl: function() {
            var options = this.options, zoom = this._map.getZoom();
            options.zoomReverse && (zoom = options.maxZoom - zoom);
            return zoom + options.zoomOffset;
        },
        _getTilePos: function(tilePoint) {
            var origin = this._map.getPixelOrigin(), tileSize = this.options.tileSize;
            return tilePoint.multiplyBy(tileSize).subtract(origin);
        },
        getTileUrl: function(tilePoint) {
            return L.Util.template(this._url, L.extend({
                s: this._getSubdomain(tilePoint),
                z: tilePoint.z,
                x: tilePoint.x,
                y: tilePoint.y
            }, this.options));
        },
        _getWrapTileNum: function() {
            return Math.pow(2, this._getZoomForUrl());
        },
        _adjustTilePoint: function(tilePoint) {
            var limit = this._getWrapTileNum();
            this.options.continuousWorld || this.options.noWrap || (tilePoint.x = (tilePoint.x % limit + limit) % limit);
            this.options.tms && (tilePoint.y = limit - tilePoint.y - 1);
            tilePoint.z = this._getZoomForUrl();
        },
        _getSubdomain: function(tilePoint) {
            var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
            return this.options.subdomains[index];
        },
        _createTileProto: function() {
            var img = this._tileImg = L.DomUtil.create("img", "leaflet-tile");
            img.style.width = img.style.height = this.options.tileSize + "px";
            img.galleryimg = "no";
        },
        _getTile: function() {
            if (this.options.reuseTiles && this._unusedTiles.length > 0) {
                var tile = this._unusedTiles.pop();
                this._resetTile(tile);
                return tile;
            }
            return this._createTile();
        },
        _resetTile: function() {},
        _createTile: function() {
            var tile = this._tileImg.cloneNode(false);
            tile.onselectstart = tile.onmousemove = L.Util.falseFn;
            L.Browser.ielt9 && this.options.opacity !== undefined && L.DomUtil.setOpacity(tile, this.options.opacity);
            return tile;
        },
        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile.onload = this._tileOnLoad;
            tile.onerror = this._tileOnError;
            this._adjustTilePoint(tilePoint);
            tile.src = this.getTileUrl(tilePoint);
        },
        _tileLoaded: function() {
            this._tilesToLoad--;
            if (!this._tilesToLoad) {
                this.fire("load");
                if (this._animated) {
                    clearTimeout(this._clearBgBufferTimer);
                    this._clearBgBufferTimer = setTimeout(L.bind(this._clearBgBuffer, this), 500);
                }
            }
        },
        _tileOnLoad: function() {
            var layer = this._layer;
            if (this.src !== L.Util.emptyImageUrl) {
                L.DomUtil.addClass(this, "leaflet-tile-loaded");
                layer.fire("tileload", {
                    tile: this,
                    url: this.src
                });
            }
            layer._tileLoaded();
        },
        _tileOnError: function() {
            var layer = this._layer;
            layer.fire("tileerror", {
                tile: this,
                url: this.src
            });
            var newUrl = layer.options.errorTileUrl;
            newUrl && (this.src = newUrl);
            layer._tileLoaded();
        }
    });
    L.tileLayer = function(url, options) {
        return new L.TileLayer(url, options);
    };
    L.TileLayer.WMS = L.TileLayer.extend({
        defaultWmsParams: {
            service: "WMS",
            request: "GetMap",
            version: "1.1.1",
            layers: "",
            styles: "",
            format: "image/jpeg",
            transparent: false
        },
        initialize: function(url, options) {
            this._url = url;
            var wmsParams = L.extend({}, this.defaultWmsParams), tileSize = options.tileSize || this.options.tileSize;
            wmsParams.width = wmsParams.height = options.detectRetina && L.Browser.retina ? 2 * tileSize : tileSize;
            for (var i in options) this.options.hasOwnProperty(i) || "crs" === i || (wmsParams[i] = options[i]);
            this.wmsParams = wmsParams;
            L.setOptions(this, options);
        },
        onAdd: function(map) {
            this._crs = this.options.crs || map.options.crs;
            var projectionKey = parseFloat(this.wmsParams.version) >= 1.3 ? "crs" : "srs";
            this.wmsParams[projectionKey] = this._crs.code;
            L.TileLayer.prototype.onAdd.call(this, map);
        },
        getTileUrl: function(tilePoint, zoom) {
            var map = this._map, tileSize = this.options.tileSize, nwPoint = tilePoint.multiplyBy(tileSize), sePoint = nwPoint.add([ tileSize, tileSize ]), nw = this._crs.project(map.unproject(nwPoint, zoom)), se = this._crs.project(map.unproject(sePoint, zoom)), bbox = [ nw.x, se.y, se.x, nw.y ].join(","), url = L.Util.template(this._url, {
                s: this._getSubdomain(tilePoint)
            });
            return url + L.Util.getParamString(this.wmsParams, url, true) + "&BBOX=" + bbox;
        },
        setParams: function(params, noRedraw) {
            L.extend(this.wmsParams, params);
            noRedraw || this.redraw();
            return this;
        }
    });
    L.tileLayer.wms = function(url, options) {
        return new L.TileLayer.WMS(url, options);
    };
    L.TileLayer.Canvas = L.TileLayer.extend({
        options: {
            async: false
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        redraw: function() {
            if (this._map) {
                this._reset({
                    hard: true
                });
                this._update();
            }
            for (var i in this._tiles) this._redrawTile(this._tiles[i]);
            return this;
        },
        _redrawTile: function(tile) {
            this.drawTile(tile, tile._tilePoint, this._map._zoom);
        },
        _createTileProto: function() {
            var proto = this._canvasProto = L.DomUtil.create("canvas", "leaflet-tile");
            proto.width = proto.height = this.options.tileSize;
        },
        _createTile: function() {
            var tile = this._canvasProto.cloneNode(false);
            tile.onselectstart = tile.onmousemove = L.Util.falseFn;
            return tile;
        },
        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            this._redrawTile(tile);
            this.options.async || this.tileDrawn(tile);
        },
        drawTile: function() {},
        tileDrawn: function(tile) {
            this._tileOnLoad.call(tile);
        }
    });
    L.tileLayer.canvas = function(options) {
        return new L.TileLayer.Canvas(options);
    };
    L.ImageOverlay = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            opacity: 1
        },
        initialize: function(url, bounds, options) {
            this._url = url;
            this._bounds = L.latLngBounds(bounds);
            L.setOptions(this, options);
        },
        onAdd: function(map) {
            this._map = map;
            this._image || this._initImage();
            map._panes.overlayPane.appendChild(this._image);
            map.on("viewreset", this._reset, this);
            map.options.zoomAnimation && L.Browser.any3d && map.on("zoomanim", this._animateZoom, this);
            this._reset();
        },
        onRemove: function(map) {
            map.getPanes().overlayPane.removeChild(this._image);
            map.off("viewreset", this._reset, this);
            map.options.zoomAnimation && map.off("zoomanim", this._animateZoom, this);
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        setOpacity: function(opacity) {
            this.options.opacity = opacity;
            this._updateOpacity();
            return this;
        },
        bringToFront: function() {
            this._image && this._map._panes.overlayPane.appendChild(this._image);
            return this;
        },
        bringToBack: function() {
            var pane = this._map._panes.overlayPane;
            this._image && pane.insertBefore(this._image, pane.firstChild);
            return this;
        },
        _initImage: function() {
            this._image = L.DomUtil.create("img", "leaflet-image-layer");
            this._map.options.zoomAnimation && L.Browser.any3d ? L.DomUtil.addClass(this._image, "leaflet-zoom-animated") : L.DomUtil.addClass(this._image, "leaflet-zoom-hide");
            this._updateOpacity();
            L.extend(this._image, {
                galleryimg: "no",
                onselectstart: L.Util.falseFn,
                onmousemove: L.Util.falseFn,
                onload: L.bind(this._onImageLoad, this),
                src: this._url
            });
        },
        _animateZoom: function(e) {
            var map = this._map, image = this._image, scale = map.getZoomScale(e.zoom), nw = this._bounds.getNorthWest(), se = this._bounds.getSouthEast(), topLeft = map._latLngToNewLayerPoint(nw, e.zoom, e.center), size = map._latLngToNewLayerPoint(se, e.zoom, e.center)._subtract(topLeft), origin = topLeft._add(size._multiplyBy(.5 * (1 - 1 / scale)));
            image.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(origin) + " scale(" + scale + ") ";
        },
        _reset: function() {
            var image = this._image, topLeft = this._map.latLngToLayerPoint(this._bounds.getNorthWest()), size = this._map.latLngToLayerPoint(this._bounds.getSouthEast())._subtract(topLeft);
            L.DomUtil.setPosition(image, topLeft);
            image.style.width = size.x + "px";
            image.style.height = size.y + "px";
        },
        _onImageLoad: function() {
            this.fire("load");
        },
        _updateOpacity: function() {
            L.DomUtil.setOpacity(this._image, this.options.opacity);
        }
    });
    L.imageOverlay = function(url, bounds, options) {
        return new L.ImageOverlay(url, bounds, options);
    };
    L.Icon = L.Class.extend({
        options: {
            className: ""
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        createIcon: function(oldIcon) {
            return this._createIcon("icon", oldIcon);
        },
        createShadow: function(oldIcon) {
            return this._createIcon("shadow", oldIcon);
        },
        _createIcon: function(name, oldIcon) {
            var src = this._getIconUrl(name);
            if (!src) {
                if ("icon" === name) throw new Error("iconUrl not set in Icon options (see the docs).");
                return null;
            }
            var img;
            img = oldIcon && "IMG" === oldIcon.tagName ? this._createImg(src, oldIcon) : this._createImg(src);
            this._setIconStyles(img, name);
            return img;
        },
        _setIconStyles: function(img, name) {
            var anchor, options = this.options, size = L.point(options[name + "Size"]);
            anchor = "shadow" === name ? L.point(options.shadowAnchor || options.iconAnchor) : L.point(options.iconAnchor);
            !anchor && size && (anchor = size.divideBy(2, true));
            img.className = "leaflet-marker-" + name + " " + options.className;
            if (anchor) {
                img.style.marginLeft = -anchor.x + "px";
                img.style.marginTop = -anchor.y + "px";
            }
            if (size) {
                img.style.width = size.x + "px";
                img.style.height = size.y + "px";
            }
        },
        _createImg: function(src, el) {
            if (L.Browser.ie6) {
                el || (el = document.createElement("div"));
                el.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + src + '")';
            } else {
                el || (el = document.createElement("img"));
                el.src = src;
            }
            return el;
        },
        _getIconUrl: function(name) {
            if (L.Browser.retina && this.options[name + "RetinaUrl"]) return this.options[name + "RetinaUrl"];
            return this.options[name + "Url"];
        }
    });
    L.icon = function(options) {
        return new L.Icon(options);
    };
    L.Icon.Default = L.Icon.extend({
        options: {
            iconSize: [ 25, 41 ],
            iconAnchor: [ 12, 41 ],
            popupAnchor: [ 1, -34 ],
            shadowSize: [ 41, 41 ]
        },
        _getIconUrl: function(name) {
            var key = name + "Url";
            if (this.options[key]) return this.options[key];
            L.Browser.retina && "icon" === name && (name += "-2x");
            var path = L.Icon.Default.imagePath;
            if (!path) throw new Error("Couldn't autodetect L.Icon.Default.imagePath, set it manually.");
            return path + "/marker-" + name + ".png";
        }
    });
    L.Icon.Default.imagePath = function() {
        var scripts = document.getElementsByTagName("script"), leafletRe = /[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;
        var i, len, src, matches, path;
        for (i = 0, len = scripts.length; len > i; i++) {
            src = scripts[i].src;
            matches = src.match(leafletRe);
            if (matches) {
                path = src.split(leafletRe)[0];
                return (path ? path + "/" : "") + "images";
            }
        }
    }();
    L.Marker = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            icon: new L.Icon.Default(),
            title: "",
            clickable: true,
            draggable: false,
            keyboard: true,
            zIndexOffset: 0,
            opacity: 1,
            riseOnHover: false,
            riseOffset: 250
        },
        initialize: function(latlng, options) {
            L.setOptions(this, options);
            this._latlng = L.latLng(latlng);
        },
        onAdd: function(map) {
            this._map = map;
            map.on("viewreset", this.update, this);
            this._initIcon();
            this.update();
            map.options.zoomAnimation && map.options.markerZoomAnimation && map.on("zoomanim", this._animateZoom, this);
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        onRemove: function(map) {
            this.dragging && this.dragging.disable();
            this._removeIcon();
            this._removeShadow();
            this.fire("remove");
            map.off({
                viewreset: this.update,
                zoomanim: this._animateZoom
            }, this);
            this._map = null;
        },
        getLatLng: function() {
            return this._latlng;
        },
        setLatLng: function(latlng) {
            this._latlng = L.latLng(latlng);
            this.update();
            return this.fire("move", {
                latlng: this._latlng
            });
        },
        setZIndexOffset: function(offset) {
            this.options.zIndexOffset = offset;
            this.update();
            return this;
        },
        setIcon: function(icon) {
            this.options.icon = icon;
            if (this._map) {
                this._initIcon();
                this.update();
            }
            return this;
        },
        update: function() {
            if (this._icon) {
                var pos = this._map.latLngToLayerPoint(this._latlng).round();
                this._setPos(pos);
            }
            return this;
        },
        _initIcon: function() {
            var options = this.options, map = this._map, animation = map.options.zoomAnimation && map.options.markerZoomAnimation, classToAdd = animation ? "leaflet-zoom-animated" : "leaflet-zoom-hide";
            var icon = options.icon.createIcon(this._icon), addIcon = false;
            if (icon !== this._icon) {
                this._icon && this._removeIcon();
                addIcon = true;
                options.title && (icon.title = options.title);
            }
            L.DomUtil.addClass(icon, classToAdd);
            options.keyboard && (icon.tabIndex = "0");
            this._icon = icon;
            this._initInteraction();
            options.riseOnHover && L.DomEvent.on(icon, "mouseover", this._bringToFront, this).on(icon, "mouseout", this._resetZIndex, this);
            var newShadow = options.icon.createShadow(this._shadow), addShadow = false;
            if (newShadow !== this._shadow) {
                this._removeShadow();
                addShadow = true;
            }
            newShadow && L.DomUtil.addClass(newShadow, classToAdd);
            this._shadow = newShadow;
            1 > options.opacity && this._updateOpacity();
            var panes = this._map._panes;
            addIcon && panes.markerPane.appendChild(this._icon);
            newShadow && addShadow && panes.shadowPane.appendChild(this._shadow);
        },
        _removeIcon: function() {
            this.options.riseOnHover && L.DomEvent.off(this._icon, "mouseover", this._bringToFront).off(this._icon, "mouseout", this._resetZIndex);
            this._map._panes.markerPane.removeChild(this._icon);
            this._icon = null;
        },
        _removeShadow: function() {
            this._shadow && this._map._panes.shadowPane.removeChild(this._shadow);
            this._shadow = null;
        },
        _setPos: function(pos) {
            L.DomUtil.setPosition(this._icon, pos);
            this._shadow && L.DomUtil.setPosition(this._shadow, pos);
            this._zIndex = pos.y + this.options.zIndexOffset;
            this._resetZIndex();
        },
        _updateZIndex: function(offset) {
            this._icon.style.zIndex = this._zIndex + offset;
        },
        _animateZoom: function(opt) {
            var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center);
            this._setPos(pos);
        },
        _initInteraction: function() {
            if (!this.options.clickable) return;
            var icon = this._icon, events = [ "dblclick", "mousedown", "mouseover", "mouseout", "contextmenu" ];
            L.DomUtil.addClass(icon, "leaflet-clickable");
            L.DomEvent.on(icon, "click", this._onMouseClick, this);
            L.DomEvent.on(icon, "keypress", this._onKeyPress, this);
            for (var i = 0; events.length > i; i++) L.DomEvent.on(icon, events[i], this._fireMouseEvent, this);
            if (L.Handler.MarkerDrag) {
                this.dragging = new L.Handler.MarkerDrag(this);
                this.options.draggable && this.dragging.enable();
            }
        },
        _onMouseClick: function(e) {
            var wasDragged = this.dragging && this.dragging.moved();
            (this.hasEventListeners(e.type) || wasDragged) && L.DomEvent.stopPropagation(e);
            if (wasDragged) return;
            if ((!this.dragging || !this.dragging._enabled) && this._map.dragging && this._map.dragging.moved()) return;
            this.fire(e.type, {
                originalEvent: e,
                latlng: this._latlng
            });
        },
        _onKeyPress: function(e) {
            13 === e.keyCode && this.fire("click", {
                originalEvent: e,
                latlng: this._latlng
            });
        },
        _fireMouseEvent: function(e) {
            this.fire(e.type, {
                originalEvent: e,
                latlng: this._latlng
            });
            "contextmenu" === e.type && this.hasEventListeners(e.type) && L.DomEvent.preventDefault(e);
            "mousedown" !== e.type ? L.DomEvent.stopPropagation(e) : L.DomEvent.preventDefault(e);
        },
        setOpacity: function(opacity) {
            this.options.opacity = opacity;
            this._map && this._updateOpacity();
            return this;
        },
        _updateOpacity: function() {
            L.DomUtil.setOpacity(this._icon, this.options.opacity);
            this._shadow && L.DomUtil.setOpacity(this._shadow, this.options.opacity);
        },
        _bringToFront: function() {
            this._updateZIndex(this.options.riseOffset);
        },
        _resetZIndex: function() {
            this._updateZIndex(0);
        }
    });
    L.marker = function(latlng, options) {
        return new L.Marker(latlng, options);
    };
    L.DivIcon = L.Icon.extend({
        options: {
            iconSize: [ 12, 12 ],
            className: "leaflet-div-icon",
            html: false
        },
        createIcon: function(oldIcon) {
            var div = oldIcon && "DIV" === oldIcon.tagName ? oldIcon : document.createElement("div"), options = this.options;
            div.innerHTML = false !== options.html ? options.html : "";
            options.bgPos && (div.style.backgroundPosition = -options.bgPos.x + "px " + -options.bgPos.y + "px");
            this._setIconStyles(div, "icon");
            return div;
        },
        createShadow: function() {
            return null;
        }
    });
    L.divIcon = function(options) {
        return new L.DivIcon(options);
    };
    L.Map.mergeOptions({
        closePopupOnClick: true
    });
    L.Popup = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            minWidth: 50,
            maxWidth: 300,
            maxHeight: null,
            autoPan: true,
            closeButton: true,
            offset: [ 0, 7 ],
            autoPanPadding: [ 5, 5 ],
            keepInView: false,
            className: "",
            zoomAnimation: true
        },
        initialize: function(options, source) {
            L.setOptions(this, options);
            this._source = source;
            this._animated = L.Browser.any3d && this.options.zoomAnimation;
            this._isOpen = false;
        },
        onAdd: function(map) {
            this._map = map;
            this._container || this._initLayout();
            this._updateContent();
            var animFade = map.options.fadeAnimation;
            animFade && L.DomUtil.setOpacity(this._container, 0);
            map._panes.popupPane.appendChild(this._container);
            map.on(this._getEvents(), this);
            this._update();
            animFade && L.DomUtil.setOpacity(this._container, 1);
            this.fire("open");
            map.fire("popupopen", {
                popup: this
            });
            this._source && this._source.fire("popupopen", {
                popup: this
            });
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        openOn: function(map) {
            map.openPopup(this);
            return this;
        },
        onRemove: function(map) {
            map._panes.popupPane.removeChild(this._container);
            L.Util.falseFn(this._container.offsetWidth);
            map.off(this._getEvents(), this);
            map.options.fadeAnimation && L.DomUtil.setOpacity(this._container, 0);
            this._map = null;
            this.fire("close");
            map.fire("popupclose", {
                popup: this
            });
            this._source && this._source.fire("popupclose", {
                popup: this
            });
        },
        setLatLng: function(latlng) {
            this._latlng = L.latLng(latlng);
            this._update();
            return this;
        },
        setContent: function(content) {
            this._content = content;
            this._update();
            return this;
        },
        _getEvents: function() {
            var events = {
                viewreset: this._updatePosition
            };
            this._animated && (events.zoomanim = this._zoomAnimation);
            ("closeOnClick" in this.options ? this.options.closeOnClick : this._map.options.closePopupOnClick) && (events.preclick = this._close);
            this.options.keepInView && (events.moveend = this._adjustPan);
            return events;
        },
        _close: function() {
            this._map && this._map.closePopup(this);
        },
        _initLayout: function() {
            var closeButton, prefix = "leaflet-popup", containerClass = prefix + " " + this.options.className + " leaflet-zoom-" + (this._animated ? "animated" : "hide"), container = this._container = L.DomUtil.create("div", containerClass);
            if (this.options.closeButton) {
                closeButton = this._closeButton = L.DomUtil.create("a", prefix + "-close-button", container);
                closeButton.href = "#close";
                closeButton.innerHTML = "&#215;";
                L.DomEvent.disableClickPropagation(closeButton);
                L.DomEvent.on(closeButton, "click", this._onCloseButtonClick, this);
            }
            var wrapper = this._wrapper = L.DomUtil.create("div", prefix + "-content-wrapper", container);
            L.DomEvent.disableClickPropagation(wrapper);
            this._contentNode = L.DomUtil.create("div", prefix + "-content", wrapper);
            L.DomEvent.on(this._contentNode, "mousewheel", L.DomEvent.stopPropagation);
            L.DomEvent.on(this._contentNode, "MozMousePixelScroll", L.DomEvent.stopPropagation);
            L.DomEvent.on(wrapper, "contextmenu", L.DomEvent.stopPropagation);
            this._tipContainer = L.DomUtil.create("div", prefix + "-tip-container", container);
            this._tip = L.DomUtil.create("div", prefix + "-tip", this._tipContainer);
        },
        _update: function() {
            if (!this._map) return;
            this._container.style.visibility = "hidden";
            this._updateContent();
            this._updateLayout();
            this._updatePosition();
            this._container.style.visibility = "";
            this._adjustPan();
        },
        _updateContent: function() {
            if (!this._content) return;
            if ("string" == typeof this._content) this._contentNode.innerHTML = this._content; else {
                while (this._contentNode.hasChildNodes()) this._contentNode.removeChild(this._contentNode.firstChild);
                this._contentNode.appendChild(this._content);
            }
            this.fire("contentupdate");
        },
        _updateLayout: function() {
            var container = this._contentNode, style = container.style;
            style.width = "";
            style.whiteSpace = "nowrap";
            var width = container.offsetWidth;
            width = Math.min(width, this.options.maxWidth);
            width = Math.max(width, this.options.minWidth);
            style.width = width + 1 + "px";
            style.whiteSpace = "";
            style.height = "";
            var height = container.offsetHeight, maxHeight = this.options.maxHeight, scrolledClass = "leaflet-popup-scrolled";
            if (maxHeight && height > maxHeight) {
                style.height = maxHeight + "px";
                L.DomUtil.addClass(container, scrolledClass);
            } else L.DomUtil.removeClass(container, scrolledClass);
            this._containerWidth = this._container.offsetWidth;
        },
        _updatePosition: function() {
            if (!this._map) return;
            var pos = this._map.latLngToLayerPoint(this._latlng), animated = this._animated, offset = L.point(this.options.offset);
            animated && L.DomUtil.setPosition(this._container, pos);
            this._containerBottom = -offset.y - (animated ? 0 : pos.y);
            this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x + (animated ? 0 : pos.x);
            this._container.style.bottom = this._containerBottom + "px";
            this._container.style.left = this._containerLeft + "px";
        },
        _zoomAnimation: function(opt) {
            var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center);
            L.DomUtil.setPosition(this._container, pos);
        },
        _adjustPan: function() {
            if (!this.options.autoPan) return;
            var map = this._map, containerHeight = this._container.offsetHeight, containerWidth = this._containerWidth, layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom);
            this._animated && layerPos._add(L.DomUtil.getPosition(this._container));
            var containerPos = map.layerPointToContainerPoint(layerPos), padding = L.point(this.options.autoPanPadding), size = map.getSize(), dx = 0, dy = 0;
            containerPos.x + containerWidth > size.x && (dx = containerPos.x + containerWidth - size.x + padding.x);
            0 > containerPos.x - dx && (dx = containerPos.x - padding.x);
            containerPos.y + containerHeight > size.y && (dy = containerPos.y + containerHeight - size.y + padding.y);
            0 > containerPos.y - dy && (dy = containerPos.y - padding.y);
            (dx || dy) && map.fire("autopanstart").panBy([ dx, dy ]);
        },
        _onCloseButtonClick: function(e) {
            this._close();
            L.DomEvent.stop(e);
        }
    });
    L.popup = function(options, source) {
        return new L.Popup(options, source);
    };
    L.Map.include({
        openPopup: function(popup, latlng, options) {
            this.closePopup();
            if (!(popup instanceof L.Popup)) {
                var content = popup;
                popup = new L.Popup(options).setLatLng(latlng).setContent(content);
            }
            popup._isOpen = true;
            this._popup = popup;
            return this.addLayer(popup);
        },
        closePopup: function(popup) {
            if (!popup || popup === this._popup) {
                popup = this._popup;
                this._popup = null;
            }
            if (popup) {
                this.removeLayer(popup);
                popup._isOpen = false;
            }
            return this;
        }
    });
    L.Marker.include({
        openPopup: function() {
            if (this._popup && this._map && !this._map.hasLayer(this._popup)) {
                this._popup.setLatLng(this._latlng);
                this._map.openPopup(this._popup);
            }
            return this;
        },
        closePopup: function() {
            this._popup && this._popup._close();
            return this;
        },
        togglePopup: function() {
            this._popup && (this._popup._isOpen ? this.closePopup() : this.openPopup());
            return this;
        },
        bindPopup: function(content, options) {
            var anchor = L.point(this.options.icon.options.popupAnchor || [ 0, 0 ]);
            anchor = anchor.add(L.Popup.prototype.options.offset);
            options && options.offset && (anchor = anchor.add(options.offset));
            options = L.extend({
                offset: anchor
            }, options);
            this._popup || this.on("click", this.togglePopup, this).on("remove", this.closePopup, this).on("move", this._movePopup, this);
            if (content instanceof L.Popup) {
                L.setOptions(content, options);
                this._popup = content;
            } else this._popup = new L.Popup(options, this).setContent(content);
            return this;
        },
        setPopupContent: function(content) {
            this._popup && this._popup.setContent(content);
            return this;
        },
        unbindPopup: function() {
            if (this._popup) {
                this._popup = null;
                this.off("click", this.togglePopup).off("remove", this.closePopup).off("move", this._movePopup);
            }
            return this;
        },
        _movePopup: function(e) {
            this._popup.setLatLng(e.latlng);
        }
    });
    L.LayerGroup = L.Class.extend({
        initialize: function(layers) {
            this._layers = {};
            var i, len;
            if (layers) for (i = 0, len = layers.length; len > i; i++) this.addLayer(layers[i]);
        },
        addLayer: function(layer) {
            var id = this.getLayerId(layer);
            this._layers[id] = layer;
            this._map && this._map.addLayer(layer);
            return this;
        },
        removeLayer: function(layer) {
            var id = layer in this._layers ? layer : this.getLayerId(layer);
            this._map && this._layers[id] && this._map.removeLayer(this._layers[id]);
            delete this._layers[id];
            return this;
        },
        hasLayer: function(layer) {
            if (!layer) return false;
            return layer in this._layers || this.getLayerId(layer) in this._layers;
        },
        clearLayers: function() {
            this.eachLayer(this.removeLayer, this);
            return this;
        },
        invoke: function(methodName) {
            var i, layer, args = Array.prototype.slice.call(arguments, 1);
            for (i in this._layers) {
                layer = this._layers[i];
                layer[methodName] && layer[methodName].apply(layer, args);
            }
            return this;
        },
        onAdd: function(map) {
            this._map = map;
            this.eachLayer(map.addLayer, map);
        },
        onRemove: function(map) {
            this.eachLayer(map.removeLayer, map);
            this._map = null;
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        eachLayer: function(method, context) {
            for (var i in this._layers) method.call(context, this._layers[i]);
            return this;
        },
        getLayer: function(id) {
            return this._layers[id];
        },
        getLayers: function() {
            var layers = [];
            for (var i in this._layers) layers.push(this._layers[i]);
            return layers;
        },
        setZIndex: function(zIndex) {
            return this.invoke("setZIndex", zIndex);
        },
        getLayerId: function(layer) {
            return L.stamp(layer);
        }
    });
    L.layerGroup = function(layers) {
        return new L.LayerGroup(layers);
    };
    L.FeatureGroup = L.LayerGroup.extend({
        includes: L.Mixin.Events,
        statics: {
            EVENTS: "click dblclick mouseover mouseout mousemove contextmenu popupopen popupclose"
        },
        addLayer: function(layer) {
            if (this.hasLayer(layer)) return this;
            layer.on(L.FeatureGroup.EVENTS, this._propagateEvent, this);
            L.LayerGroup.prototype.addLayer.call(this, layer);
            this._popupContent && layer.bindPopup && layer.bindPopup(this._popupContent, this._popupOptions);
            return this.fire("layeradd", {
                layer: layer
            });
        },
        removeLayer: function(layer) {
            if (!this.hasLayer(layer)) return this;
            layer in this._layers && (layer = this._layers[layer]);
            layer.off(L.FeatureGroup.EVENTS, this._propagateEvent, this);
            L.LayerGroup.prototype.removeLayer.call(this, layer);
            this._popupContent && this.invoke("unbindPopup");
            return this.fire("layerremove", {
                layer: layer
            });
        },
        bindPopup: function(content, options) {
            this._popupContent = content;
            this._popupOptions = options;
            return this.invoke("bindPopup", content, options);
        },
        setStyle: function(style) {
            return this.invoke("setStyle", style);
        },
        bringToFront: function() {
            return this.invoke("bringToFront");
        },
        bringToBack: function() {
            return this.invoke("bringToBack");
        },
        getBounds: function() {
            var bounds = new L.LatLngBounds();
            this.eachLayer(function(layer) {
                bounds.extend(layer instanceof L.Marker ? layer.getLatLng() : layer.getBounds());
            });
            return bounds;
        },
        _propagateEvent: function(e) {
            e.layer || (e.layer = e.target);
            e.target = this;
            this.fire(e.type, e);
        }
    });
    L.featureGroup = function(layers) {
        return new L.FeatureGroup(layers);
    };
    L.Path = L.Class.extend({
        includes: [ L.Mixin.Events ],
        statics: {
            CLIP_PADDING: function() {
                var max = L.Browser.mobile ? 1280 : 2e3, target = (max / Math.max(window.outerWidth, window.outerHeight) - 1) / 2;
                return Math.max(0, Math.min(.5, target));
            }()
        },
        options: {
            stroke: true,
            color: "#0033ff",
            dashArray: null,
            weight: 5,
            opacity: .5,
            fill: false,
            fillColor: null,
            fillOpacity: .2,
            clickable: true
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        onAdd: function(map) {
            this._map = map;
            if (!this._container) {
                this._initElements();
                this._initEvents();
            }
            this.projectLatlngs();
            this._updatePath();
            this._container && this._map._pathRoot.appendChild(this._container);
            this.fire("add");
            map.on({
                viewreset: this.projectLatlngs,
                moveend: this._updatePath
            }, this);
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        onRemove: function(map) {
            map._pathRoot.removeChild(this._container);
            this.fire("remove");
            this._map = null;
            if (L.Browser.vml) {
                this._container = null;
                this._stroke = null;
                this._fill = null;
            }
            map.off({
                viewreset: this.projectLatlngs,
                moveend: this._updatePath
            }, this);
        },
        projectLatlngs: function() {},
        setStyle: function(style) {
            L.setOptions(this, style);
            this._container && this._updateStyle();
            return this;
        },
        redraw: function() {
            if (this._map) {
                this.projectLatlngs();
                this._updatePath();
            }
            return this;
        }
    });
    L.Map.include({
        _updatePathViewport: function() {
            var p = L.Path.CLIP_PADDING, size = this.getSize(), panePos = L.DomUtil.getPosition(this._mapPane), min = panePos.multiplyBy(-1)._subtract(size.multiplyBy(p)._round()), max = min.add(size.multiplyBy(1 + 2 * p)._round());
            this._pathViewport = new L.Bounds(min, max);
        }
    });
    L.Path.SVG_NS = "http://www.w3.org/2000/svg";
    L.Browser.svg = !!(document.createElementNS && document.createElementNS(L.Path.SVG_NS, "svg").createSVGRect);
    L.Path = L.Path.extend({
        statics: {
            SVG: L.Browser.svg
        },
        bringToFront: function() {
            var root = this._map._pathRoot, path = this._container;
            path && root.lastChild !== path && root.appendChild(path);
            return this;
        },
        bringToBack: function() {
            var root = this._map._pathRoot, path = this._container, first = root.firstChild;
            path && first !== path && root.insertBefore(path, first);
            return this;
        },
        getPathString: function() {},
        _createElement: function(name) {
            return document.createElementNS(L.Path.SVG_NS, name);
        },
        _initElements: function() {
            this._map._initPathRoot();
            this._initPath();
            this._initStyle();
        },
        _initPath: function() {
            this._container = this._createElement("g");
            this._path = this._createElement("path");
            this._container.appendChild(this._path);
        },
        _initStyle: function() {
            if (this.options.stroke) {
                this._path.setAttribute("stroke-linejoin", "round");
                this._path.setAttribute("stroke-linecap", "round");
            }
            this.options.fill && this._path.setAttribute("fill-rule", "evenodd");
            this.options.pointerEvents && this._path.setAttribute("pointer-events", this.options.pointerEvents);
            this.options.clickable || this.options.pointerEvents || this._path.setAttribute("pointer-events", "none");
            this._updateStyle();
        },
        _updateStyle: function() {
            if (this.options.stroke) {
                this._path.setAttribute("stroke", this.options.color);
                this._path.setAttribute("stroke-opacity", this.options.opacity);
                this._path.setAttribute("stroke-width", this.options.weight);
                this.options.dashArray ? this._path.setAttribute("stroke-dasharray", this.options.dashArray) : this._path.removeAttribute("stroke-dasharray");
            } else this._path.setAttribute("stroke", "none");
            if (this.options.fill) {
                this._path.setAttribute("fill", this.options.fillColor || this.options.color);
                this._path.setAttribute("fill-opacity", this.options.fillOpacity);
            } else this._path.setAttribute("fill", "none");
        },
        _updatePath: function() {
            var str = this.getPathString();
            str || (str = "M0 0");
            this._path.setAttribute("d", str);
        },
        _initEvents: function() {
            if (this.options.clickable) {
                (L.Browser.svg || !L.Browser.vml) && this._path.setAttribute("class", "leaflet-clickable");
                L.DomEvent.on(this._container, "click", this._onMouseClick, this);
                var events = [ "dblclick", "mousedown", "mouseover", "mouseout", "mousemove", "contextmenu" ];
                for (var i = 0; events.length > i; i++) L.DomEvent.on(this._container, events[i], this._fireMouseEvent, this);
            }
        },
        _onMouseClick: function(e) {
            if (this._map.dragging && this._map.dragging.moved()) return;
            this._fireMouseEvent(e);
        },
        _fireMouseEvent: function(e) {
            if (!this.hasEventListeners(e.type)) return;
            var map = this._map, containerPoint = map.mouseEventToContainerPoint(e), layerPoint = map.containerPointToLayerPoint(containerPoint), latlng = map.layerPointToLatLng(layerPoint);
            this.fire(e.type, {
                latlng: latlng,
                layerPoint: layerPoint,
                containerPoint: containerPoint,
                originalEvent: e
            });
            "contextmenu" === e.type && L.DomEvent.preventDefault(e);
            "mousemove" !== e.type && L.DomEvent.stopPropagation(e);
        }
    });
    L.Map.include({
        _initPathRoot: function() {
            if (!this._pathRoot) {
                this._pathRoot = L.Path.prototype._createElement("svg");
                this._panes.overlayPane.appendChild(this._pathRoot);
                if (this.options.zoomAnimation && L.Browser.any3d) {
                    this._pathRoot.setAttribute("class", " leaflet-zoom-animated");
                    this.on({
                        zoomanim: this._animatePathZoom,
                        zoomend: this._endPathZoom
                    });
                } else this._pathRoot.setAttribute("class", " leaflet-zoom-hide");
                this.on("moveend", this._updateSvgViewport);
                this._updateSvgViewport();
            }
        },
        _animatePathZoom: function(e) {
            var scale = this.getZoomScale(e.zoom), offset = this._getCenterOffset(e.center)._multiplyBy(-scale)._add(this._pathViewport.min);
            this._pathRoot.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + " scale(" + scale + ") ";
            this._pathZooming = true;
        },
        _endPathZoom: function() {
            this._pathZooming = false;
        },
        _updateSvgViewport: function() {
            if (this._pathZooming) return;
            this._updatePathViewport();
            var vp = this._pathViewport, min = vp.min, max = vp.max, width = max.x - min.x, height = max.y - min.y, root = this._pathRoot, pane = this._panes.overlayPane;
            L.Browser.mobileWebkit && pane.removeChild(root);
            L.DomUtil.setPosition(root, min);
            root.setAttribute("width", width);
            root.setAttribute("height", height);
            root.setAttribute("viewBox", [ min.x, min.y, width, height ].join(" "));
            L.Browser.mobileWebkit && pane.appendChild(root);
        }
    });
    L.Path.include({
        bindPopup: function(content, options) {
            if (content instanceof L.Popup) this._popup = content; else {
                (!this._popup || options) && (this._popup = new L.Popup(options, this));
                this._popup.setContent(content);
            }
            if (!this._popupHandlersAdded) {
                this.on("click", this._openPopup, this).on("remove", this.closePopup, this);
                this._popupHandlersAdded = true;
            }
            return this;
        },
        unbindPopup: function() {
            if (this._popup) {
                this._popup = null;
                this.off("click", this._openPopup).off("remove", this.closePopup);
                this._popupHandlersAdded = false;
            }
            return this;
        },
        openPopup: function(latlng) {
            if (this._popup) {
                latlng = latlng || this._latlng || this._latlngs[Math.floor(this._latlngs.length / 2)];
                this._openPopup({
                    latlng: latlng
                });
            }
            return this;
        },
        closePopup: function() {
            this._popup && this._popup._close();
            return this;
        },
        _openPopup: function(e) {
            this._popup.setLatLng(e.latlng);
            this._map.openPopup(this._popup);
        }
    });
    L.Browser.vml = !L.Browser.svg && function() {
        try {
            var div = document.createElement("div");
            div.innerHTML = '<v:shape adj="1"/>';
            var shape = div.firstChild;
            shape.style.behavior = "url(#default#VML)";
            return shape && "object" == typeof shape.adj;
        } catch (e) {
            return false;
        }
    }();
    L.Path = L.Browser.svg || !L.Browser.vml ? L.Path : L.Path.extend({
        statics: {
            VML: true,
            CLIP_PADDING: .02
        },
        _createElement: function() {
            try {
                document.namespaces.add("lvml", "urn:schemas-microsoft-com:vml");
                return function(name) {
                    return document.createElement("<lvml:" + name + ' class="lvml">');
                };
            } catch (e) {
                return function(name) {
                    return document.createElement("<" + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
                };
            }
        }(),
        _initPath: function() {
            var container = this._container = this._createElement("shape");
            L.DomUtil.addClass(container, "leaflet-vml-shape");
            this.options.clickable && L.DomUtil.addClass(container, "leaflet-clickable");
            container.coordsize = "1 1";
            this._path = this._createElement("path");
            container.appendChild(this._path);
            this._map._pathRoot.appendChild(container);
        },
        _initStyle: function() {
            this._updateStyle();
        },
        _updateStyle: function() {
            var stroke = this._stroke, fill = this._fill, options = this.options, container = this._container;
            container.stroked = options.stroke;
            container.filled = options.fill;
            if (options.stroke) {
                if (!stroke) {
                    stroke = this._stroke = this._createElement("stroke");
                    stroke.endcap = "round";
                    container.appendChild(stroke);
                }
                stroke.weight = options.weight + "px";
                stroke.color = options.color;
                stroke.opacity = options.opacity;
                stroke.dashStyle = options.dashArray ? options.dashArray instanceof Array ? options.dashArray.join(" ") : options.dashArray.replace(/( *, *)/g, " ") : "";
            } else if (stroke) {
                container.removeChild(stroke);
                this._stroke = null;
            }
            if (options.fill) {
                if (!fill) {
                    fill = this._fill = this._createElement("fill");
                    container.appendChild(fill);
                }
                fill.color = options.fillColor || options.color;
                fill.opacity = options.fillOpacity;
            } else if (fill) {
                container.removeChild(fill);
                this._fill = null;
            }
        },
        _updatePath: function() {
            var style = this._container.style;
            style.display = "none";
            this._path.v = this.getPathString() + " ";
            style.display = "";
        }
    });
    L.Map.include(L.Browser.svg || !L.Browser.vml ? {} : {
        _initPathRoot: function() {
            if (this._pathRoot) return;
            var root = this._pathRoot = document.createElement("div");
            root.className = "leaflet-vml-container";
            this._panes.overlayPane.appendChild(root);
            this.on("moveend", this._updatePathViewport);
            this._updatePathViewport();
        }
    });
    L.Browser.canvas = function() {
        return !!document.createElement("canvas").getContext;
    }();
    L.Path = L.Path.SVG && !window.L_PREFER_CANVAS || !L.Browser.canvas ? L.Path : L.Path.extend({
        statics: {
            CANVAS: true,
            SVG: false
        },
        redraw: function() {
            if (this._map) {
                this.projectLatlngs();
                this._requestUpdate();
            }
            return this;
        },
        setStyle: function(style) {
            L.setOptions(this, style);
            if (this._map) {
                this._updateStyle();
                this._requestUpdate();
            }
            return this;
        },
        onRemove: function(map) {
            map.off("viewreset", this.projectLatlngs, this).off("moveend", this._updatePath, this);
            if (this.options.clickable) {
                this._map.off("click", this._onClick, this);
                this._map.off("mousemove", this._onMouseMove, this);
            }
            this._requestUpdate();
            this._map = null;
        },
        _requestUpdate: function() {
            this._map && !L.Path._updateRequest && (L.Path._updateRequest = L.Util.requestAnimFrame(this._fireMapMoveEnd, this._map));
        },
        _fireMapMoveEnd: function() {
            L.Path._updateRequest = null;
            this.fire("moveend");
        },
        _initElements: function() {
            this._map._initPathRoot();
            this._ctx = this._map._canvasCtx;
        },
        _updateStyle: function() {
            var options = this.options;
            if (options.stroke) {
                this._ctx.lineWidth = options.weight;
                this._ctx.strokeStyle = options.color;
            }
            options.fill && (this._ctx.fillStyle = options.fillColor || options.color);
        },
        _drawPath: function() {
            var i, j, len, len2, point, drawMethod;
            this._ctx.beginPath();
            for (i = 0, len = this._parts.length; len > i; i++) {
                for (j = 0, len2 = this._parts[i].length; len2 > j; j++) {
                    point = this._parts[i][j];
                    drawMethod = (0 === j ? "move" : "line") + "To";
                    this._ctx[drawMethod](point.x, point.y);
                }
                this instanceof L.Polygon && this._ctx.closePath();
            }
        },
        _checkIfEmpty: function() {
            return !this._parts.length;
        },
        _updatePath: function() {
            if (this._checkIfEmpty()) return;
            var ctx = this._ctx, options = this.options;
            this._drawPath();
            ctx.save();
            this._updateStyle();
            if (options.fill) {
                ctx.globalAlpha = options.fillOpacity;
                ctx.fill();
            }
            if (options.stroke) {
                ctx.globalAlpha = options.opacity;
                ctx.stroke();
            }
            ctx.restore();
        },
        _initEvents: function() {
            if (this.options.clickable) {
                this._map.on("mousemove", this._onMouseMove, this);
                this._map.on("click", this._onClick, this);
            }
        },
        _onClick: function(e) {
            this._containsPoint(e.layerPoint) && this.fire("click", e);
        },
        _onMouseMove: function(e) {
            if (!this._map || this._map._animatingZoom) return;
            if (this._containsPoint(e.layerPoint)) {
                this._ctx.canvas.style.cursor = "pointer";
                this._mouseInside = true;
                this.fire("mouseover", e);
            } else if (this._mouseInside) {
                this._ctx.canvas.style.cursor = "";
                this._mouseInside = false;
                this.fire("mouseout", e);
            }
        }
    });
    L.Map.include(L.Path.SVG && !window.L_PREFER_CANVAS || !L.Browser.canvas ? {} : {
        _initPathRoot: function() {
            var ctx, root = this._pathRoot;
            if (!root) {
                root = this._pathRoot = document.createElement("canvas");
                root.style.position = "absolute";
                ctx = this._canvasCtx = root.getContext("2d");
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                this._panes.overlayPane.appendChild(root);
                if (this.options.zoomAnimation) {
                    this._pathRoot.className = "leaflet-zoom-animated";
                    this.on("zoomanim", this._animatePathZoom);
                    this.on("zoomend", this._endPathZoom);
                }
                this.on("moveend", this._updateCanvasViewport);
                this._updateCanvasViewport();
            }
        },
        _updateCanvasViewport: function() {
            if (this._pathZooming) return;
            this._updatePathViewport();
            var vp = this._pathViewport, min = vp.min, size = vp.max.subtract(min), root = this._pathRoot;
            L.DomUtil.setPosition(root, min);
            root.width = size.x;
            root.height = size.y;
            root.getContext("2d").translate(-min.x, -min.y);
        }
    });
    L.LineUtil = {
        simplify: function(points, tolerance) {
            if (!tolerance || !points.length) return points.slice();
            var sqTolerance = tolerance * tolerance;
            points = this._reducePoints(points, sqTolerance);
            points = this._simplifyDP(points, sqTolerance);
            return points;
        },
        pointToSegmentDistance: function(p, p1, p2) {
            return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
        },
        closestPointOnSegment: function(p, p1, p2) {
            return this._sqClosestPointOnSegment(p, p1, p2);
        },
        _simplifyDP: function(points, sqTolerance) {
            var len = points.length, ArrayConstructor = typeof Uint8Array != undefined + "" ? Uint8Array : Array, markers = new ArrayConstructor(len);
            markers[0] = markers[len - 1] = 1;
            this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);
            var i, newPoints = [];
            for (i = 0; len > i; i++) markers[i] && newPoints.push(points[i]);
            return newPoints;
        },
        _simplifyDPStep: function(points, markers, sqTolerance, first, last) {
            var index, i, sqDist, maxSqDist = 0;
            for (i = first + 1; last - 1 >= i; i++) {
                sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);
                if (sqDist > maxSqDist) {
                    index = i;
                    maxSqDist = sqDist;
                }
            }
            if (maxSqDist > sqTolerance) {
                markers[index] = 1;
                this._simplifyDPStep(points, markers, sqTolerance, first, index);
                this._simplifyDPStep(points, markers, sqTolerance, index, last);
            }
        },
        _reducePoints: function(points, sqTolerance) {
            var reducedPoints = [ points[0] ];
            for (var i = 1, prev = 0, len = points.length; len > i; i++) if (this._sqDist(points[i], points[prev]) > sqTolerance) {
                reducedPoints.push(points[i]);
                prev = i;
            }
            len - 1 > prev && reducedPoints.push(points[len - 1]);
            return reducedPoints;
        },
        clipSegment: function(a, b, bounds, useLastCode) {
            var codeOut, p, newCode, codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds), codeB = this._getBitCode(b, bounds);
            this._lastCode = codeB;
            while (true) {
                if (!(codeA | codeB)) return [ a, b ];
                if (codeA & codeB) return false;
                codeOut = codeA || codeB;
                p = this._getEdgeIntersection(a, b, codeOut, bounds);
                newCode = this._getBitCode(p, bounds);
                if (codeOut === codeA) {
                    a = p;
                    codeA = newCode;
                } else {
                    b = p;
                    codeB = newCode;
                }
            }
        },
        _getEdgeIntersection: function(a, b, code, bounds) {
            var dx = b.x - a.x, dy = b.y - a.y, min = bounds.min, max = bounds.max;
            if (8 & code) return new L.Point(a.x + dx * (max.y - a.y) / dy, max.y);
            if (4 & code) return new L.Point(a.x + dx * (min.y - a.y) / dy, min.y);
            if (2 & code) return new L.Point(max.x, a.y + dy * (max.x - a.x) / dx);
            if (1 & code) return new L.Point(min.x, a.y + dy * (min.x - a.x) / dx);
        },
        _getBitCode: function(p, bounds) {
            var code = 0;
            p.x < bounds.min.x ? code |= 1 : p.x > bounds.max.x && (code |= 2);
            p.y < bounds.min.y ? code |= 4 : p.y > bounds.max.y && (code |= 8);
            return code;
        },
        _sqDist: function(p1, p2) {
            var dx = p2.x - p1.x, dy = p2.y - p1.y;
            return dx * dx + dy * dy;
        },
        _sqClosestPointOnSegment: function(p, p1, p2, sqDist) {
            var t, x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y, dot = dx * dx + dy * dy;
            if (dot > 0) {
                t = ((p.x - x) * dx + (p.y - y) * dy) / dot;
                if (t > 1) {
                    x = p2.x;
                    y = p2.y;
                } else if (t > 0) {
                    x += dx * t;
                    y += dy * t;
                }
            }
            dx = p.x - x;
            dy = p.y - y;
            return sqDist ? dx * dx + dy * dy : new L.Point(x, y);
        }
    };
    L.Polyline = L.Path.extend({
        initialize: function(latlngs, options) {
            L.Path.prototype.initialize.call(this, options);
            this._latlngs = this._convertLatLngs(latlngs);
        },
        options: {
            smoothFactor: 1,
            noClip: false
        },
        projectLatlngs: function() {
            this._originalPoints = [];
            for (var i = 0, len = this._latlngs.length; len > i; i++) this._originalPoints[i] = this._map.latLngToLayerPoint(this._latlngs[i]);
        },
        getPathString: function() {
            for (var i = 0, len = this._parts.length, str = ""; len > i; i++) str += this._getPathPartStr(this._parts[i]);
            return str;
        },
        getLatLngs: function() {
            return this._latlngs;
        },
        setLatLngs: function(latlngs) {
            this._latlngs = this._convertLatLngs(latlngs);
            return this.redraw();
        },
        addLatLng: function(latlng) {
            this._latlngs.push(L.latLng(latlng));
            return this.redraw();
        },
        spliceLatLngs: function() {
            var removed = [].splice.apply(this._latlngs, arguments);
            this._convertLatLngs(this._latlngs, true);
            this.redraw();
            return removed;
        },
        closestLayerPoint: function(p) {
            var p1, p2, minDistance = 1/0, parts = this._parts, minPoint = null;
            for (var j = 0, jLen = parts.length; jLen > j; j++) {
                var points = parts[j];
                for (var i = 1, len = points.length; len > i; i++) {
                    p1 = points[i - 1];
                    p2 = points[i];
                    var sqDist = L.LineUtil._sqClosestPointOnSegment(p, p1, p2, true);
                    if (minDistance > sqDist) {
                        minDistance = sqDist;
                        minPoint = L.LineUtil._sqClosestPointOnSegment(p, p1, p2);
                    }
                }
            }
            minPoint && (minPoint.distance = Math.sqrt(minDistance));
            return minPoint;
        },
        getBounds: function() {
            return new L.LatLngBounds(this.getLatLngs());
        },
        _convertLatLngs: function(latlngs, overwrite) {
            var i, len, target = overwrite ? latlngs : [];
            for (i = 0, len = latlngs.length; len > i; i++) {
                if (L.Util.isArray(latlngs[i]) && "number" != typeof latlngs[i][0]) return;
                target[i] = L.latLng(latlngs[i]);
            }
            return target;
        },
        _initEvents: function() {
            L.Path.prototype._initEvents.call(this);
        },
        _getPathPartStr: function(points) {
            var round = L.Path.VML;
            for (var p, j = 0, len2 = points.length, str = ""; len2 > j; j++) {
                p = points[j];
                round && p._round();
                str += (j ? "L" : "M") + p.x + " " + p.y;
            }
            return str;
        },
        _clipPoints: function() {
            var i, k, segment, points = this._originalPoints, len = points.length;
            if (this.options.noClip) {
                this._parts = [ points ];
                return;
            }
            this._parts = [];
            var parts = this._parts, vp = this._map._pathViewport, lu = L.LineUtil;
            for (i = 0, k = 0; len - 1 > i; i++) {
                segment = lu.clipSegment(points[i], points[i + 1], vp, i);
                if (!segment) continue;
                parts[k] = parts[k] || [];
                parts[k].push(segment[0]);
                if (segment[1] !== points[i + 1] || i === len - 2) {
                    parts[k].push(segment[1]);
                    k++;
                }
            }
        },
        _simplifyPoints: function() {
            var parts = this._parts, lu = L.LineUtil;
            for (var i = 0, len = parts.length; len > i; i++) parts[i] = lu.simplify(parts[i], this.options.smoothFactor);
        },
        _updatePath: function() {
            if (!this._map) return;
            this._clipPoints();
            this._simplifyPoints();
            L.Path.prototype._updatePath.call(this);
        }
    });
    L.polyline = function(latlngs, options) {
        return new L.Polyline(latlngs, options);
    };
    L.PolyUtil = {};
    L.PolyUtil.clipPolygon = function(points, bounds) {
        var clippedPoints, i, j, k, a, b, len, edge, p, edges = [ 1, 4, 2, 8 ], lu = L.LineUtil;
        for (i = 0, len = points.length; len > i; i++) points[i]._code = lu._getBitCode(points[i], bounds);
        for (k = 0; 4 > k; k++) {
            edge = edges[k];
            clippedPoints = [];
            for (i = 0, len = points.length, j = len - 1; len > i; j = i++) {
                a = points[i];
                b = points[j];
                if (a._code & edge) {
                    if (!(b._code & edge)) {
                        p = lu._getEdgeIntersection(b, a, edge, bounds);
                        p._code = lu._getBitCode(p, bounds);
                        clippedPoints.push(p);
                    }
                } else {
                    if (b._code & edge) {
                        p = lu._getEdgeIntersection(b, a, edge, bounds);
                        p._code = lu._getBitCode(p, bounds);
                        clippedPoints.push(p);
                    }
                    clippedPoints.push(a);
                }
            }
            points = clippedPoints;
        }
        return points;
    };
    L.Polygon = L.Polyline.extend({
        options: {
            fill: true
        },
        initialize: function(latlngs, options) {
            var i, len, hole;
            L.Polyline.prototype.initialize.call(this, latlngs, options);
            if (latlngs && L.Util.isArray(latlngs[0]) && "number" != typeof latlngs[0][0]) {
                this._latlngs = this._convertLatLngs(latlngs[0]);
                this._holes = latlngs.slice(1);
                for (i = 0, len = this._holes.length; len > i; i++) {
                    hole = this._holes[i] = this._convertLatLngs(this._holes[i]);
                    hole[0].equals(hole[hole.length - 1]) && hole.pop();
                }
            }
            latlngs = this._latlngs;
            latlngs.length >= 2 && latlngs[0].equals(latlngs[latlngs.length - 1]) && latlngs.pop();
        },
        projectLatlngs: function() {
            L.Polyline.prototype.projectLatlngs.call(this);
            this._holePoints = [];
            if (!this._holes) return;
            var i, j, len, len2;
            for (i = 0, len = this._holes.length; len > i; i++) {
                this._holePoints[i] = [];
                for (j = 0, len2 = this._holes[i].length; len2 > j; j++) this._holePoints[i][j] = this._map.latLngToLayerPoint(this._holes[i][j]);
            }
        },
        _clipPoints: function() {
            var points = this._originalPoints, newParts = [];
            this._parts = [ points ].concat(this._holePoints);
            if (this.options.noClip) return;
            for (var i = 0, len = this._parts.length; len > i; i++) {
                var clipped = L.PolyUtil.clipPolygon(this._parts[i], this._map._pathViewport);
                clipped.length && newParts.push(clipped);
            }
            this._parts = newParts;
        },
        _getPathPartStr: function(points) {
            var str = L.Polyline.prototype._getPathPartStr.call(this, points);
            return str + (L.Browser.svg ? "z" : "x");
        }
    });
    L.polygon = function(latlngs, options) {
        return new L.Polygon(latlngs, options);
    };
    (function() {
        function createMulti(Klass) {
            return L.FeatureGroup.extend({
                initialize: function(latlngs, options) {
                    this._layers = {};
                    this._options = options;
                    this.setLatLngs(latlngs);
                },
                setLatLngs: function(latlngs) {
                    var i = 0, len = latlngs.length;
                    this.eachLayer(function(layer) {
                        len > i ? layer.setLatLngs(latlngs[i++]) : this.removeLayer(layer);
                    }, this);
                    while (len > i) this.addLayer(new Klass(latlngs[i++], this._options));
                    return this;
                },
                getLatLngs: function() {
                    var latlngs = [];
                    this.eachLayer(function(layer) {
                        latlngs.push(layer.getLatLngs());
                    });
                    return latlngs;
                }
            });
        }
        L.MultiPolyline = createMulti(L.Polyline);
        L.MultiPolygon = createMulti(L.Polygon);
        L.multiPolyline = function(latlngs, options) {
            return new L.MultiPolyline(latlngs, options);
        };
        L.multiPolygon = function(latlngs, options) {
            return new L.MultiPolygon(latlngs, options);
        };
    })();
    L.Rectangle = L.Polygon.extend({
        initialize: function(latLngBounds, options) {
            L.Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
        },
        setBounds: function(latLngBounds) {
            this.setLatLngs(this._boundsToLatLngs(latLngBounds));
        },
        _boundsToLatLngs: function(latLngBounds) {
            latLngBounds = L.latLngBounds(latLngBounds);
            return [ latLngBounds.getSouthWest(), latLngBounds.getNorthWest(), latLngBounds.getNorthEast(), latLngBounds.getSouthEast() ];
        }
    });
    L.rectangle = function(latLngBounds, options) {
        return new L.Rectangle(latLngBounds, options);
    };
    L.Circle = L.Path.extend({
        initialize: function(latlng, radius, options) {
            L.Path.prototype.initialize.call(this, options);
            this._latlng = L.latLng(latlng);
            this._mRadius = radius;
        },
        options: {
            fill: true
        },
        setLatLng: function(latlng) {
            this._latlng = L.latLng(latlng);
            return this.redraw();
        },
        setRadius: function(radius) {
            this._mRadius = radius;
            return this.redraw();
        },
        projectLatlngs: function() {
            var lngRadius = this._getLngRadius(), latlng = this._latlng, pointLeft = this._map.latLngToLayerPoint([ latlng.lat, latlng.lng - lngRadius ]);
            this._point = this._map.latLngToLayerPoint(latlng);
            this._radius = Math.max(this._point.x - pointLeft.x, 1);
        },
        getBounds: function() {
            var lngRadius = this._getLngRadius(), latRadius = 360 * (this._mRadius / 40075017), latlng = this._latlng;
            return new L.LatLngBounds([ latlng.lat - latRadius, latlng.lng - lngRadius ], [ latlng.lat + latRadius, latlng.lng + lngRadius ]);
        },
        getLatLng: function() {
            return this._latlng;
        },
        getPathString: function() {
            var p = this._point, r = this._radius;
            if (this._checkIfEmpty()) return "";
            if (L.Browser.svg) return "M" + p.x + "," + (p.y - r) + "A" + r + "," + r + ",0,1,1," + (p.x - .1) + "," + (p.y - r) + " z";
            p._round();
            r = Math.round(r);
            return "AL " + p.x + "," + p.y + " " + r + "," + r + " 0," + 23592600;
        },
        getRadius: function() {
            return this._mRadius;
        },
        _getLatRadius: function() {
            return 360 * (this._mRadius / 40075017);
        },
        _getLngRadius: function() {
            return this._getLatRadius() / Math.cos(L.LatLng.DEG_TO_RAD * this._latlng.lat);
        },
        _checkIfEmpty: function() {
            if (!this._map) return false;
            var vp = this._map._pathViewport, r = this._radius, p = this._point;
            return p.x - r > vp.max.x || p.y - r > vp.max.y || p.x + r < vp.min.x || p.y + r < vp.min.y;
        }
    });
    L.circle = function(latlng, radius, options) {
        return new L.Circle(latlng, radius, options);
    };
    L.CircleMarker = L.Circle.extend({
        options: {
            radius: 10,
            weight: 2
        },
        initialize: function(latlng, options) {
            L.Circle.prototype.initialize.call(this, latlng, null, options);
            this._radius = this.options.radius;
        },
        projectLatlngs: function() {
            this._point = this._map.latLngToLayerPoint(this._latlng);
        },
        _updateStyle: function() {
            L.Circle.prototype._updateStyle.call(this);
            this.setRadius(this.options.radius);
        },
        setRadius: function(radius) {
            this.options.radius = this._radius = radius;
            return this.redraw();
        }
    });
    L.circleMarker = function(latlng, options) {
        return new L.CircleMarker(latlng, options);
    };
    L.Polyline.include(L.Path.CANVAS ? {
        _containsPoint: function(p, closed) {
            var i, j, k, len, len2, dist, part, w = this.options.weight / 2;
            L.Browser.touch && (w += 10);
            for (i = 0, len = this._parts.length; len > i; i++) {
                part = this._parts[i];
                for (j = 0, len2 = part.length, k = len2 - 1; len2 > j; k = j++) {
                    if (!closed && 0 === j) continue;
                    dist = L.LineUtil.pointToSegmentDistance(p, part[k], part[j]);
                    if (w >= dist) return true;
                }
            }
            return false;
        }
    } : {});
    L.Polygon.include(L.Path.CANVAS ? {
        _containsPoint: function(p) {
            var part, p1, p2, i, j, k, len, len2, inside = false;
            if (L.Polyline.prototype._containsPoint.call(this, p, true)) return true;
            for (i = 0, len = this._parts.length; len > i; i++) {
                part = this._parts[i];
                for (j = 0, len2 = part.length, k = len2 - 1; len2 > j; k = j++) {
                    p1 = part[j];
                    p2 = part[k];
                    p1.y > p.y != p2.y > p.y && p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x && (inside = !inside);
                }
            }
            return inside;
        }
    } : {});
    L.Circle.include(L.Path.CANVAS ? {
        _drawPath: function() {
            var p = this._point;
            this._ctx.beginPath();
            this._ctx.arc(p.x, p.y, this._radius, 0, 2 * Math.PI, false);
        },
        _containsPoint: function(p) {
            var center = this._point, w2 = this.options.stroke ? this.options.weight / 2 : 0;
            return p.distanceTo(center) <= this._radius + w2;
        }
    } : {});
    L.CircleMarker.include(L.Path.CANVAS ? {
        _updateStyle: function() {
            L.Path.prototype._updateStyle.call(this);
        }
    } : {});
    L.GeoJSON = L.FeatureGroup.extend({
        initialize: function(geojson, options) {
            L.setOptions(this, options);
            this._layers = {};
            geojson && this.addData(geojson);
        },
        addData: function(geojson) {
            var i, len, feature, features = L.Util.isArray(geojson) ? geojson : geojson.features;
            if (features) {
                for (i = 0, len = features.length; len > i; i++) {
                    feature = features[i];
                    (feature.geometries || feature.geometry || feature.features || feature.coordinates) && this.addData(features[i]);
                }
                return this;
            }
            var options = this.options;
            if (options.filter && !options.filter(geojson)) return;
            var layer = L.GeoJSON.geometryToLayer(geojson, options.pointToLayer, options.coordsToLatLng);
            layer.feature = L.GeoJSON.asFeature(geojson);
            layer.defaultOptions = layer.options;
            this.resetStyle(layer);
            options.onEachFeature && options.onEachFeature(geojson, layer);
            return this.addLayer(layer);
        },
        resetStyle: function(layer) {
            var style = this.options.style;
            if (style) {
                L.Util.extend(layer.options, layer.defaultOptions);
                this._setLayerStyle(layer, style);
            }
        },
        setStyle: function(style) {
            this.eachLayer(function(layer) {
                this._setLayerStyle(layer, style);
            }, this);
        },
        _setLayerStyle: function(layer, style) {
            "function" == typeof style && (style = style(layer.feature));
            layer.setStyle && layer.setStyle(style);
        }
    });
    L.extend(L.GeoJSON, {
        geometryToLayer: function(geojson, pointToLayer, coordsToLatLng) {
            var latlng, latlngs, i, len, layer, geometry = "Feature" === geojson.type ? geojson.geometry : geojson, coords = geometry.coordinates, layers = [];
            coordsToLatLng = coordsToLatLng || this.coordsToLatLng;
            switch (geometry.type) {
              case "Point":
                latlng = coordsToLatLng(coords);
                return pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng);

              case "MultiPoint":
                for (i = 0, len = coords.length; len > i; i++) {
                    latlng = coordsToLatLng(coords[i]);
                    layer = pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng);
                    layers.push(layer);
                }
                return new L.FeatureGroup(layers);

              case "LineString":
                latlngs = this.coordsToLatLngs(coords, 0, coordsToLatLng);
                return new L.Polyline(latlngs);

              case "Polygon":
                latlngs = this.coordsToLatLngs(coords, 1, coordsToLatLng);
                return new L.Polygon(latlngs);

              case "MultiLineString":
                latlngs = this.coordsToLatLngs(coords, 1, coordsToLatLng);
                return new L.MultiPolyline(latlngs);

              case "MultiPolygon":
                latlngs = this.coordsToLatLngs(coords, 2, coordsToLatLng);
                return new L.MultiPolygon(latlngs);

              case "GeometryCollection":
                for (i = 0, len = geometry.geometries.length; len > i; i++) {
                    layer = this.geometryToLayer({
                        geometry: geometry.geometries[i],
                        type: "Feature",
                        properties: geojson.properties
                    }, pointToLayer, coordsToLatLng);
                    layers.push(layer);
                }
                return new L.FeatureGroup(layers);

              default:
                throw new Error("Invalid GeoJSON object.");
            }
        },
        coordsToLatLng: function(coords) {
            return new L.LatLng(coords[1], coords[0]);
        },
        coordsToLatLngs: function(coords, levelsDeep, coordsToLatLng) {
            var latlng, i, len, latlngs = [];
            for (i = 0, len = coords.length; len > i; i++) {
                latlng = levelsDeep ? this.coordsToLatLngs(coords[i], levelsDeep - 1, coordsToLatLng) : (coordsToLatLng || this.coordsToLatLng)(coords[i]);
                latlngs.push(latlng);
            }
            return latlngs;
        },
        latLngToCoords: function(latLng) {
            return [ latLng.lng, latLng.lat ];
        },
        latLngsToCoords: function(latLngs) {
            var coords = [];
            for (var i = 0, len = latLngs.length; len > i; i++) coords.push(L.GeoJSON.latLngToCoords(latLngs[i]));
            return coords;
        },
        getFeature: function(layer, newGeometry) {
            return layer.feature ? L.extend({}, layer.feature, {
                geometry: newGeometry
            }) : L.GeoJSON.asFeature(newGeometry);
        },
        asFeature: function(geoJSON) {
            if ("Feature" === geoJSON.type) return geoJSON;
            return {
                type: "Feature",
                properties: {},
                geometry: geoJSON
            };
        }
    });
    var PointToGeoJSON = {
        toGeoJSON: function() {
            return L.GeoJSON.getFeature(this, {
                type: "Point",
                coordinates: L.GeoJSON.latLngToCoords(this.getLatLng())
            });
        }
    };
    L.Marker.include(PointToGeoJSON);
    L.Circle.include(PointToGeoJSON);
    L.CircleMarker.include(PointToGeoJSON);
    L.Polyline.include({
        toGeoJSON: function() {
            return L.GeoJSON.getFeature(this, {
                type: "LineString",
                coordinates: L.GeoJSON.latLngsToCoords(this.getLatLngs())
            });
        }
    });
    L.Polygon.include({
        toGeoJSON: function() {
            var i, len, hole, coords = [ L.GeoJSON.latLngsToCoords(this.getLatLngs()) ];
            coords[0].push(coords[0][0]);
            if (this._holes) for (i = 0, len = this._holes.length; len > i; i++) {
                hole = L.GeoJSON.latLngsToCoords(this._holes[i]);
                hole.push(hole[0]);
                coords.push(hole);
            }
            return L.GeoJSON.getFeature(this, {
                type: "Polygon",
                coordinates: coords
            });
        }
    });
    (function() {
        function includeMulti(Klass, type) {
            Klass.include({
                toGeoJSON: function() {
                    var coords = [];
                    this.eachLayer(function(layer) {
                        coords.push(layer.toGeoJSON().geometry.coordinates);
                    });
                    return L.GeoJSON.getFeature(this, {
                        type: type,
                        coordinates: coords
                    });
                }
            });
        }
        includeMulti(L.MultiPolyline, "MultiLineString");
        includeMulti(L.MultiPolygon, "MultiPolygon");
    })();
    L.LayerGroup.include({
        toGeoJSON: function() {
            var features = [];
            this.eachLayer(function(layer) {
                layer.toGeoJSON && features.push(L.GeoJSON.asFeature(layer.toGeoJSON()));
            });
            return {
                type: "FeatureCollection",
                features: features
            };
        }
    });
    L.geoJson = function(geojson, options) {
        return new L.GeoJSON(geojson, options);
    };
    L.DomEvent = {
        addListener: function(obj, type, fn, context) {
            var handler, originalHandler, newType, id = L.stamp(fn), key = "_leaflet_" + type + id;
            if (obj[key]) return this;
            handler = function(e) {
                return fn.call(context || obj, e || L.DomEvent._getEvent());
            };
            if (L.Browser.msTouch && 0 === type.indexOf("touch")) return this.addMsTouchListener(obj, type, handler, id);
            L.Browser.touch && "dblclick" === type && this.addDoubleTapListener && this.addDoubleTapListener(obj, handler, id);
            if ("addEventListener" in obj) if ("mousewheel" === type) {
                obj.addEventListener("DOMMouseScroll", handler, false);
                obj.addEventListener(type, handler, false);
            } else if ("mouseenter" === type || "mouseleave" === type) {
                originalHandler = handler;
                newType = "mouseenter" === type ? "mouseover" : "mouseout";
                handler = function(e) {
                    if (!L.DomEvent._checkMouse(obj, e)) return;
                    return originalHandler(e);
                };
                obj.addEventListener(newType, handler, false);
            } else if ("click" === type && L.Browser.android) {
                originalHandler = handler;
                handler = function(e) {
                    return L.DomEvent._filterClick(e, originalHandler);
                };
                obj.addEventListener(type, handler, false);
            } else obj.addEventListener(type, handler, false); else "attachEvent" in obj && obj.attachEvent("on" + type, handler);
            obj[key] = handler;
            return this;
        },
        removeListener: function(obj, type, fn) {
            var id = L.stamp(fn), key = "_leaflet_" + type + id, handler = obj[key];
            if (!handler) return this;
            if (L.Browser.msTouch && 0 === type.indexOf("touch")) this.removeMsTouchListener(obj, type, id); else if (L.Browser.touch && "dblclick" === type && this.removeDoubleTapListener) this.removeDoubleTapListener(obj, id); else if ("removeEventListener" in obj) if ("mousewheel" === type) {
                obj.removeEventListener("DOMMouseScroll", handler, false);
                obj.removeEventListener(type, handler, false);
            } else "mouseenter" === type || "mouseleave" === type ? obj.removeEventListener("mouseenter" === type ? "mouseover" : "mouseout", handler, false) : obj.removeEventListener(type, handler, false); else "detachEvent" in obj && obj.detachEvent("on" + type, handler);
            obj[key] = null;
            return this;
        },
        stopPropagation: function(e) {
            e.stopPropagation ? e.stopPropagation() : e.cancelBubble = true;
            return this;
        },
        disableClickPropagation: function(el) {
            var stop = L.DomEvent.stopPropagation;
            for (var i = L.Draggable.START.length - 1; i >= 0; i--) L.DomEvent.addListener(el, L.Draggable.START[i], stop);
            return L.DomEvent.addListener(el, "click", L.DomEvent._fakeStop).addListener(el, "dblclick", stop);
        },
        preventDefault: function(e) {
            e.preventDefault ? e.preventDefault() : e.returnValue = false;
            return this;
        },
        stop: function(e) {
            return L.DomEvent.preventDefault(e).stopPropagation(e);
        },
        getMousePosition: function(e, container) {
            var ie7 = L.Browser.ie7, body = document.body, docEl = document.documentElement, x = e.pageX ? e.pageX - body.scrollLeft - docEl.scrollLeft : e.clientX, y = e.pageY ? e.pageY - body.scrollTop - docEl.scrollTop : e.clientY, pos = new L.Point(x, y), rect = container.getBoundingClientRect(), left = rect.left - container.clientLeft, top = rect.top - container.clientTop;
            if (!L.DomUtil.documentIsLtr() && (L.Browser.webkit || ie7)) {
                left += container.scrollWidth - container.clientWidth;
                ie7 && "hidden" !== L.DomUtil.getStyle(container, "overflow-y") && "hidden" !== L.DomUtil.getStyle(container, "overflow") && (left += 17);
            }
            return pos._subtract(new L.Point(left, top));
        },
        getWheelDelta: function(e) {
            var delta = 0;
            e.wheelDelta && (delta = e.wheelDelta / 120);
            e.detail && (delta = -e.detail / 3);
            return delta;
        },
        _skipEvents: {},
        _fakeStop: function(e) {
            L.DomEvent._skipEvents[e.type] = true;
        },
        _skipped: function(e) {
            var skipped = this._skipEvents[e.type];
            this._skipEvents[e.type] = false;
            return skipped;
        },
        _checkMouse: function(el, e) {
            var related = e.relatedTarget;
            if (!related) return true;
            try {
                while (related && related !== el) related = related.parentNode;
            } catch (err) {
                return false;
            }
            return related !== el;
        },
        _getEvent: function() {
            var e = window.event;
            if (!e) {
                var caller = arguments.callee.caller;
                while (caller) {
                    e = caller["arguments"][0];
                    if (e && window.Event === e.constructor) break;
                    caller = caller.caller;
                }
            }
            return e;
        },
        _filterClick: function(e, handler) {
            var timeStamp = e.timeStamp || e.originalEvent.timeStamp, elapsed = L.DomEvent._lastClick && timeStamp - L.DomEvent._lastClick;
            if (elapsed && elapsed > 100 && 1e3 > elapsed || e.target._simulatedClick && !e._simulated) {
                L.DomEvent.stop(e);
                return;
            }
            L.DomEvent._lastClick = timeStamp;
            return handler(e);
        }
    };
    L.DomEvent.on = L.DomEvent.addListener;
    L.DomEvent.off = L.DomEvent.removeListener;
    L.Draggable = L.Class.extend({
        includes: L.Mixin.Events,
        statics: {
            START: L.Browser.touch ? [ "touchstart", "mousedown" ] : [ "mousedown" ],
            END: {
                mousedown: "mouseup",
                touchstart: "touchend",
                MSPointerDown: "touchend"
            },
            MOVE: {
                mousedown: "mousemove",
                touchstart: "touchmove",
                MSPointerDown: "touchmove"
            }
        },
        initialize: function(element, dragStartTarget) {
            this._element = element;
            this._dragStartTarget = dragStartTarget || element;
        },
        enable: function() {
            if (this._enabled) return;
            for (var i = L.Draggable.START.length - 1; i >= 0; i--) L.DomEvent.on(this._dragStartTarget, L.Draggable.START[i], this._onDown, this);
            this._enabled = true;
        },
        disable: function() {
            if (!this._enabled) return;
            for (var i = L.Draggable.START.length - 1; i >= 0; i--) L.DomEvent.off(this._dragStartTarget, L.Draggable.START[i], this._onDown, this);
            this._enabled = false;
            this._moved = false;
        },
        _onDown: function(e) {
            if (e.shiftKey || 1 !== e.which && 1 !== e.button && !e.touches) return;
            L.DomEvent.stopPropagation(e);
            if (L.Draggable._disabled) return;
            L.DomUtil.disableImageDrag();
            L.DomUtil.disableTextSelection();
            var first = e.touches ? e.touches[0] : e, el = first.target;
            L.Browser.touch && "a" === el.tagName.toLowerCase() && L.DomUtil.addClass(el, "leaflet-active");
            this._moved = false;
            if (this._moving) return;
            this._startPoint = new L.Point(first.clientX, first.clientY);
            this._startPos = this._newPos = L.DomUtil.getPosition(this._element);
            L.DomEvent.on(document, L.Draggable.MOVE[e.type], this._onMove, this).on(document, L.Draggable.END[e.type], this._onUp, this);
        },
        _onMove: function(e) {
            if (e.touches && e.touches.length > 1) return;
            var first = e.touches && 1 === e.touches.length ? e.touches[0] : e, newPoint = new L.Point(first.clientX, first.clientY), offset = newPoint.subtract(this._startPoint);
            if (!offset.x && !offset.y) return;
            L.DomEvent.preventDefault(e);
            if (!this._moved) {
                this.fire("dragstart");
                this._moved = true;
                this._startPos = L.DomUtil.getPosition(this._element).subtract(offset);
                L.Browser.touch || L.DomUtil.addClass(document.body, "leaflet-dragging");
            }
            this._newPos = this._startPos.add(offset);
            this._moving = true;
            L.Util.cancelAnimFrame(this._animRequest);
            this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
        },
        _updatePosition: function() {
            this.fire("predrag");
            L.DomUtil.setPosition(this._element, this._newPos);
            this.fire("drag");
        },
        _onUp: function() {
            L.Browser.touch || L.DomUtil.removeClass(document.body, "leaflet-dragging");
            for (var i in L.Draggable.MOVE) L.DomEvent.off(document, L.Draggable.MOVE[i], this._onMove).off(document, L.Draggable.END[i], this._onUp);
            L.DomUtil.enableImageDrag();
            L.DomUtil.enableTextSelection();
            if (this._moved) {
                L.Util.cancelAnimFrame(this._animRequest);
                this.fire("dragend");
            }
            this._moving = false;
        }
    });
    L.Handler = L.Class.extend({
        initialize: function(map) {
            this._map = map;
        },
        enable: function() {
            if (this._enabled) return;
            this._enabled = true;
            this.addHooks();
        },
        disable: function() {
            if (!this._enabled) return;
            this._enabled = false;
            this.removeHooks();
        },
        enabled: function() {
            return !!this._enabled;
        }
    });
    L.Map.mergeOptions({
        dragging: true,
        inertia: !L.Browser.android23,
        inertiaDeceleration: 3400,
        inertiaMaxSpeed: 1/0,
        inertiaThreshold: L.Browser.touch ? 32 : 18,
        easeLinearity: .25,
        worldCopyJump: false
    });
    L.Map.Drag = L.Handler.extend({
        addHooks: function() {
            if (!this._draggable) {
                var map = this._map;
                this._draggable = new L.Draggable(map._mapPane, map._container);
                this._draggable.on({
                    dragstart: this._onDragStart,
                    drag: this._onDrag,
                    dragend: this._onDragEnd
                }, this);
                if (map.options.worldCopyJump) {
                    this._draggable.on("predrag", this._onPreDrag, this);
                    map.on("viewreset", this._onViewReset, this);
                    this._onViewReset();
                }
            }
            this._draggable.enable();
        },
        removeHooks: function() {
            this._draggable.disable();
        },
        moved: function() {
            return this._draggable && this._draggable._moved;
        },
        _onDragStart: function() {
            var map = this._map;
            map._panAnim && map._panAnim.stop();
            map.fire("movestart").fire("dragstart");
            if (map.options.inertia) {
                this._positions = [];
                this._times = [];
            }
        },
        _onDrag: function() {
            if (this._map.options.inertia) {
                var time = this._lastTime = +new Date(), pos = this._lastPos = this._draggable._newPos;
                this._positions.push(pos);
                this._times.push(time);
                if (time - this._times[0] > 200) {
                    this._positions.shift();
                    this._times.shift();
                }
            }
            this._map.fire("move").fire("drag");
        },
        _onViewReset: function() {
            var pxCenter = this._map.getSize()._divideBy(2), pxWorldCenter = this._map.latLngToLayerPoint([ 0, 0 ]);
            this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
            this._worldWidth = this._map.project([ 0, 180 ]).x;
        },
        _onPreDrag: function() {
            var worldWidth = this._worldWidth, halfWidth = Math.round(worldWidth / 2), dx = this._initialWorldOffset, x = this._draggable._newPos.x, newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx, newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx, newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;
            this._draggable._newPos.x = newX;
        },
        _onDragEnd: function() {
            var map = this._map, options = map.options, delay = +new Date() - this._lastTime, noInertia = !options.inertia || delay > options.inertiaThreshold || !this._positions[0];
            map.fire("dragend");
            if (noInertia) map.fire("moveend"); else {
                var direction = this._lastPos.subtract(this._positions[0]), duration = (this._lastTime + delay - this._times[0]) / 1e3, ease = options.easeLinearity, speedVector = direction.multiplyBy(ease / duration), speed = speedVector.distanceTo([ 0, 0 ]), limitedSpeed = Math.min(options.inertiaMaxSpeed, speed), limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed), decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease), offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();
                offset.x && offset.y ? L.Util.requestAnimFrame(function() {
                    map.panBy(offset, {
                        duration: decelerationDuration,
                        easeLinearity: ease,
                        noMoveStart: true
                    });
                }) : map.fire("moveend");
            }
        }
    });
    L.Map.addInitHook("addHandler", "dragging", L.Map.Drag);
    L.Map.mergeOptions({
        doubleClickZoom: true
    });
    L.Map.DoubleClickZoom = L.Handler.extend({
        addHooks: function() {
            this._map.on("dblclick", this._onDoubleClick);
        },
        removeHooks: function() {
            this._map.off("dblclick", this._onDoubleClick);
        },
        _onDoubleClick: function(e) {
            this.setZoomAround(e.containerPoint, this._zoom + 1);
        }
    });
    L.Map.addInitHook("addHandler", "doubleClickZoom", L.Map.DoubleClickZoom);
    L.Map.mergeOptions({
        scrollWheelZoom: true
    });
    L.Map.ScrollWheelZoom = L.Handler.extend({
        addHooks: function() {
            L.DomEvent.on(this._map._container, "mousewheel", this._onWheelScroll, this);
            L.DomEvent.on(this._map._container, "MozMousePixelScroll", L.DomEvent.preventDefault);
            this._delta = 0;
        },
        removeHooks: function() {
            L.DomEvent.off(this._map._container, "mousewheel", this._onWheelScroll);
            L.DomEvent.off(this._map._container, "MozMousePixelScroll", L.DomEvent.preventDefault);
        },
        _onWheelScroll: function(e) {
            var delta = L.DomEvent.getWheelDelta(e);
            this._delta += delta;
            this._lastMousePos = this._map.mouseEventToContainerPoint(e);
            this._startTime || (this._startTime = +new Date());
            var left = Math.max(40 - (+new Date() - this._startTime), 0);
            clearTimeout(this._timer);
            this._timer = setTimeout(L.bind(this._performZoom, this), left);
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);
        },
        _performZoom: function() {
            var map = this._map, delta = this._delta, zoom = map.getZoom();
            delta = delta > 0 ? Math.ceil(delta) : Math.floor(delta);
            delta = Math.max(Math.min(delta, 4), -4);
            delta = map._limitZoom(zoom + delta) - zoom;
            this._delta = 0;
            this._startTime = null;
            if (!delta) return;
            map.setZoomAround(this._lastMousePos, zoom + delta);
        }
    });
    L.Map.addInitHook("addHandler", "scrollWheelZoom", L.Map.ScrollWheelZoom);
    L.extend(L.DomEvent, {
        _touchstart: L.Browser.msTouch ? "MSPointerDown" : "touchstart",
        _touchend: L.Browser.msTouch ? "MSPointerUp" : "touchend",
        addDoubleTapListener: function(obj, handler, id) {
            function onTouchStart(e) {
                var count;
                if (L.Browser.msTouch) {
                    trackedTouches.push(e.pointerId);
                    count = trackedTouches.length;
                } else count = e.touches.length;
                if (count > 1) return;
                var now = Date.now(), delta = now - (last || now);
                touch = e.touches ? e.touches[0] : e;
                doubleTap = delta > 0 && delay >= delta;
                last = now;
            }
            function onTouchEnd(e) {
                if (L.Browser.msTouch) {
                    var idx = trackedTouches.indexOf(e.pointerId);
                    if (-1 === idx) return;
                    trackedTouches.splice(idx, 1);
                }
                if (doubleTap) {
                    if (L.Browser.msTouch) {
                        var prop, newTouch = {};
                        for (var i in touch) {
                            prop = touch[i];
                            newTouch[i] = "function" == typeof prop ? prop.bind(touch) : prop;
                        }
                        touch = newTouch;
                    }
                    touch.type = "dblclick";
                    handler(touch);
                    last = null;
                }
            }
            var last, touch, doubleTap = false, delay = 250, pre = "_leaflet_", touchstart = this._touchstart, touchend = this._touchend, trackedTouches = [];
            obj[pre + touchstart + id] = onTouchStart;
            obj[pre + touchend + id] = onTouchEnd;
            var endElement = L.Browser.msTouch ? document.documentElement : obj;
            obj.addEventListener(touchstart, onTouchStart, false);
            endElement.addEventListener(touchend, onTouchEnd, false);
            L.Browser.msTouch && endElement.addEventListener("MSPointerCancel", onTouchEnd, false);
            return this;
        },
        removeDoubleTapListener: function(obj, id) {
            var pre = "_leaflet_";
            obj.removeEventListener(this._touchstart, obj[pre + this._touchstart + id], false);
            (L.Browser.msTouch ? document.documentElement : obj).removeEventListener(this._touchend, obj[pre + this._touchend + id], false);
            L.Browser.msTouch && document.documentElement.removeEventListener("MSPointerCancel", obj[pre + this._touchend + id], false);
            return this;
        }
    });
    L.extend(L.DomEvent, {
        _msTouches: [],
        _msDocumentListener: false,
        addMsTouchListener: function(obj, type, handler, id) {
            switch (type) {
              case "touchstart":
                return this.addMsTouchListenerStart(obj, type, handler, id);

              case "touchend":
                return this.addMsTouchListenerEnd(obj, type, handler, id);

              case "touchmove":
                return this.addMsTouchListenerMove(obj, type, handler, id);

              default:
                throw "Unknown touch event type";
            }
        },
        addMsTouchListenerStart: function(obj, type, handler, id) {
            var pre = "_leaflet_", touches = this._msTouches;
            var cb = function(e) {
                var alreadyInArray = false;
                for (var i = 0; touches.length > i; i++) if (touches[i].pointerId === e.pointerId) {
                    alreadyInArray = true;
                    break;
                }
                alreadyInArray || touches.push(e);
                e.touches = touches.slice();
                e.changedTouches = [ e ];
                handler(e);
            };
            obj[pre + "touchstart" + id] = cb;
            obj.addEventListener("MSPointerDown", cb, false);
            if (!this._msDocumentListener) {
                var internalCb = function(e) {
                    for (var i = 0; touches.length > i; i++) if (touches[i].pointerId === e.pointerId) {
                        touches.splice(i, 1);
                        break;
                    }
                };
                document.documentElement.addEventListener("MSPointerUp", internalCb, false);
                document.documentElement.addEventListener("MSPointerCancel", internalCb, false);
                this._msDocumentListener = true;
            }
            return this;
        },
        addMsTouchListenerMove: function(obj, type, handler, id) {
            function cb(e) {
                if (e.pointerType === e.MSPOINTER_TYPE_MOUSE && 0 === e.buttons) return;
                for (var i = 0; touches.length > i; i++) if (touches[i].pointerId === e.pointerId) {
                    touches[i] = e;
                    break;
                }
                e.touches = touches.slice();
                e.changedTouches = [ e ];
                handler(e);
            }
            var pre = "_leaflet_", touches = this._msTouches;
            obj[pre + "touchmove" + id] = cb;
            obj.addEventListener("MSPointerMove", cb, false);
            return this;
        },
        addMsTouchListenerEnd: function(obj, type, handler, id) {
            var pre = "_leaflet_", touches = this._msTouches;
            var cb = function(e) {
                for (var i = 0; touches.length > i; i++) if (touches[i].pointerId === e.pointerId) {
                    touches.splice(i, 1);
                    break;
                }
                e.touches = touches.slice();
                e.changedTouches = [ e ];
                handler(e);
            };
            obj[pre + "touchend" + id] = cb;
            obj.addEventListener("MSPointerUp", cb, false);
            obj.addEventListener("MSPointerCancel", cb, false);
            return this;
        },
        removeMsTouchListener: function(obj, type, id) {
            var pre = "_leaflet_", cb = obj[pre + type + id];
            switch (type) {
              case "touchstart":
                obj.removeEventListener("MSPointerDown", cb, false);
                break;

              case "touchmove":
                obj.removeEventListener("MSPointerMove", cb, false);
                break;

              case "touchend":
                obj.removeEventListener("MSPointerUp", cb, false);
                obj.removeEventListener("MSPointerCancel", cb, false);
            }
            return this;
        }
    });
    L.Map.mergeOptions({
        touchZoom: L.Browser.touch && !L.Browser.android23
    });
    L.Map.TouchZoom = L.Handler.extend({
        addHooks: function() {
            L.DomEvent.on(this._map._container, "touchstart", this._onTouchStart, this);
        },
        removeHooks: function() {
            L.DomEvent.off(this._map._container, "touchstart", this._onTouchStart, this);
        },
        _onTouchStart: function(e) {
            var map = this._map;
            if (!e.touches || 2 !== e.touches.length || map._animatingZoom || this._zooming) return;
            var p1 = map.mouseEventToLayerPoint(e.touches[0]), p2 = map.mouseEventToLayerPoint(e.touches[1]), viewCenter = map._getCenterLayerPoint();
            this._startCenter = p1.add(p2)._divideBy(2);
            this._startDist = p1.distanceTo(p2);
            this._moved = false;
            this._zooming = true;
            this._centerOffset = viewCenter.subtract(this._startCenter);
            map._panAnim && map._panAnim.stop();
            L.DomEvent.on(document, "touchmove", this._onTouchMove, this).on(document, "touchend", this._onTouchEnd, this);
            L.DomEvent.preventDefault(e);
        },
        _onTouchMove: function(e) {
            var map = this._map;
            if (!e.touches || 2 !== e.touches.length || !this._zooming) return;
            var p1 = map.mouseEventToLayerPoint(e.touches[0]), p2 = map.mouseEventToLayerPoint(e.touches[1]);
            this._scale = p1.distanceTo(p2) / this._startDist;
            this._delta = p1._add(p2)._divideBy(2)._subtract(this._startCenter);
            if (1 === this._scale) return;
            if (!this._moved) {
                L.DomUtil.addClass(map._mapPane, "leaflet-touching");
                map.fire("movestart").fire("zoomstart");
                this._moved = true;
            }
            L.Util.cancelAnimFrame(this._animRequest);
            this._animRequest = L.Util.requestAnimFrame(this._updateOnMove, this, true, this._map._container);
            L.DomEvent.preventDefault(e);
        },
        _updateOnMove: function() {
            var map = this._map, origin = this._getScaleOrigin(), center = map.layerPointToLatLng(origin), zoom = map.getScaleZoom(this._scale);
            map._animateZoom(center, zoom, this._startCenter, this._scale, this._delta);
        },
        _onTouchEnd: function() {
            if (!this._moved || !this._zooming) {
                this._zooming = false;
                return;
            }
            var map = this._map;
            this._zooming = false;
            L.DomUtil.removeClass(map._mapPane, "leaflet-touching");
            L.Util.cancelAnimFrame(this._animRequest);
            L.DomEvent.off(document, "touchmove", this._onTouchMove).off(document, "touchend", this._onTouchEnd);
            var origin = this._getScaleOrigin(), center = map.layerPointToLatLng(origin), oldZoom = map.getZoom(), floatZoomDelta = map.getScaleZoom(this._scale) - oldZoom, roundZoomDelta = floatZoomDelta > 0 ? Math.ceil(floatZoomDelta) : Math.floor(floatZoomDelta), zoom = map._limitZoom(oldZoom + roundZoomDelta), scale = map.getZoomScale(zoom) / this._scale;
            map._animateZoom(center, zoom, origin, scale);
        },
        _getScaleOrigin: function() {
            var centerOffset = this._centerOffset.subtract(this._delta).divideBy(this._scale);
            return this._startCenter.add(centerOffset);
        }
    });
    L.Map.addInitHook("addHandler", "touchZoom", L.Map.TouchZoom);
    L.Map.mergeOptions({
        tap: true,
        tapTolerance: 15
    });
    L.Map.Tap = L.Handler.extend({
        addHooks: function() {
            L.DomEvent.on(this._map._container, "touchstart", this._onDown, this);
        },
        removeHooks: function() {
            L.DomEvent.off(this._map._container, "touchstart", this._onDown, this);
        },
        _onDown: function(e) {
            if (!e.touches) return;
            L.DomEvent.preventDefault(e);
            this._fireClick = true;
            if (e.touches.length > 1) {
                this._fireClick = false;
                clearTimeout(this._holdTimeout);
                return;
            }
            var first = e.touches[0], el = first.target;
            this._startPos = this._newPos = new L.Point(first.clientX, first.clientY);
            "a" === el.tagName.toLowerCase() && L.DomUtil.addClass(el, "leaflet-active");
            this._holdTimeout = setTimeout(L.bind(function() {
                if (this._isTapValid()) {
                    this._fireClick = false;
                    this._onUp();
                    this._simulateEvent("contextmenu", first);
                }
            }, this), 1e3);
            L.DomEvent.on(document, "touchmove", this._onMove, this).on(document, "touchend", this._onUp, this);
        },
        _onUp: function(e) {
            clearTimeout(this._holdTimeout);
            L.DomEvent.off(document, "touchmove", this._onMove, this).off(document, "touchend", this._onUp, this);
            if (this._fireClick && e && e.changedTouches) {
                var first = e.changedTouches[0], el = first.target;
                "a" === el.tagName.toLowerCase() && L.DomUtil.removeClass(el, "leaflet-active");
                this._isTapValid() && this._simulateEvent("click", first);
            }
        },
        _isTapValid: function() {
            return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
        },
        _onMove: function(e) {
            var first = e.touches[0];
            this._newPos = new L.Point(first.clientX, first.clientY);
        },
        _simulateEvent: function(type, e) {
            var simulatedEvent = document.createEvent("MouseEvents");
            simulatedEvent._simulated = true;
            e.target._simulatedClick = true;
            simulatedEvent.initMouseEvent(type, true, true, window, 1, e.screenX, e.screenY, e.clientX, e.clientY, false, false, false, false, 0, null);
            e.target.dispatchEvent(simulatedEvent);
        }
    });
    L.Browser.touch && !L.Browser.msTouch && L.Map.addInitHook("addHandler", "tap", L.Map.Tap);
    L.Map.mergeOptions({
        boxZoom: true
    });
    L.Map.BoxZoom = L.Handler.extend({
        initialize: function(map) {
            this._map = map;
            this._container = map._container;
            this._pane = map._panes.overlayPane;
        },
        addHooks: function() {
            L.DomEvent.on(this._container, "mousedown", this._onMouseDown, this);
        },
        removeHooks: function() {
            L.DomEvent.off(this._container, "mousedown", this._onMouseDown);
        },
        _onMouseDown: function(e) {
            if (!e.shiftKey || 1 !== e.which && 1 !== e.button) return false;
            L.DomUtil.disableTextSelection();
            L.DomUtil.disableImageDrag();
            this._startLayerPoint = this._map.mouseEventToLayerPoint(e);
            this._box = L.DomUtil.create("div", "leaflet-zoom-box", this._pane);
            L.DomUtil.setPosition(this._box, this._startLayerPoint);
            this._container.style.cursor = "crosshair";
            L.DomEvent.on(document, "mousemove", this._onMouseMove, this).on(document, "mouseup", this._onMouseUp, this).on(document, "keydown", this._onKeyDown, this);
            this._map.fire("boxzoomstart");
        },
        _onMouseMove: function(e) {
            var startPoint = this._startLayerPoint, box = this._box, layerPoint = this._map.mouseEventToLayerPoint(e), offset = layerPoint.subtract(startPoint), newPos = new L.Point(Math.min(layerPoint.x, startPoint.x), Math.min(layerPoint.y, startPoint.y));
            L.DomUtil.setPosition(box, newPos);
            box.style.width = Math.max(0, Math.abs(offset.x) - 4) + "px";
            box.style.height = Math.max(0, Math.abs(offset.y) - 4) + "px";
        },
        _finish: function() {
            this._pane.removeChild(this._box);
            this._container.style.cursor = "";
            L.DomUtil.enableTextSelection();
            L.DomUtil.enableImageDrag();
            L.DomEvent.off(document, "mousemove", this._onMouseMove).off(document, "mouseup", this._onMouseUp).off(document, "keydown", this._onKeyDown);
        },
        _onMouseUp: function(e) {
            this._finish();
            var map = this._map, layerPoint = map.mouseEventToLayerPoint(e);
            if (this._startLayerPoint.equals(layerPoint)) return;
            var bounds = new L.LatLngBounds(map.layerPointToLatLng(this._startLayerPoint), map.layerPointToLatLng(layerPoint));
            map.fitBounds(bounds);
            map.fire("boxzoomend", {
                boxZoomBounds: bounds
            });
        },
        _onKeyDown: function(e) {
            27 === e.keyCode && this._finish();
        }
    });
    L.Map.addInitHook("addHandler", "boxZoom", L.Map.BoxZoom);
    L.Map.mergeOptions({
        keyboard: true,
        keyboardPanOffset: 80,
        keyboardZoomOffset: 1
    });
    L.Map.Keyboard = L.Handler.extend({
        keyCodes: {
            left: [ 37 ],
            right: [ 39 ],
            down: [ 40 ],
            up: [ 38 ],
            zoomIn: [ 187, 107, 61 ],
            zoomOut: [ 189, 109, 173 ]
        },
        initialize: function(map) {
            this._map = map;
            this._setPanOffset(map.options.keyboardPanOffset);
            this._setZoomOffset(map.options.keyboardZoomOffset);
        },
        addHooks: function() {
            var container = this._map._container;
            -1 === container.tabIndex && (container.tabIndex = "0");
            L.DomEvent.on(container, "focus", this._onFocus, this).on(container, "blur", this._onBlur, this).on(container, "mousedown", this._onMouseDown, this);
            this._map.on("focus", this._addHooks, this).on("blur", this._removeHooks, this);
        },
        removeHooks: function() {
            this._removeHooks();
            var container = this._map._container;
            L.DomEvent.off(container, "focus", this._onFocus, this).off(container, "blur", this._onBlur, this).off(container, "mousedown", this._onMouseDown, this);
            this._map.off("focus", this._addHooks, this).off("blur", this._removeHooks, this);
        },
        _onMouseDown: function() {
            if (this._focused) return;
            var body = document.body, docEl = document.documentElement, top = body.scrollTop || docEl.scrollTop, left = body.scrollTop || docEl.scrollLeft;
            this._map._container.focus();
            window.scrollTo(left, top);
        },
        _onFocus: function() {
            this._focused = true;
            this._map.fire("focus");
        },
        _onBlur: function() {
            this._focused = false;
            this._map.fire("blur");
        },
        _setPanOffset: function(pan) {
            var i, len, keys = this._panKeys = {}, codes = this.keyCodes;
            for (i = 0, len = codes.left.length; len > i; i++) keys[codes.left[i]] = [ -1 * pan, 0 ];
            for (i = 0, len = codes.right.length; len > i; i++) keys[codes.right[i]] = [ pan, 0 ];
            for (i = 0, len = codes.down.length; len > i; i++) keys[codes.down[i]] = [ 0, pan ];
            for (i = 0, len = codes.up.length; len > i; i++) keys[codes.up[i]] = [ 0, -1 * pan ];
        },
        _setZoomOffset: function(zoom) {
            var i, len, keys = this._zoomKeys = {}, codes = this.keyCodes;
            for (i = 0, len = codes.zoomIn.length; len > i; i++) keys[codes.zoomIn[i]] = zoom;
            for (i = 0, len = codes.zoomOut.length; len > i; i++) keys[codes.zoomOut[i]] = -zoom;
        },
        _addHooks: function() {
            L.DomEvent.on(document, "keydown", this._onKeyDown, this);
        },
        _removeHooks: function() {
            L.DomEvent.off(document, "keydown", this._onKeyDown, this);
        },
        _onKeyDown: function(e) {
            var key = e.keyCode, map = this._map;
            if (key in this._panKeys) {
                if (map._panAnim && map._panAnim._inProgress) return;
                map.panBy(this._panKeys[key]);
                map.options.maxBounds && map.panInsideBounds(map.options.maxBounds);
            } else {
                if (!(key in this._zoomKeys)) return;
                map.setZoom(map.getZoom() + this._zoomKeys[key]);
            }
            L.DomEvent.stop(e);
        }
    });
    L.Map.addInitHook("addHandler", "keyboard", L.Map.Keyboard);
    L.Handler.MarkerDrag = L.Handler.extend({
        initialize: function(marker) {
            this._marker = marker;
        },
        addHooks: function() {
            var icon = this._marker._icon;
            this._draggable || (this._draggable = new L.Draggable(icon, icon));
            this._draggable.on("dragstart", this._onDragStart, this).on("drag", this._onDrag, this).on("dragend", this._onDragEnd, this);
            this._draggable.enable();
        },
        removeHooks: function() {
            this._draggable.off("dragstart", this._onDragStart, this).off("drag", this._onDrag, this).off("dragend", this._onDragEnd, this);
            this._draggable.disable();
        },
        moved: function() {
            return this._draggable && this._draggable._moved;
        },
        _onDragStart: function() {
            this._marker.closePopup().fire("movestart").fire("dragstart");
        },
        _onDrag: function() {
            var marker = this._marker, shadow = marker._shadow, iconPos = L.DomUtil.getPosition(marker._icon), latlng = marker._map.layerPointToLatLng(iconPos);
            shadow && L.DomUtil.setPosition(shadow, iconPos);
            marker._latlng = latlng;
            marker.fire("move", {
                latlng: latlng
            }).fire("drag");
        },
        _onDragEnd: function() {
            this._marker.fire("moveend").fire("dragend");
        }
    });
    L.Control = L.Class.extend({
        options: {
            position: "topright"
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        getPosition: function() {
            return this.options.position;
        },
        setPosition: function(position) {
            var map = this._map;
            map && map.removeControl(this);
            this.options.position = position;
            map && map.addControl(this);
            return this;
        },
        getContainer: function() {
            return this._container;
        },
        addTo: function(map) {
            this._map = map;
            var container = this._container = this.onAdd(map), pos = this.getPosition(), corner = map._controlCorners[pos];
            L.DomUtil.addClass(container, "leaflet-control");
            -1 !== pos.indexOf("bottom") ? corner.insertBefore(container, corner.firstChild) : corner.appendChild(container);
            return this;
        },
        removeFrom: function(map) {
            var pos = this.getPosition(), corner = map._controlCorners[pos];
            corner.removeChild(this._container);
            this._map = null;
            this.onRemove && this.onRemove(map);
            return this;
        }
    });
    L.control = function(options) {
        return new L.Control(options);
    };
    L.Map.include({
        addControl: function(control) {
            control.addTo(this);
            return this;
        },
        removeControl: function(control) {
            control.removeFrom(this);
            return this;
        },
        _initControlPos: function() {
            function createCorner(vSide, hSide) {
                var className = l + vSide + " " + l + hSide;
                corners[vSide + hSide] = L.DomUtil.create("div", className, container);
            }
            var corners = this._controlCorners = {}, l = "leaflet-", container = this._controlContainer = L.DomUtil.create("div", l + "control-container", this._container);
            createCorner("top", "left");
            createCorner("top", "right");
            createCorner("bottom", "left");
            createCorner("bottom", "right");
        },
        _clearControlPos: function() {
            this._container.removeChild(this._controlContainer);
        }
    });
    L.Control.Zoom = L.Control.extend({
        options: {
            position: "topleft"
        },
        onAdd: function(map) {
            var zoomName = "leaflet-control-zoom", container = L.DomUtil.create("div", zoomName + " leaflet-bar");
            this._map = map;
            this._zoomInButton = this._createButton("+", "Zoom in", zoomName + "-in", container, this._zoomIn, this);
            this._zoomOutButton = this._createButton("-", "Zoom out", zoomName + "-out", container, this._zoomOut, this);
            map.on("zoomend zoomlevelschange", this._updateDisabled, this);
            return container;
        },
        onRemove: function(map) {
            map.off("zoomend zoomlevelschange", this._updateDisabled, this);
        },
        _zoomIn: function(e) {
            this._map.zoomIn(e.shiftKey ? 3 : 1);
        },
        _zoomOut: function(e) {
            this._map.zoomOut(e.shiftKey ? 3 : 1);
        },
        _createButton: function(html, title, className, container, fn, context) {
            var link = L.DomUtil.create("a", className, container);
            link.innerHTML = html;
            link.href = "#";
            link.title = title;
            var stop = L.DomEvent.stopPropagation;
            L.DomEvent.on(link, "click", stop).on(link, "mousedown", stop).on(link, "dblclick", stop).on(link, "click", L.DomEvent.preventDefault).on(link, "click", fn, context);
            return link;
        },
        _updateDisabled: function() {
            var map = this._map, className = "leaflet-disabled";
            L.DomUtil.removeClass(this._zoomInButton, className);
            L.DomUtil.removeClass(this._zoomOutButton, className);
            map._zoom === map.getMinZoom() && L.DomUtil.addClass(this._zoomOutButton, className);
            map._zoom === map.getMaxZoom() && L.DomUtil.addClass(this._zoomInButton, className);
        }
    });
    L.Map.mergeOptions({
        zoomControl: true
    });
    L.Map.addInitHook(function() {
        if (this.options.zoomControl) {
            this.zoomControl = new L.Control.Zoom();
            this.addControl(this.zoomControl);
        }
    });
    L.control.zoom = function(options) {
        return new L.Control.Zoom(options);
    };
    L.Control.Attribution = L.Control.extend({
        options: {
            position: "bottomright",
            prefix: '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>'
        },
        initialize: function(options) {
            L.setOptions(this, options);
            this._attributions = {};
        },
        onAdd: function(map) {
            this._container = L.DomUtil.create("div", "leaflet-control-attribution");
            L.DomEvent.disableClickPropagation(this._container);
            map.on("layeradd", this._onLayerAdd, this).on("layerremove", this._onLayerRemove, this);
            this._update();
            return this._container;
        },
        onRemove: function(map) {
            map.off("layeradd", this._onLayerAdd).off("layerremove", this._onLayerRemove);
        },
        setPrefix: function(prefix) {
            this.options.prefix = prefix;
            this._update();
            return this;
        },
        addAttribution: function(text) {
            if (!text) return;
            this._attributions[text] || (this._attributions[text] = 0);
            this._attributions[text]++;
            this._update();
            return this;
        },
        removeAttribution: function(text) {
            if (!text) return;
            if (this._attributions[text]) {
                this._attributions[text]--;
                this._update();
            }
            return this;
        },
        _update: function() {
            if (!this._map) return;
            var attribs = [];
            for (var i in this._attributions) this._attributions[i] && attribs.push(i);
            var prefixAndAttribs = [];
            this.options.prefix && prefixAndAttribs.push(this.options.prefix);
            attribs.length && prefixAndAttribs.push(attribs.join(", "));
            this._container.innerHTML = prefixAndAttribs.join(" | ");
        },
        _onLayerAdd: function(e) {
            e.layer.getAttribution && this.addAttribution(e.layer.getAttribution());
        },
        _onLayerRemove: function(e) {
            e.layer.getAttribution && this.removeAttribution(e.layer.getAttribution());
        }
    });
    L.Map.mergeOptions({
        attributionControl: true
    });
    L.Map.addInitHook(function() {
        this.options.attributionControl && (this.attributionControl = new L.Control.Attribution().addTo(this));
    });
    L.control.attribution = function(options) {
        return new L.Control.Attribution(options);
    };
    L.Control.Scale = L.Control.extend({
        options: {
            position: "bottomleft",
            maxWidth: 100,
            metric: true,
            imperial: true,
            updateWhenIdle: false
        },
        onAdd: function(map) {
            this._map = map;
            var className = "leaflet-control-scale", container = L.DomUtil.create("div", className), options = this.options;
            this._addScales(options, className, container);
            map.on(options.updateWhenIdle ? "moveend" : "move", this._update, this);
            map.whenReady(this._update, this);
            return container;
        },
        onRemove: function(map) {
            map.off(this.options.updateWhenIdle ? "moveend" : "move", this._update, this);
        },
        _addScales: function(options, className, container) {
            options.metric && (this._mScale = L.DomUtil.create("div", className + "-line", container));
            options.imperial && (this._iScale = L.DomUtil.create("div", className + "-line", container));
        },
        _update: function() {
            var bounds = this._map.getBounds(), centerLat = bounds.getCenter().lat, halfWorldMeters = 6378137 * Math.PI * Math.cos(centerLat * Math.PI / 180), dist = halfWorldMeters * (bounds.getNorthEast().lng - bounds.getSouthWest().lng) / 180, size = this._map.getSize(), options = this.options, maxMeters = 0;
            size.x > 0 && (maxMeters = dist * (options.maxWidth / size.x));
            this._updateScales(options, maxMeters);
        },
        _updateScales: function(options, maxMeters) {
            options.metric && maxMeters && this._updateMetric(maxMeters);
            options.imperial && maxMeters && this._updateImperial(maxMeters);
        },
        _updateMetric: function(maxMeters) {
            var meters = this._getRoundNum(maxMeters);
            this._mScale.style.width = this._getScaleWidth(meters / maxMeters) + "px";
            this._mScale.innerHTML = 1e3 > meters ? meters + " m" : meters / 1e3 + " km";
        },
        _updateImperial: function(maxMeters) {
            var maxMiles, miles, feet, maxFeet = 3.2808399 * maxMeters, scale = this._iScale;
            if (maxFeet > 5280) {
                maxMiles = maxFeet / 5280;
                miles = this._getRoundNum(maxMiles);
                scale.style.width = this._getScaleWidth(miles / maxMiles) + "px";
                scale.innerHTML = miles + " mi";
            } else {
                feet = this._getRoundNum(maxFeet);
                scale.style.width = this._getScaleWidth(feet / maxFeet) + "px";
                scale.innerHTML = feet + " ft";
            }
        },
        _getScaleWidth: function(ratio) {
            return Math.round(this.options.maxWidth * ratio) - 10;
        },
        _getRoundNum: function(num) {
            var pow10 = Math.pow(10, (Math.floor(num) + "").length - 1), d = num / pow10;
            d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;
            return pow10 * d;
        }
    });
    L.control.scale = function(options) {
        return new L.Control.Scale(options);
    };
    L.Control.Layers = L.Control.extend({
        options: {
            collapsed: true,
            position: "topright",
            autoZIndex: true
        },
        initialize: function(baseLayers, overlays, options) {
            L.setOptions(this, options);
            this._layers = {};
            this._lastZIndex = 0;
            this._handlingClick = false;
            for (var i in baseLayers) this._addLayer(baseLayers[i], i);
            for (i in overlays) this._addLayer(overlays[i], i, true);
        },
        onAdd: function(map) {
            this._initLayout();
            this._update();
            map.on("layeradd", this._onLayerChange, this).on("layerremove", this._onLayerChange, this);
            return this._container;
        },
        onRemove: function(map) {
            map.off("layeradd", this._onLayerChange).off("layerremove", this._onLayerChange);
        },
        addBaseLayer: function(layer, name) {
            this._addLayer(layer, name);
            this._update();
            return this;
        },
        addOverlay: function(layer, name) {
            this._addLayer(layer, name, true);
            this._update();
            return this;
        },
        removeLayer: function(layer) {
            var id = L.stamp(layer);
            delete this._layers[id];
            this._update();
            return this;
        },
        _initLayout: function() {
            var className = "leaflet-control-layers", container = this._container = L.DomUtil.create("div", className);
            container.setAttribute("aria-haspopup", true);
            if (L.Browser.touch) L.DomEvent.on(container, "click", L.DomEvent.stopPropagation); else {
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.on(container, "mousewheel", L.DomEvent.stopPropagation);
            }
            var form = this._form = L.DomUtil.create("form", className + "-list");
            if (this.options.collapsed) {
                L.Browser.android || L.DomEvent.on(container, "mouseover", this._expand, this).on(container, "mouseout", this._collapse, this);
                var link = this._layersLink = L.DomUtil.create("a", className + "-toggle", container);
                link.href = "#";
                link.title = "Layers";
                L.Browser.touch ? L.DomEvent.on(link, "click", L.DomEvent.stop).on(link, "click", this._expand, this) : L.DomEvent.on(link, "focus", this._expand, this);
                this._map.on("click", this._collapse, this);
            } else this._expand();
            this._baseLayersList = L.DomUtil.create("div", className + "-base", form);
            this._separator = L.DomUtil.create("div", className + "-separator", form);
            this._overlaysList = L.DomUtil.create("div", className + "-overlays", form);
            container.appendChild(form);
        },
        _addLayer: function(layer, name, overlay) {
            var id = L.stamp(layer);
            this._layers[id] = {
                layer: layer,
                name: name,
                overlay: overlay
            };
            if (this.options.autoZIndex && layer.setZIndex) {
                this._lastZIndex++;
                layer.setZIndex(this._lastZIndex);
            }
        },
        _update: function() {
            if (!this._container) return;
            this._baseLayersList.innerHTML = "";
            this._overlaysList.innerHTML = "";
            var i, obj, baseLayersPresent = false, overlaysPresent = false;
            for (i in this._layers) {
                obj = this._layers[i];
                this._addItem(obj);
                overlaysPresent = overlaysPresent || obj.overlay;
                baseLayersPresent = baseLayersPresent || !obj.overlay;
            }
            this._separator.style.display = overlaysPresent && baseLayersPresent ? "" : "none";
        },
        _onLayerChange: function(e) {
            var obj = this._layers[L.stamp(e.layer)];
            if (!obj) return;
            this._handlingClick || this._update();
            var type = obj.overlay ? "layeradd" === e.type ? "overlayadd" : "overlayremove" : "layeradd" === e.type ? "baselayerchange" : null;
            type && this._map.fire(type, obj);
        },
        _createRadioElement: function(name, checked) {
            var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"';
            checked && (radioHtml += ' checked="checked"');
            radioHtml += "/>";
            var radioFragment = document.createElement("div");
            radioFragment.innerHTML = radioHtml;
            return radioFragment.firstChild;
        },
        _addItem: function(obj) {
            var input, label = document.createElement("label"), checked = this._map.hasLayer(obj.layer);
            if (obj.overlay) {
                input = document.createElement("input");
                input.type = "checkbox";
                input.className = "leaflet-control-layers-selector";
                input.defaultChecked = checked;
            } else input = this._createRadioElement("leaflet-base-layers", checked);
            input.layerId = L.stamp(obj.layer);
            L.DomEvent.on(input, "click", this._onInputClick, this);
            var name = document.createElement("span");
            name.innerHTML = " " + obj.name;
            label.appendChild(input);
            label.appendChild(name);
            var container = obj.overlay ? this._overlaysList : this._baseLayersList;
            container.appendChild(label);
            return label;
        },
        _onInputClick: function() {
            var i, input, obj, inputs = this._form.getElementsByTagName("input"), inputsLen = inputs.length;
            this._handlingClick = true;
            for (i = 0; inputsLen > i; i++) {
                input = inputs[i];
                obj = this._layers[input.layerId];
                input.checked && !this._map.hasLayer(obj.layer) ? this._map.addLayer(obj.layer) : !input.checked && this._map.hasLayer(obj.layer) && this._map.removeLayer(obj.layer);
            }
            this._handlingClick = false;
        },
        _expand: function() {
            L.DomUtil.addClass(this._container, "leaflet-control-layers-expanded");
        },
        _collapse: function() {
            this._container.className = this._container.className.replace(" leaflet-control-layers-expanded", "");
        }
    });
    L.control.layers = function(baseLayers, overlays, options) {
        return new L.Control.Layers(baseLayers, overlays, options);
    };
    L.PosAnimation = L.Class.extend({
        includes: L.Mixin.Events,
        run: function(el, newPos, duration, easeLinearity) {
            this.stop();
            this._el = el;
            this._inProgress = true;
            this._newPos = newPos;
            this.fire("start");
            el.style[L.DomUtil.TRANSITION] = "all " + (duration || .25) + "s cubic-bezier(0,0," + (easeLinearity || .5) + ",1)";
            L.DomEvent.on(el, L.DomUtil.TRANSITION_END, this._onTransitionEnd, this);
            L.DomUtil.setPosition(el, newPos);
            L.Util.falseFn(el.offsetWidth);
            this._stepTimer = setInterval(L.bind(this._onStep, this), 50);
        },
        stop: function() {
            if (!this._inProgress) return;
            L.DomUtil.setPosition(this._el, this._getPos());
            this._onTransitionEnd();
            L.Util.falseFn(this._el.offsetWidth);
        },
        _onStep: function() {
            var stepPos = this._getPos();
            if (!stepPos) {
                this._onTransitionEnd();
                return;
            }
            this._el._leaflet_pos = stepPos;
            this.fire("step");
        },
        _transformRe: /([-+]?(?:\d*\.)?\d+)\D*, ([-+]?(?:\d*\.)?\d+)\D*\)/,
        _getPos: function() {
            var left, top, matches, el = this._el, style = window.getComputedStyle(el);
            if (L.Browser.any3d) {
                matches = style[L.DomUtil.TRANSFORM].match(this._transformRe);
                if (!matches) return;
                left = parseFloat(matches[1]);
                top = parseFloat(matches[2]);
            } else {
                left = parseFloat(style.left);
                top = parseFloat(style.top);
            }
            return new L.Point(left, top, true);
        },
        _onTransitionEnd: function() {
            L.DomEvent.off(this._el, L.DomUtil.TRANSITION_END, this._onTransitionEnd, this);
            if (!this._inProgress) return;
            this._inProgress = false;
            this._el.style[L.DomUtil.TRANSITION] = "";
            this._el._leaflet_pos = this._newPos;
            clearInterval(this._stepTimer);
            this.fire("step").fire("end");
        }
    });
    L.Map.include({
        setView: function(center, zoom, options) {
            zoom = this._limitZoom(zoom);
            center = L.latLng(center);
            options = options || {};
            this._panAnim && this._panAnim.stop();
            if (this._loaded && !options.reset && true !== options) {
                if (options.animate !== undefined) {
                    options.zoom = L.extend({
                        animate: options.animate
                    }, options.zoom);
                    options.pan = L.extend({
                        animate: options.animate
                    }, options.pan);
                }
                var animated = this._zoom !== zoom ? this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom, options.zoom) : this._tryAnimatedPan(center, options.pan);
                if (animated) {
                    clearTimeout(this._sizeTimer);
                    return this;
                }
            }
            this._resetView(center, zoom);
            return this;
        },
        panBy: function(offset, options) {
            offset = L.point(offset).round();
            options = options || {};
            if (!offset.x && !offset.y) return this;
            if (!this._panAnim) {
                this._panAnim = new L.PosAnimation();
                this._panAnim.on({
                    step: this._onPanTransitionStep,
                    end: this._onPanTransitionEnd
                }, this);
            }
            options.noMoveStart || this.fire("movestart");
            if (false !== options.animate) {
                L.DomUtil.addClass(this._mapPane, "leaflet-pan-anim");
                var newPos = this._getMapPanePos().subtract(offset);
                this._panAnim.run(this._mapPane, newPos, options.duration || .25, options.easeLinearity);
            } else {
                this._rawPanBy(offset);
                this.fire("move").fire("moveend");
            }
            return this;
        },
        _onPanTransitionStep: function() {
            this.fire("move");
        },
        _onPanTransitionEnd: function() {
            L.DomUtil.removeClass(this._mapPane, "leaflet-pan-anim");
            this.fire("moveend");
        },
        _tryAnimatedPan: function(center, options) {
            var offset = this._getCenterOffset(center)._floor();
            if (true !== (options && options.animate) && !this.getSize().contains(offset)) return false;
            this.panBy(offset, options);
            return true;
        }
    });
    L.PosAnimation = L.DomUtil.TRANSITION ? L.PosAnimation : L.PosAnimation.extend({
        run: function(el, newPos, duration, easeLinearity) {
            this.stop();
            this._el = el;
            this._inProgress = true;
            this._duration = duration || .25;
            this._easeOutPower = 1 / Math.max(easeLinearity || .5, .2);
            this._startPos = L.DomUtil.getPosition(el);
            this._offset = newPos.subtract(this._startPos);
            this._startTime = +new Date();
            this.fire("start");
            this._animate();
        },
        stop: function() {
            if (!this._inProgress) return;
            this._step();
            this._complete();
        },
        _animate: function() {
            this._animId = L.Util.requestAnimFrame(this._animate, this);
            this._step();
        },
        _step: function() {
            var elapsed = +new Date() - this._startTime, duration = 1e3 * this._duration;
            if (duration > elapsed) this._runFrame(this._easeOut(elapsed / duration)); else {
                this._runFrame(1);
                this._complete();
            }
        },
        _runFrame: function(progress) {
            var pos = this._startPos.add(this._offset.multiplyBy(progress));
            L.DomUtil.setPosition(this._el, pos);
            this.fire("step");
        },
        _complete: function() {
            L.Util.cancelAnimFrame(this._animId);
            this._inProgress = false;
            this.fire("end");
        },
        _easeOut: function(t) {
            return 1 - Math.pow(1 - t, this._easeOutPower);
        }
    });
    L.Map.mergeOptions({
        zoomAnimation: true,
        zoomAnimationThreshold: 4
    });
    L.DomUtil.TRANSITION && L.Map.addInitHook(function() {
        this._zoomAnimated = this.options.zoomAnimation && L.DomUtil.TRANSITION && L.Browser.any3d && !L.Browser.android23 && !L.Browser.mobileOpera;
        this._zoomAnimated && L.DomEvent.on(this._mapPane, L.DomUtil.TRANSITION_END, this._catchTransitionEnd, this);
    });
    L.Map.include(L.DomUtil.TRANSITION ? {
        _catchTransitionEnd: function() {
            this._animatingZoom && this._onZoomTransitionEnd();
        },
        _nothingToAnimate: function() {
            return !this._container.getElementsByClassName("leaflet-zoom-animated").length;
        },
        _tryAnimatedZoom: function(center, zoom, options) {
            if (this._animatingZoom) return true;
            options = options || {};
            if (!this._zoomAnimated || false === options.animate || this._nothingToAnimate() || Math.abs(zoom - this._zoom) > this.options.zoomAnimationThreshold) return false;
            var scale = this.getZoomScale(zoom), offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale), origin = this._getCenterLayerPoint()._add(offset);
            if (true !== options.animate && !this.getSize().contains(offset)) return false;
            this.fire("movestart").fire("zoomstart");
            this._animateZoom(center, zoom, origin, scale, null, true);
            return true;
        },
        _animateZoom: function(center, zoom, origin, scale, delta, backwards) {
            this._animatingZoom = true;
            L.DomUtil.addClass(this._mapPane, "leaflet-zoom-anim");
            this._animateToCenter = center;
            this._animateToZoom = zoom;
            L.Draggable && (L.Draggable._disabled = true);
            this.fire("zoomanim", {
                center: center,
                zoom: zoom,
                origin: origin,
                scale: scale,
                delta: delta,
                backwards: backwards
            });
        },
        _onZoomTransitionEnd: function() {
            this._animatingZoom = false;
            L.DomUtil.removeClass(this._mapPane, "leaflet-zoom-anim");
            this._resetView(this._animateToCenter, this._animateToZoom, true, true);
            L.Draggable && (L.Draggable._disabled = false);
        }
    } : {});
    L.TileLayer.include({
        _animateZoom: function(e) {
            if (!this._animating) {
                this._animating = true;
                this._prepareBgBuffer();
            }
            var bg = this._bgBuffer, transform = L.DomUtil.TRANSFORM, initialTransform = e.delta ? L.DomUtil.getTranslateString(e.delta) : bg.style[transform], scaleStr = L.DomUtil.getScaleString(e.scale, e.origin);
            bg.style[transform] = e.backwards ? scaleStr + " " + initialTransform : initialTransform + " " + scaleStr;
        },
        _endZoomAnim: function() {
            var front = this._tileContainer, bg = this._bgBuffer;
            front.style.visibility = "";
            front.parentNode.appendChild(front);
            L.Util.falseFn(bg.offsetWidth);
            this._animating = false;
        },
        _clearBgBuffer: function() {
            var map = this._map;
            if (map && !map._animatingZoom && !map.touchZoom._zooming) {
                this._bgBuffer.innerHTML = "";
                this._bgBuffer.style[L.DomUtil.TRANSFORM] = "";
            }
        },
        _prepareBgBuffer: function() {
            var front = this._tileContainer, bg = this._bgBuffer;
            var bgLoaded = this._getLoadedTilesPercentage(bg), frontLoaded = this._getLoadedTilesPercentage(front);
            if (bg && bgLoaded > .5 && .5 > frontLoaded) {
                front.style.visibility = "hidden";
                this._stopLoadingImages(front);
                return;
            }
            bg.style.visibility = "hidden";
            bg.style[L.DomUtil.TRANSFORM] = "";
            this._tileContainer = bg;
            bg = this._bgBuffer = front;
            this._stopLoadingImages(bg);
            clearTimeout(this._clearBgBufferTimer);
        },
        _getLoadedTilesPercentage: function(container) {
            var i, len, tiles = container.getElementsByTagName("img"), count = 0;
            for (i = 0, len = tiles.length; len > i; i++) tiles[i].complete && count++;
            return count / len;
        },
        _stopLoadingImages: function(container) {
            var i, len, tile, tiles = Array.prototype.slice.call(container.getElementsByTagName("img"));
            for (i = 0, len = tiles.length; len > i; i++) {
                tile = tiles[i];
                if (!tile.complete) {
                    tile.onload = L.Util.falseFn;
                    tile.onerror = L.Util.falseFn;
                    tile.src = L.Util.emptyImageUrl;
                    tile.parentNode.removeChild(tile);
                }
            }
        }
    });
    L.Map.include({
        _defaultLocateOptions: {
            watch: false,
            setView: false,
            maxZoom: 1/0,
            timeout: 1e4,
            maximumAge: 0,
            enableHighAccuracy: false
        },
        locate: function(options) {
            options = this._locateOptions = L.extend(this._defaultLocateOptions, options);
            if (!navigator.geolocation) {
                this._handleGeolocationError({
                    code: 0,
                    message: "Geolocation not supported."
                });
                return this;
            }
            var onResponse = L.bind(this._handleGeolocationResponse, this), onError = L.bind(this._handleGeolocationError, this);
            options.watch ? this._locationWatchId = navigator.geolocation.watchPosition(onResponse, onError, options) : navigator.geolocation.getCurrentPosition(onResponse, onError, options);
            return this;
        },
        stopLocate: function() {
            navigator.geolocation && navigator.geolocation.clearWatch(this._locationWatchId);
            this._locateOptions && (this._locateOptions.setView = false);
            return this;
        },
        _handleGeolocationError: function(error) {
            var c = error.code, message = error.message || (1 === c ? "permission denied" : 2 === c ? "position unavailable" : "timeout");
            this._locateOptions.setView && !this._loaded && this.fitWorld();
            this.fire("locationerror", {
                code: c,
                message: "Geolocation error: " + message + "."
            });
        },
        _handleGeolocationResponse: function(pos) {
            var lat = pos.coords.latitude, lng = pos.coords.longitude, latlng = new L.LatLng(lat, lng), latAccuracy = 180 * pos.coords.accuracy / 40075017, lngAccuracy = latAccuracy / Math.cos(L.LatLng.DEG_TO_RAD * lat), bounds = L.latLngBounds([ lat - latAccuracy, lng - lngAccuracy ], [ lat + latAccuracy, lng + lngAccuracy ]), options = this._locateOptions;
            if (options.setView) {
                var zoom = Math.min(this.getBoundsZoom(bounds), options.maxZoom);
                this.setView(latlng, zoom);
            }
            var data = {
                latlng: latlng,
                bounds: bounds
            };
            for (var i in pos.coords) "number" == typeof pos.coords[i] && (data[i] = pos.coords[i]);
            this.fire("locationfound", data);
        }
    });
})(window, document);