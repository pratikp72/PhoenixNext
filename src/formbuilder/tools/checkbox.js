import {inject, bindable, computedFrom, BindingEngine} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';
import { Editor } from '../editor';


@inject(DndService, EventAggregator, BindingEngine, Editor)
export class Checkbox {
  @bindable item;

  //selected=false;

  constructor(dndService, EventAggregator, BindingEngine, Editor) {
    this.dndService = dndService;
    this.ea = EventAggregator;
    this.bindingEngine = BindingEngine;
    this.editor = Editor;
  }

  activate(model){
    this.item = model;
  }

  @computedFrom('item', 'item.editMode', 'item.required', 'item.value')
  get isRequired(){
    var tRequired = !this.item.editMode && this.item.required ? true : false;
    if(!tRequired){
      this.ea.publish('checkComplete', this.item);
      return false;
    }
    if(tRequired && this.item.value){
      this.ea.publish('checkComplete', this.item);
      return false;
    }
    return true;
  }

  @computedFrom('item', 'item.dataColumn', 'item.dataColumn.tableName', 'item.editMode')
  get showDbElementIcon(){
    if(this.item.dataColumn && this.item.dataColumn.tableName){
      return this.item.editMode;
    }else{
      return false;
    }
  }

  attached() {
    let self = this;
    const elem = document.getElementById(self.item.id);
    self.dndService.addSource(self, {noPreview: true, element: elem});

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

    // if(!this.editor.tableCellOptionsData.show){
    //   e.stopPropagation();
    // }

    //e.stopPropagation();
  }

  checkboxChecked(e){
    let self = this;

    if(self.item.editMode){
      return;//dont toggle checkbox in editMode
    }

    e.stopPropagation();
    return true;
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
    const height = (this.item && this.item.height) || 0;
    const boxCursor = (this.item && this.item.selected) ? "pointer" : "default";
    const border = (this.item && this.item.selected) ? "1px dashed #007bff" : "none";

    return {
      left: x + 'px',
      top: y + 'px',
      width: width,// + 'px',
      height: height + 'px',
      cursor: boxCursor,
      border: border
    };
  }
}
