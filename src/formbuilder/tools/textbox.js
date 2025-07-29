import {inject, bindable, computedFrom,BindingEngine} from 'aurelia-framework';
import {BindingSignaler} from 'aurelia-templating-resources';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';
import { formhelper } from '../formhelper';

@inject(DndService, EventAggregator, formhelper, BindingEngine, BindingSignaler)
export class Textbox {
  @bindable item;
  //editMode = true;
  //showDbElementIcon = false;
  inputId=null;

  inputType='text';

  selected=false;
  minWidth= 40;

  _placeholder="";

  valueChangedSubscription=null;


  constructor(dndService, EventAggregator, formhelper, BindingEngine, BindingSignaler) {
    this.dndService = dndService;
    this.ea = EventAggregator;
    this.formhelper = formhelper;
    this.bindingEngine = BindingEngine;
    this.signaler = BindingSignaler;
  }

  activate(model){
    this.item = model;
  }

  @computedFrom('item', 'item.inputType')
  get isDate(){
    return this.item.inputType == 'date' ? true : false;
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

  @computedFrom('item', 'item.editMode', 'item.name')
  get placeholder(){
    return this.item.editMode ? this.item.name : this._placeholder;
  }

  attached() {
    let self = this;
    const elem = document.getElementById(self.item.id);
    this.dndService.addSource(self, {noPreview: true, element: elem});


    //is this a DbElement???
    if(self.item.dataColumn && self.item.dataColumn.tableName){

      //what kind???
      // if(self.item.dataColumn.displayType){
      //   switch(self.item.dataColumn.displayType){
      //     case 'varchar':
      //       self.inputType = 'text';
      //       break;
      //     case 'bigint':
      //       self.inputType = 'number';
      //       break;
      //     case 'int':
      //       self.inputType = 'number';
      //       break;
      //     case 'datetime':
      //       self.inputType = 'date';
      //       break;
      //   }
      // }
    }
    self.item.disabled = this.item.editMode;

    self.valueChangedSubscription = self.bindingEngine
    .propertyObserver(self.item, 'inputType')
    .subscribe((newValue, oldValue) => { 
      
      //var iType = self.item.inputType;
      //self.signaler.signal('signalInputType');
      //var t = newValue;

    });
  }

  detached() {
    this.dndService.removeSource(this);
    //this.valueChangedSubscription.dispose();
  }

  itemClicked(e){

    //if we have already clicked this item, return...
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
    const height = (this.item && this.item.height) || 0;
    const boxCursor = (this.item && this.item.selected) ? "pointer" : "default";
    const border = (this.item && this.item.selected) ? "1px dashed #007bff" : "none";

    // var right = this.formhelper.getItemRightWithElementId(this.item.elementId);

    var posObj={
      left: x + 'px',
      top: y + 'px',
      width: width,// + 'px',
      height: height + 'px',
      cursor: boxCursor,
      border: border
    }

    return posObj;

  }
}
