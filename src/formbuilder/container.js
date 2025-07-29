import {inject, computedFrom, observable, bindable} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';
import _ from 'lodash';
import {snapToGrid} from './snap-to-grid';
import {snapToEdge} from './snap-to-edge';

const MIN_HEIGHT = 30;
const MIN_WIDTH = 30;


@inject(DndService, EventAggregator)
export class Container {
  snapMode = 'grid';
  showResizeArea = false;
  // @observable editMode = true;

  width = 600;
  height = 800;

  @bindable items = [];
  @bindable edit;
  @bindable fullwidth=false;

  intention;

  drawMarquee=false;
  marqueeShape=null;
  selections=[];
  wasMarqueeSelecting = false;


  dragOffsets=[];

  showGrid = false;

  constructor(dndService, ea) {
    this.dndService = dndService;
    this.ea = ea;
  }

  attached() {

    let self = this;

    //for marquee...
    this.dndService.addSource(this, {noPreview: true});

    this.dndService.addTarget(this);
    this.subscribers = [
      this.ea.subscribe('dnd:willStart', () => this.resetIntention()),
      this.ea.subscribe('dnd:didEnd', () => this.resetIntention()),
      this.ea.subscribe('dnd:didCancel', () => this.resetIntention())
    ];

    this.ea.subscribe('clearSelections', function(){
      self.selections=[];
    });

    this.ea.subscribe('toggleGrid', function(){
      self.showGrid = self.showGrid ? false : true;
    });
  }

  deselectAll(e){

    if(this.wasMarqueeSelecting){
      this.wasMarqueeSelecting = false;
      return;
    }

    console.log('Deselect All!');

    this.ea.publish('deselectAll');

    for(let i = 0; i < this.items.length; i++){
      this.items[i].selected = false;
      this.items[i].showToolbar = false;
    }
  }

  dndModel() {
    return {type: 'marquee'};
  }

  detached() {
    this.dndService.removeTarget(this);
    this.subscribers.forEach(s => s.dispose());
  }

  dndCanDrop(model) {
    return model.type === 'moveItem' || model.type === 'resizeItem' || model.type === 'marquee';
  }

  resetWasMarqueeSelecting(){
    this.wasMarqueeSelecting = false;
  }

  findMarqueeSelectedItems(marqueeShape){
    //clear out previous selections...
    this.selections=[];
    for(let c = 0; c < this.items.length; c++){
      this.items[c].selected = false;
    }

    for(let i = 0; i < this.items.length; i++){
      let itm = this.items[i];
      if(marqueeShape.x < itm.x &&
        marqueeShape.y < itm.y &&
        (marqueeShape.x + marqueeShape.width) > (itm.x + itm.width) &&
        (marqueeShape.y + marqueeShape.height) > (itm.y + itm.height)){
          //select item...
          itm.selected = true;
          this.selections.push(itm);
        }
    }

    // this.ea.publish('marqueeSelectedItems', this.selections);
  }

  getMarqueeSelection(mouseStartAt, mouseEndAt, targetElementRect){
    const start = {
      x: mouseStartAt.x - targetElementRect.x,
      y: mouseStartAt.y - targetElementRect.y
    };

    const end = {
      x: mouseEndAt.x - targetElementRect.x,
      y: mouseEndAt.y - targetElementRect.y
    };

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(start.x - end.x);
    const height = Math.abs(start.y - end.y);
    this.marqueeShape = {type: 'rect', x, y, width, height};

    this.wasMarqueeSelecting = true;
  }

  dndHover(location) {
    const {mouseStartAt, mouseEndAt, previewElementRect, targetElementRect} = location;
    const {model} = this.dnd;

    //try marquee drawing here...
    if(model.type === 'marquee' && this.drawMarquee){
      this.getMarqueeSelection(mouseStartAt, mouseEndAt, targetElementRect);
      return;
    }

    this._dndHoverRoutine(model, mouseStartAt, mouseEndAt, previewElementRect, targetElementRect);
  }

