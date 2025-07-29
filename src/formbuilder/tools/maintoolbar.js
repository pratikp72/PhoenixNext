import {inject, bindable, computedFrom} from 'aurelia-framework';
//import {EventAggregator} from 'aurelia-event-aggregator';

export class Maintoolbar {
  @bindable item;
  showTextToolbar = false;
  showListToolbar=false;
  //noTools=true;
  showExtra=false;

  reset(){
    this.showTextToolbar = false;
    this.showListToolbar=false;
    //this.noTools=true;
    this.showExtra=false;
  }

  setTextToolbarRange(range){
    if(!this.texttoolbar)return;
    this.texttoolbar.au.controller.viewModel.currentRange = range;
  }

  itemChanged(newVal, oldVal){
    this.reset();
    // this.noTools = false;//reset...
    // this.showExtra = false;
    this.displayProperToolbar();
  }

  displayProperToolbar(){

    if(this.item == null){
      return;
    }

    this.showExtra = true;

    if(this.item.toolType === 'SIGNATURE' || this.item.toolType === 'IMAGEBOX'){
      this.showTextToolbar = false;
      this.showListToolbar = false;
      //this.showExtra = true;
      this.extratoolbar.au.controller.viewModel.item = this.item;
      this.extratoolbar.au.controller.viewModel.update();
    }else if(this.item.toolType==='STATICTEXT' ||
      this.item.toolType==='TEXTBOX' ||
      this.item.toolType === 'HR' ||
      this.item.toolType ==='CHECKBOX' ||
      this.item.toolType ==='MYTABLE'){
        this.showTextToolbar = true;
        this.showListToolbar = false;
        this.extratoolbar.au.controller.viewModel.item = this.item;
        this.extratoolbar.au.controller.viewModel.update();
        //this.showExtra = false;
        this.texttoolbar.au.controller.viewModel.item = this.item;
        this.texttoolbar.au.controller.viewModel.targetElementId = this.item.elementId;
        this.texttoolbar.au.controller.viewModel.dndId = this.item.id;
        this.texttoolbar.au.controller.viewModel.attached();
    }else{
      this.showTextToolbar = false;
      this.showListToolbar = true;
      //this.showExtra = false;
      this.extratoolbar.au.controller.viewModel.item = this.item;
      this.extratoolbar.au.controller.viewModel.update();
      this.listboxtoolbar.au.controller.viewModel.item = this.item;
      this.listboxtoolbar.au.controller.viewModel.targetElementId = this.item.elementId;
      this.listboxtoolbar.au.controller.viewModel.dndId = this.item.id;
      this.listboxtoolbar.au.controller.viewModel.attached();
    }
  }

  activate(model){
    this.item = model;
  }
}
