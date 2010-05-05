/**
 * Singleton
 */
var PureSkin = function() {
   var SELECTOR_ATTR_REGEX = /^(\+)?([^\@\+]+)?\@?([^\+]+)?(\+)?$/;

   /**
    * fills the given skin according to given directives
    * @returns {jQuery} filled skin
    * @private
    */
   var renderSkin = function(directives, $skin) {
      for (var rawSelector in directives) {
         var directive = directives[rawSelector];
         var match = rawSelector.match(SELECTOR_ATTR_REGEX);
         var doPrepend = match[1] === "+";
         var doAppend = match[4] === "+";
         var selector = match[2] || null;
         var attr = match[3] || null;
         var isEvent = (/^on/i).test(attr);
         
         // select element we are going to manipulate
         var $selected = $skin;
         if (selector != ".") {
            $selected = $(selector, $skin)
         }

         // event handling
         if (attr != null && isEvent === true) {
            if (directive instanceof Function) {
               $selected.bind(attr.substring(2), directive);
            } else {
               throw "'" + directive + "' is not a function at selector " + rawSelector;
            }
         // attribute setting
         } else if ($selected.length > 0 && attr != null) {
            var oldValue = $selected.attr(attr);
            var newValue = directive;
            if (directive instanceof Function) {
               newValue = directive();
            }
            if (doAppend === true) {
               $selected.attr(attr, oldValue + " " + newValue);
            } else if (doPrepend === true) {
               $selected.attr(attr, newValue + " " + oldValue);
            } else {
               $selected.attr(attr, newValue);
            }
         // default innerhtml & each handling
         } else {
            if (directive instanceof Function) {
               $selected.each(directive);
            } else {
               $selected.html(directive);
            }
         }
      } // end for selector
      return $skin;
   };

   /*
    * clones the skin, then fills the clone according to directive
    * and inserts the result into the target.
    */
   this.renderTo = function(directives, $skin, $target) {
      if (!$target) throw "[PureSkin.renderTo] missing target";
      
      var $skin = $skin.clone(true).removeAttr("template");
      return renderSkin(directives, $skin).appendTo($target);
   }


   this.render = function(directives, $skin) {
      var $skin = $skin.clone(true).removeAttr("template");
      return renderSkin(directives, $skin);
   };
   
   this.inject = function(directives, $skin) {
      return renderSkin(directives, $skin);
   }
   
   /**
    * experimental, js 1.8 only
    */
   this.autoLoop = function(data, $skin,  $target) {
      data.forEach(function(item) {
         var $skinClone = $skin.clone(true);
         for (var key in item) {
            var value = item[key];
            var $selected = $skinClone.contents().filter("." + key);
            $selected.html(value);
         }
         $target.append($skinClone);
      });
      return $target;
   };
   
   /**
    * CONSTRUCTOR
    */
   
   return this;
}();

// hook into jquery if available
if(typeof jQuery !== 'undefined') {
   jQuery.fn.render = function(directives){
      return PureSkin.render(directives, this);
   };
   jQuery.fn.renderTo = function(directives, $target){
      return PureSkin.renderTo(directives, this, $target);
   };
   jQuery.fn.autoLoop = function(data, $target){
      return PureSkin.autoLoop(data, this, $target);
   };
   jQuery.fn.inject = function(directives) {
      return PureSkin.inject(directives, this);
   }

}
