(function(window){
  
  // instance per event
  function FPSEvent(manager, element, eventType) {
    this.manager = manager;
    this.element = element;
    this.eventType = eventType;
    this.handlers = [];
    
    this.element.addEventListener(eventType, this.frameEvent.bind(this), false);
  }
  
  // request tick and execute the preventDefault methods
  FPSEvent.prototype.frameEvent = function(ev) {
    if(this.shouldPreventDefault) { ev.preventDefault(); }
    if(this.shouldStopPropagation) { ev.stopPropagation(); }
    if(this.shouldStopImmediatePropagation) { ev.stopImmediatePropagation(); }
    
    this.handlers.forEach(function(handler) {
      if(handler.dataHandler) {
        handler.data = handler.dataHandler(ev);
      }
    });
    
    this.eventData = ev;
    this.manager.requestTick(this);
  };
  
  // trigger handles of this type
  FPSEvent.prototype.triggerHandlers = function() {
    if(this.eventData) {
      var ev = this.prepareEventData();
      this.handlers.forEach(function(handler) {
        handler.eventHandler(ev, handler.data);
      });
      this.eventData = null;
    }
  };
  
  // set new preventDefault methods
  // they will get executed when the next dom event occurs
  // useful for the 'touchmove' event
  FPSEvent.prototype.prepareEventData = function() {
    this.shouldPreventDefault = false;
    this.shouldStopPropagation = false;
    this.shouldStopImmediatePropagation = false;
    
    this.eventData.preventDefault = function(){ this.shouldPreventDefault = true;}.bind(this);
    this.eventData.stopPropagation = function(){ this.shouldStopPropagation = true;}.bind(this);
    this.eventData.stopImmediatePropagation = function(){ this.shouldStopImmediatePropagation = true;}.bind(this);
    
    return this.eventData;
  };
  
  // unbind
  FPSEvent.prototype.destroy = function() {
    this.element.removeEventListener(this.eventType, this.frameEvent)
  };
  
  
  
  // manages the event handlers and ticking
  function Manager() { 
    this.instances = {};
    
    // overwrite this to use or embed it in your own ticker
    this.raf = window.requestAnimationFrame;
    
    this.ticking = false;
    this.uid = 1;
  } 
  
  // bind handlers
  Manager.prototype.on = function(element, type, eventHandler, dataHandler) {
    var uid = element.__pruneeventsid || (element.__pruneeventsid = this.uid++);    
    if(!this.instances[uid]) {
      this.instances[uid] = {}
    }
    if(!this.instances[uid][type]) {
      this.instances[uid][type] = new FPSEvent(this, element, type)
    }
    
    this.instances[uid][type].handlers.push({ 
      eventHandler: eventHandler, 
      dataHandler: dataHandler
    });
  };    
  
  // unbind handlers
  Manager.prototype.off = function(element, type, eventHandler) {
    var uid = element.__pruneeventsid, 
      handlers;    
    
    if(uid && this.instances[uid] && this.instances[uid][type]) {
      handlers = this.instances[uid][type].handlers;
      handlers.forEach(function(handler, index) {
        if(eventHandler === handler.eventHandler) {
          handlers.splice(index, 1)
        }
      });
      
      // no handlers left, remove the FPSEvent instance
      if(!handlers.length) {
        this.instances[uid][type].destroy();
        delete this.instances[uid][type];
      }
    }
  };
  
  // trigger events, can be used to force updates
  Manager.prototype.triggerEvents = function() {
    var uid, type;
    for(uid in this.instances) {
      for(type in this.instances[uid]) {
        this.instances[uid][type].triggerHandlers();
      }
    }
    
    this.ticking = false;
  };      
    
  // requestanimationframe
  Manager.prototype.requestTick = function() {
    if(!this.ticking) {
      this.ticking = true;
      this.raf.call(window, this.triggerEvents.bind(this));
    }
  };
  
  
  // commonjs export
  if(typeof(module) !== 'undefined' && module.exports) {
    module.exports = new Manager();
  }
  else {
    window.PruneEvents = new Manager();
  }
})(window || global);