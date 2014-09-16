$(function() {

    var colors = [
        {h: 0,  s:80, l:50},
        {h: 30,  s:80, l:50},
        {h: 60, s:80, l:50},
        {h: 120, s:80, l:50},
        {h: 208, s:80, l:50},
        {h: 272, s: 80, l: 50},
        {h: 328, s: 80, l: 50},
        {h: 0,   s:0,   l:50}
    ];

    var Color = Backbone.Model.extend({
        defaults: {h: 0, s: 0, l: 0}
    });

    var Colors = Backbone.Collection.extend({
        model: Color
    });

    var ColorView = Backbone.View.extend({
        initialize: function() {
            var that = this;
            this.$el.html('<div class="color"></div>');
            this.$el = this.$el.find('div');

            this.model.on('change', function() {
                that.render();
            });
        },
     
        render: function () {
            var newColor = "hsla(" + this.model.get('h') + ", " + this.model.get('s') + "%, " + this.model.get('l') + "%, 1)";
            this.$el.css("background-color", newColor);

            this.$el.removeClass('selected');
            if (this.model.get('selected')) {
                this.$el.addClass('selected');
            }

            return this;
        },

        events: function() {
            return MOBILE?
                {
                    "touchstart": "changeColor"
                } :
                {
                    "click": "changeColor"
                } ;
        },

        changeColor: function(e) {
            this.model.set('selected', true);
        }
    });

    var ColorPickerView = Backbone.View.extend({
        el: null,
        lines: [],
        selectedColorModel: null,
        selectedDColorModel: null,

        events: function() {
            return MOBILE?
                {
                    "touchstart": "stopPropagation"
                } :
                {
                    "mousedown": "stopPropagation"
                } ;
        },

        initialize: function () {
            _.bindAll(this, "callBackHandler", "mainColorSelected", "derivateColorSelected", "hide");

            this.collection = new Colors(colors);

            var dColors = $.merge([],colors);
            $.merge(dColors, colors);
            this.dCollection = new Colors(dColors);

            this.collection.on('change:selected', this.mainColorSelected);
            this.dCollection.on('change:selected', this.callBackHandler);
            this.dCollection.on('change:selected', this.derivateColorSelected);

            $(document).on(MOBILE?'touchstart':'mousedown', this.hide);

            this.render();
        },

        mainColorSelected: function(item) {
            if (!item.get('selected')) 
                return;

            if (this.selectedColorModel) {
                this.selectedColorModel.unset('selected');
            }
            this.selectedColorModel = item;

            this.updateDColors();

            if (this.selectedDColorModel) {
                // refresh selected color
                this.selectedDColorModel.unset('selected');
                this.selectedDColorModel.set('selected', true);
            }
        },

        derivateColorSelected: function(item) {
            if (!item.get('selected'))
                return;

            if (this.selectedDColorModel && this.selectedDColorModel != item) {
                this.selectedDColorModel.unset('selected');
            }
            this.selectedDColorModel = item;
        },

        updateDColors: function(item) {
            var start = this.selectedColorModel.get('l');
            var count = this.collection.length;
            var increment1 = start/count;
            var increment2 = start/(count+1);


            if (this.selectedColorModel.get('s') == 0) {
                increment1 = start/(count-1);
                increment2 = start/count;
            }

            var that = this;
            this.dCollection.each(function (item, i) {
                item.set(
                    {
                        h: that.selectedColorModel.get('h'), 
                        s: that.selectedColorModel.get('s'),
                        l: parseInt(i<count?start-i*increment1:start+(i+1-count)*increment2),
                    }
                );
            });
        },

        stopPropagation: function(e) {
            e.stopPropagation();
        },
     
        render: function () {
            this.$el = $('.colorPicker');
            if (this.$el.length == 0) {
                this.$el = $('<div class="colorPicker triangle-isosceles"></div>');
                $('body').append(this.$el);
            }
            this.$el.hide();
            this.$el.html('<div class="line-1"></div><div class="line-2"></div><div class="line-3"></div>');

            this.lines[0] = this.$el.find('.line-1');
            this.lines[1] = this.$el.find('.line-2');
            this.lines[2] = this.$el.find('.line-3');

            var that = this;

            this.collection.each(function (item) {
                that.renderColor(item, 0);
            });

            this.dCollection.each(function (item, i, all) {
                that.renderColor(item, i<all.length/2?1:2);
            });
        },

        renderColor: function (item, i) {
            var colorView = new ColorView({
                model: item
            });
            this.lines[i].append(colorView.render().el);
        },

        callBackHandler: function(item) {
            if (!this.callback) 
                return;

            if (!item.get('selected'))
                return;

            this.callback(item);
        },

        show: function(el, callback) {
            this.callback = callback;
            this.selectClosestColor(el);
            this.reposition(el);
            this.$el.show();
        },

        selectClosestColor: function(el) {
            var selectedColor = el.css('background-color');
            var arr = selectedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d*)/);
            selectedColor = rgbToHsl(arr[1], arr[2], arr[3]);

            var found = [null,500];

            this.collection.each(function (color) {
                var tmp = Math.abs(color.get('h') - selectedColor.h);
                if (tmp > 300) tmp = 360 - tmp;
                var dist = tmp + Math.abs(color.get('s') - selectedColor.s);
                if (dist < found[1]) {
                    found[0] = color;
                    found[1] = dist;
                }
            });

            found[0].set('selected', true);
            var found = [null,500];

            this.dCollection.each(function(color) {
                var dist = Math.abs(color.get('l') - selectedColor.l);
                if (dist < found[1]) {
                    found[0] = color;
                    found[1] = dist;
                }
            });
            found[0].set('selected', true);
        },

        reposition: function(el) {
            var position = el.offset();
            var size = {width: this.$el.width(), height: this.$el.height()};

            var classes = "";

            if (position.left-size.width < 0) {
                this.$el.removeClass('right');
                this.$el.addClass('left');
                position.left-=37-el.width()/2;
                if (position.left<0) position.left = 0;
            } else {
                this.$el.removeClass('left');
                this.$el.addClass('right');
                position.left-=size.width-7-el.width()/2;
            }

            if (position.top-size.height-57 < 0) {
                this.$el.addClass('top');
                position.top+=el.height();
            } else {
                this.$el.removeClass('top');
                position.top-=size.height+57;
                if (position.top<0) position.top = 0;
            }

            this.$el.css('top', position.top);
            this.$el.css('left', position.left);
        },

        hide: function() {
            this.callback = undefined;
            this.$el.hide();
        }
    });


    function rgbToHsl(r, g, b){
        r /= 255, g /= 255, b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if(max == min){
            h = s = 0; // achromatic
        }else{
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100)};
    }
    
    window.MOBILE = navigator.userAgent.match(/mobile/i);
    window.ColorPicker = ColorPickerView;
});
