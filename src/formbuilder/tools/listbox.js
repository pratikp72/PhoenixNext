import {inject, bindable, computedFrom, BindingEngine} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';

@inject(DndService, EventAggregator, BindingEngine)
export class Listbox {
  @bindable item;
  editMode = true;
  selected=false;
  backgroundColor=null;
  placeholder=null;

  selectedItem=null;

  listOptions=[];

  //disabled=true;
  showSelect=true;
  showDbElementIcon=false;

  valueChangedSubscription=null;

  constructor(dndService, EventAggregator, BindingEngine) {
    this.dndService = dndService;
    this.ea = EventAggregator;
    this.bindingEngine = BindingEngine;
  }

  activate(model){
    this.item = model;
  }

  @computedFrom('item', 'item.editMode', 'item.required', 'selectedItem')
  get isRequired(){
    var tRequired = !this.item.editMode && this.item.required ? true : false;
    if(!tRequired){
      this.ea.publish('checkComplete', this.item);
      return false;
    }
    if(tRequired && this.selectedItem){
      this.ea.publish('checkComplete', this.item);
      return false;
    }
    return true;
  }

  attached() {
    //this.disabled = this.item.editMode;
    this.item.disabled = this.item.editMode;
    const elem = document.getElementById(this.item.id);
    this.dndService.addSource(this, {noPreview: true, element: elem});

    this.selectedItem = this.item.value;

    //is this a DbElement???
    if(this.item.dataColumn && this.item.dataColumn.tableName){
      this.showDbElementIcon = this.item.editMode;
      this.showSelect = this.item.editMode ? false : true;
      this.placeholder = this.item.dataColumn.name;
    }else{
      this.placeholder = this.item.editMode ? this.item.name : null;
    }

    let self = this;
    self.valueChangedSubscription = self.bindingEngine
      .propertyObserver(self.item, 'value')
      .subscribe((newValue, oldValue) => { 
        self.tryNormalColorWithValue(newValue);
      });

    //check for normal color...
    if(self.item.value){
      self.tryNormalColorWithValue(self.item.value);
    }
  }

  tryNormalColorWithValue(newValue){
    let self = this;
    var normalFound = _.find(self.item.dataColumn.listOptions, function(o){return o.normal});
    var emptyValue = (newValue == "" || newValue == null) ? true : false;
    if(normalFound && (normalFound.text != newValue) && !emptyValue){
      self.backgroundColor = '#ffc107';
    }else{
      self.backgroundColor = null;
    }
  }

  detached() {
    this.dndService.removeSource(this);
    this.valueChangedSubscription.dispose();
  }

  itemClicked(e){

    if(this.item.showToolbar){
      e.stopPropagation();
      return;
    }

    this.ea.publish("itemClicked", this.item);
    e.stopPropagation();
  }

  listSelected(i){
    this.item.value = i.text;
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
