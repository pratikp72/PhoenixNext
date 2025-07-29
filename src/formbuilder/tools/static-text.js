import {inject, bindable, computedFrom, BindingEngine} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';
import { Editor } from '../editor';

@inject(DndService, EventAggregator, BindingEngine, Editor)
export class StaticText {
  @bindable item;
  selected=false;


  constructor(dndService, EventAggregator, BindingEngine, Editor) {
    this.dndService = dndService;
    this.ea = EventAggregator;
    this.bindingEngine = BindingEngine;
    this.editor = Editor;
  }

  activate(model){
    this.item = model;
  }

  attached() {
    let self = this;
    //this.html = this.item.data.text;
    const elem = document.getElementById(self.item.id);
    this.dndService.addSource(self, {noPreview: true, element: elem});
    //this signals that this tool is automatically complete - for enabling SUBMIT button on form...
    this.ea.publish('checkComplete', self.item);

    self.bindingEngine
      .propertyObserver(self.item, 'style')
        .subscribe((newVal, oldVal) => {
          self.editor.updateItem(self.item);
        });

    self.bindingEngine
      .propertyObserver(self.item, 'html')
        .subscribe((newVal, oldVal) => {
          self.editor.updateItem(self.item);
        });
  }



  detached() {
    this.dndService.removeSource(this);
  }

  itemClicked(e){
    if(this.item.showToolbar){
      e.stopPropagation();
      return;
    }

    this.ea.publish("itemClicked", this.item);
    e.stopPropagation();
  }

  dndModel() {
    return {
      type: 'moveItem',
      id: this.item.id
    };
  }

  @computedFrom('item', 'item.x', 'item.y', 'item.width', 'item.height', 'item.selected')
  get positionCss() {
    const x = (this.item && this.item.x) || 0;
    const y = (this.item && this.item.y) || 0;
    var width = (this.item && this.item.width) || 0;
    width = (width == '100%' || width == 'auto') ? width : width + 'px';
    var height = (this.item && this.item.height) || 0;
    height = (height == '100%' || height == 'auto') ? height : height + 'px';
    const boxCursor = (this.item && this.item.selected) ? "pointer" : "default";
    const border = (this.item && this.item.selected) ? "1px dashed #007bff" : "none";

    //check for horizontal alignment to page...
    // if(this.item.hasOwnProperty('centerHorizontalToPage')){

    //   //check if page is loaded...
    //   var foundEl = document.getElementById(this.item.elementId);
    //   if(foundEl){
    //     //get center of page...
    //     var halfWidth = this.item.centerHorizontalToPageWidth / 2;
    //     //offset center by half of text width...
    //     halfWidth = halfWidth - (foundEl.clientWidth / 2);
    //     x = halfWidth;
    //   }
    // }

    return {
      left: x + 'px',
      top: y + 'px',
      width: width,// + 'px',
      height: height,// + 'px',
      cursor: boxCursor,
      border : border
    };
  }
}
