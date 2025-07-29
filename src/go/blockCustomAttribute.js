import {customAttribute} from 'aurelia-framework';
import {Home} from './home';
import {inject} from 'aurelia-framework';
import Draggabilly from "draggabilly";
import {Globals} from './globals';
import {EventAggregator} from 'aurelia-event-aggregator';


@customAttribute('block-custom')
@inject(Home, Globals, EventAggregator)
export class BlockCustomAttribute {


  scrollContainer;
  id;
  editing = false;

  constructor(Home, Globals, EventAggregator){
    this.home = Home;
    this.globals = Globals;
    this.events = EventAggregator;
  }

  bind(bindingContext, overridingContext) {

    var self = this;

    self.id = bindingContext.data.id;

    var blockEl = bindingContext.blockelement;

    var draggie = new Draggabilly( blockEl );

    // draggie.on( 'dragStart', function( event, pointer ) {
    //   self._startStopScroll(event);
    // });
    //
    draggie.on( 'dragEnd', function( event, pointer ) {
      self._stopScroll();
    });

    draggie.on( 'dragMove', function( event, pointer ) {
      self.doScroll(event);
    });

    self.globals.packery.bindDraggabillyEvents( draggie );

    //enable / disable drag...
    self.editing = bindingContext.data.editing;
    var drag = self.editing ? 'enable': 'disable';
    draggie[drag]();

    self.home.currentBoard.addDraggable(draggie);
  }



  attached(){
    var self = this;

    self.scrollContainer = document.getElementById("scrollcontainer");

    if(self.home.currentBoard.draggies.length == self.home.currentBoard.blocks.length){
      //LOADED!!

      var els = document.getElementsByClassName('block');
      if(els.length != self.home.currentBoard.draggies.length)return;


      //check for positions...
      var pos = self.home.currentBoard.getPositions();
      if(pos.length > 0){
        self.globals.packery.addItems(els);
        self.globals.packery.initShiftLayout(pos, 'data-id');

        //try setting items pinned...
        var pins = document.getElementsByClassName('pinned');
        self.globals.packery.stamp(pins);

        //IF NOT EDITING,update elements heights to px...
        for(var e = 0; e < els.length; e++){
          var eHeight = window.getComputedStyle(els[e]).height;
          els[e].style.height = !self.editing ? eHeight : "";
        }
      }else{
        self.globals.packery.appended(els);
        self.globals.packery.layout();
      }

      //self.events.publish("boardLoaded");
    }
  }






  findPackerItemWithId(id){
    var self = this;
    var items = self.globals.packery.items;
    for(var i = 0; i < items.length; i++){
      var aItem = items[i];
      if(aItem.element.dataset.id == id){
        return aItem;
      }
    }
    return  null;
  }








  //SCROLLING LOGIC...
   _pageYPosition;
   _scrollTimer;

   doScroll(e){


     console.log("PageY: "+ e.pageY + ", WinInnerHeight: " + window.innerHeight + ", WinScrollY: " + window.scrollY);

     if (e) {
       this._pageYPosition = e.pageY;
     }

     if (this._pageYPosition > window.innerHeight + window.scrollY - 50) {
       if (! this._scrollTimer) {
         this._scrollTimer = setTimeout(() => {
           //window.scrollBy(0, 5);

           this.scrollContainer.scrollTop += 5;

           this._pageYPosition += 5;
           this._scrollTimer = null;
           this._startStopScroll();
         }, 25);
       }
     }
     else if (this._pageYPosition < window.scrollY + 50) {
       if (! this._scrollTimer) {
         this._scrollTimer = setTimeout(() => {
           //window.scrollBy(0, -5);

           this.scrollContainer.scrollTop -= 5;

           this._pageYPosition -= 5;
           this._scrollTimer = null;
           this._startStopScroll();
         }, 25);
       }
     }
     else {
       if (this._scrollTimer) {
         clearTimeout(this._scrollTimer);
         this._scrollTimer = null;
       }
     }


   }

   _startStopScroll(e) {
    if (e) {
      this._pageYPosition = e.pageY;
    }

    if (this._pageYPosition > window.innerHeight + window.scrollY - 50) {
      if (! this._scrollTimer) {
        this._scrollTimer = setTimeout(() => {
          //window.scrollBy(0, 5);

          this.scrollContainer.scrollTop += 5;

          this._pageYPosition += 5;
          this._scrollTimer = null;
          this._startStopScroll();
        }, 25);
      }
    }
    else if (this._pageYPosition < window.scrollY + 50) {
      if (! this._scrollTimer) {
        this._scrollTimer = setTimeout(() => {
          //window.scrollBy(0, -5);

          this.scrollContainer.scrollTop -= 5;

          this._pageYPosition -= 5;
          this._scrollTimer = null;
          this._startStopScroll();
        }, 25);
      }
    }
    else {
      if (this._scrollTimer) {
        clearTimeout(this._scrollTimer);
        this._scrollTimer = null;
      }
    }

  }

   _stopScroll() {
    clearTimeout(this._scrollTimer);
    this._scrollTimer = null;
  }











}



