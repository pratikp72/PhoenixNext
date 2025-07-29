import {inject, bindable, computedFrom} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';

@inject(DndService, EventAggregator)
export class Imagebox {
  @bindable item;
  editMode = true;

  selected=false;

  constructor(dndService, EventAggregator) {
    this.dndService = dndService;
    this.ea = EventAggregator;
  }

  activate(model){
    this.item = model;
  }

  attached() {
    const elem = document.getElementById(this.item.id);
    this.dndService.addSource(this, {noPreview: true, element: elem});
    //this signals that this tool is automatically complete - for enabling SUBMIT button on form...
    this.ea.publish('checkComplete', this.item);
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
    const width = (this.item && this.item.width) || 0;
    const height = (this.item && this.item.height) || 0;
    const boxCursor = (this.item && this.item.selected) ? "pointer" : "default";
    const border = (this.item && this.item.selected) ? "1px dashed #007bff" : "none";

    return {
      left: x + 'px',
      top: y + 'px',
      width: width + 16 + 'px',
      height: 'auto',
      // height: height + 16 + 'px',
      cursor: boxCursor,
      border: border
    };
  }
}
