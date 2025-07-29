import {inject, bindable, computedFrom} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';
import { PopupHelper } from '../../go/popupHelper';

@inject(DndService, EventAggregator, PopupHelper)
export class Signature {
  @bindable item;

  selected=false;
  isSigned = false;

  constructor(dndService, EventAggregator, PopupHelper) {
    this.dndService = dndService;
    this.ea = EventAggregator;
    this.popupHelper = PopupHelper;
  }

  activate(model){
    this.item = model;
  }

  @computedFrom('item', 'item.editMode', 'item.required', 'isSigned')
  get isRequired(){
    var tRequired = !this.item.editMode && this.item.required ? true : false;
    if(!tRequired){
      this.ea.publish('checkComplete', this.item);
      return false;
    }
    if(tRequired && this.isSigned){
      this.ea.publish('checkComplete', this.item);
      return false;
    }
    return true;
  }

  attached() {
    const elem = document.getElementById(this.item.id);
    this.dndService.addSource(this, {noPreview: true, element: elem});

    //determine required...
    // this.isRequired = !this.item.editMode && this.item.required ? true : false;
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

  sign(){
    if(this.item.editMode){
      return;//dont show signature pad in edit mode...
    }
    this.openSignature();
  }

  openSignature(){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;



    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let topThird = windowHeight / 3;

    let width = windowWidth / 2;
    let left = third / 2;
    let height='auto';
    let top = topThird / 2;

    let options={
      displayHeader: false,
      //bodyPadding: 0
      scrollHeight: 228
    }
    self.popupHelper.openViewModelPop('./signature', {options:{dontSave: true, elId:"sigpop"}},'',width,height,top,quarter,options,function(res){
      self.loadSignature(res);
      self.isSigned = true;
      //HACK: remove overflow-hidden from body so we can continue to scroll...
      $('body').css('overflow', 'unset');
    });

    setTimeout(function(){
      var sigpop = document.getElementById("sigpop");
      var sigPopRect = sigpop.getBoundingClientRect()
      var sigEl = document.getElementById(self.item.id)
      var sigElRect = sigEl.getBoundingClientRect()//.top
      sigpop.style.top = sigElRect.top - (sigPopRect.height / 2) + "px";
    }, 500);
  }

  loadSignature(data){
    let self = this;
    let ctx = self.sigcanvas.getContext("2d");
    ctx.clearRect(0, 0, self.sigcanvas.width, self.sigcanvas.height);
    let image = new Image();
    image.src = data;
    image.onload=function(){
      ctx.drawImage(this, 0, 0, self.sigcanvas.width, self.sigcanvas.height);
    }
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
      width: width + 'px',
      height: height + 'px',
      cursor: boxCursor,
      border: border
    };
  }
}