  _dndHoverRoutine(model, mouseStartAt, mouseEndAt, previewElementRect, targetElementRect){
    const item = _.find(this.items, {id: model.id});
    if (!item || !item.selected) return;

    let _intention=[];
    if (model.type === 'moveItem') {

      const newLoc = {
        x: previewElementRect.x - targetElementRect.x,
        y: previewElementRect.y - targetElementRect.y
      };

      var dragItems = this.getMultiDragItems();//multiple items to drag???
      if(this.dragOffsets.length == 0){
        for(let i = 0; i < dragItems.length; i++){
          this.dragOffsets.push({
            id: dragItems[i].id,
            xOff: dragItems[i].x - newLoc.x,
            yOff: dragItems[i].y - newLoc.y
          });
        }
      }

      var tIntentions=[];

      for(var off = 0; off < this.dragOffsets.length; off++){
        var o = this.dragOffsets[off];
        //add offset...
        var offIindex = _.findIndex(this.items, {id: o.id});
        var offItm = this.items[offIindex];

        var aInt = {
          id: offItm.id,
          x: newLoc.x + o.xOff,
          y: newLoc.y + o.yOff,
          width: offItm.width,
          height: offItm.height
        };
        tIntentions.push(aInt);

      }
      
      _intention = tIntentions;
    } else if (model.type === 'resizeItem') {

      // const delta = {
      //   x: Math.round(mouseEndAt.x - mouseStartAt.x),
      //   y: Math.round(mouseEndAt.y - mouseStartAt.y)
      // };

      // _intention.push( {
      //   id: model.id,
      //   x: item.x,
      //   y: item.y,
      //   width: item.width,
      //   height: item.height
      // });

      // // when resize is from corner, it's a combination of two chars like "ne"
      // _.each(model.resize, char => {
      //   switch (char) {
      //   case 'n': // north
      //     if (delta.y > _intention[0].height - MIN_HEIGHT) delta.y = _intention[0].height - MIN_HEIGHT;
      //     _intention[0].y += delta.y;
      //     _intention[0].height -= delta.y;
      //     break;
      //   case 's': // south
      //     if (delta.y < MIN_HEIGHT - _intention[0].height) delta.y = MIN_HEIGHT - _intention[0].height;
      //     _intention[0].height += delta.y;
      //     break;
      //   case 'w': // west
      //     if (delta.x > _intention[0].width - MIN_WIDTH) delta.x = _intention[0].width - MIN_WIDTH;
      //     _intention[0].x += delta.x;
      //     _intention[0].width -= delta.x;
      //     break;
      //   case 'e': // east
      //     if (delta.x < MIN_WIDTH - _intention[0].width) delta.x = MIN_WIDTH - _intention[0].width;
      //     _intention[0].width += delta.x;
      //     break;
      //   default:
      //   }
      // });
      //var deltas=[];
      var dragItems = this.getMultiDragItems();//multiple items to drag???
      for(let i = 0; i < dragItems.length; i++){
        _intention.push( {
          id: dragItems[i].id,
          x: dragItems[i].x,
          y: dragItems[i].y,
          width: dragItems[i].width,
          height: dragItems[i].height
        });
      }

      const delta = {
        x: Math.round(mouseEndAt.x - mouseStartAt.x),
        y: Math.round(mouseEndAt.y - mouseStartAt.y)
      };


      // when resize is from corner, it's a combination of two chars like "ne"
      for(var i = 0; i < _intention.length; i++){

        _.each(model.resize, char => {
          switch (char) {
          case 'n': // north
            if (delta.y > _intention[i].height - MIN_HEIGHT) delta.y = _intention[i].height - MIN_HEIGHT;
            _intention[i].y += delta.y;
            _intention[i].height -= delta.y;
            break;
          case 's': // south
            if (delta.y < MIN_HEIGHT - _intention[i].height) delta.y = MIN_HEIGHT - _intention[i].height;
            _intention[i].height += delta.y;
            break;
          case 'w': // west
            if (delta.x > _intention[i].width - MIN_WIDTH) delta.x = _intention[i].width - MIN_WIDTH;
            _intention[i].x += delta.x;
            _intention[i].width -= delta.x;
            break;
          case 'e': // east
            if (delta.x < MIN_WIDTH - _intention[i].width) delta.x = MIN_WIDTH - _intention[i].width;
            _intention[i].width += delta.x;
            break;
          default:
          }
        });

      }
      
    }

    if (this.snapMode === 'grid') {
      Object.assign(
        _intention[0],
        snapToGrid(_intention[0], {resize: model.resize})
      );
    } else {
      const others = _.reject(this.items, {id: model.id});
      const container = {x: 0, y: 0, width: this.width, height: this.height};
      Object.assign(
        _intention,
        snapToEdge(_intention[0], {resize: model.resize, container, neighbourPositions: others})
      );
    }

    this.intention = _intention;
    //console.log(`intention:${this.intention}`);
  }

  dndDrop() {

    let self = this;
    const {items, intention} = this;

    //check for selection marquee...
    if(this.marqueeShape){
      this.findMarqueeSelectedItems(this.marqueeShape);
      this.marqueeShape = null;
      this.drawMarquee = false;
      this.ea.publish('selectionFinished', self.selections);
      setTimeout(self.resetWasMarqueeSelecting.bind(self),1000);
      return;
    }

    if (!intention) return;

    for(let i = 0; i < intention.length; i++){
      var intent = intention[i];
      var oIndex =  _.findIndex(items, {id: intent.id});
      const item = items[oIndex];
      items.splice(oIndex, 1);
      // always show current moving item on top
      items.push({
        ...item,
        x: intent.x,
        y: intent.y,
        width: intent.width,
        height: intent.height
      });
    }
  }


  getMultiDragItems(){
    let self = this;
    return _.filter(self.items, function(i){return i.selected});
  }

  resetIntention() {
    this.intention = null;
    //console.log(`intention:${this.intention}`);
    this.dragOffsets=[];
  }


  @computedFrom('items', 'intention')
  get patchedItems() {
    const {items, intention} = this;
    if (!intention) return items;

    let patched=[];
    let itemArray = [];

    //check if we have a single item or multiple items...
    if(Array.isArray(intention)){
      let idList = _.map(intention, x=>x.id);
      patched = _.reject(items, function(i){return idList.includes(i.id)});
      itemArray = _.filter(this.items, function(i){return idList.includes(i.id)});
    }else{
      patched = _.reject(items, {id: intention.id});
      itemArray= _.filter(this.items, {id: intention.id});
    }

    for(let i = 0; i < itemArray.length; i++) {
      //console.log("Patched: "+ item.id + " X: "+ intention.x + " Y: " + intention.y);
      let aItm = itemArray[i];
      let intent = Array.isArray(intention) ? _.find(intention, {id: aItm.id}) : intention;
      // always show current moving item on top
      patched.push({
        ...aItm,
        x: intent.x,
        y: intent.y,
        width: intent.width,
        height: intent.height
      });
    }

    return patched;
  }
}
